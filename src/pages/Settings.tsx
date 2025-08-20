import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Pencil, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
}

interface Goal {
  id: number;
  name: string;
  target_value: number;
  start_date: string;
  end_date: string;
  user_id: string;
  users?: {
    name: string;
  };
}

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ role: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    user_id: '',
    target_value: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
  });
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
    fetchUsers();
    fetchGoals();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setUsers(users || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendedores",
        variant: "destructive"
      });
    }
  };

  const fetchGoals = async () => {
    try {
      const { data: goals, error } = await supabase
        .from('goals')
        .select(`
          *,
          users (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(goals || []);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      toast({
        title: "Erro", 
        description: "Erro ao carregar metas",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.user_id || !formData.target_value || !formData.start_date || !formData.end_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const goalData = {
        name: formData.name,
        user_id: formData.user_id,
        target_value: parseFloat(formData.target_value),
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Meta atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([goalData]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Meta criada com sucesso"
        });
      }

      setFormData({
        name: '',
        user_id: '',
        target_value: '',
        start_date: null,
        end_date: null,
      });
      setEditingGoal(null);
      fetchGoals();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar meta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      user_id: goal.user_id,
      target_value: goal.target_value.toString(),
      start_date: new Date(goal.start_date),
      end_date: new Date(goal.end_date),
    });
  };

  const handleDelete = async (goalId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Meta excluída com sucesso"
      });
      fetchGoals();
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir meta",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      user_id: '',
      target_value: '',
      start_date: null,
      end_date: null,
    });
    setEditingGoal(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do sistema
        </p>
      </div>

      {userProfile && userProfile.role === 'admin' && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-crm-blue flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Gerenciamento de Metas
            </CardTitle>
            <CardDescription>
              Defina e acompanhe as metas dos vendedores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Formulário para Nova Meta */}
            <div className="border rounded-lg p-4 bg-crm-gray-light/20">
              <h3 className="text-lg font-semibold mb-4 text-crm-navy">
                {editingGoal ? 'Editar Meta' : 'Definir Nova Meta'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Meta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Meta Mensal Q1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_id">Vendedor</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_value">Valor da Meta (R$)</Label>
                  <Input
                    id="target_value"
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData({ ...formData, start_date: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data de Término</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? (
                          format(formData.end_date, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => setFormData({ ...formData, end_date: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="md:col-span-2 lg:col-span-5 flex gap-2 pt-4">
                  <Button type="submit" disabled={loading} className="bg-gradient-primary">
                    {loading ? 'Salvando...' : editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
                  </Button>
                  {editingGoal && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Tabela de Metas Atuais */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-crm-navy">Metas Atuais</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Meta</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Valor da Meta</TableHead>
                      <TableHead>Data de Início</TableHead>
                      <TableHead>Data de Término</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma meta cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      goals.map((goal) => (
                        <TableRow key={goal.id}>
                          <TableCell className="font-medium">{goal.name}</TableCell>
                          <TableCell>{goal.users?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(goal.target_value)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(goal.start_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(goal.end_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(goal)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(goal.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}