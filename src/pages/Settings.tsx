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
import { CalendarIcon, Pencil, Trash2, Plus, Users, Settings as SettingsIcon, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  phone?: string;
  status: string;
  role: string;
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

interface PipelineStage {
  id: number;
  name: string;
  color: string;
  order: number;
  counts_in_conversion: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ role: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Profile form data
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    phone: ''
  });
  
  // Goals form data
  const [formData, setFormData] = useState({
    name: '',
    user_id: '',
    target_value: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
  });
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  // Users form data
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'vendedor'
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Pipeline stages form data
  const [stageFormData, setStageFormData] = useState({
    name: '',
    color: '#3B82F6',
    order: 0,
    counts_in_conversion: true
  });
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
    fetchCurrentUserData();
    fetchUsers();
    fetchGoals();
    fetchPipelineStages();
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

  const fetchCurrentUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('id, name, phone, role')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        const userData: UserProfile = {
          id: user.id,
          name: profile?.name || '',
          email: user.email || '',
          phone: profile?.phone || '',
          role: profile?.role || 'vendedor'
        };
        
        setCurrentUser(userData);
        setProfileFormData({
          name: userData.name,
          phone: userData.phone || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário atual:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, phone, status, role')
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

  const fetchPipelineStages = async () => {
    try {
      const { data: stages, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order');

      if (error) throw error;
      setPipelineStages(stages || []);
    } catch (error) {
      console.error('Erro ao buscar etapas do pipeline:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar etapas do pipeline",
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

  // User management functions
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userFormData.name || !userFormData.email || (!editingUser && !userFormData.password)) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        // Update existing user in users table only
        const { error } = await supabase
          .from('users')
          .update({
            name: userFormData.name,
            phone: userFormData.phone,
            role: userFormData.role
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso"
        });
      } else {
        // Create new user using edge function
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: userFormData.email,
            password: userFormData.password,
            name: userFormData.name,
            role: userFormData.role,
            phone: userFormData.phone
          }
        });

        if (error) {
          throw error;
        }

        console.log(data);
        
        toast({
          title: "Sucesso!",
          description: "O novo usuário foi criado."
        });
      }

      setUserFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'vendedor'
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      
      let errorMessage = "Erro ao salvar usuário";
      
      if (error?.message?.includes('email address has already been registered')) {
        errorMessage = "Este email já está sendo usado por outro usuário";
      } else if (error?.message?.includes('For security purposes')) {
        errorMessage = "Aguarde alguns segundos antes de tentar novamente";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: '', // Email não pode ser editado
      password: '',
      phone: user.phone || '',
      role: user.role
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso"
      });
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'vendedor'
    });
    setEditingUser(null);
  };

  // Pipeline stage management functions
  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stageFormData.name) {
      toast({
        title: "Erro",
        description: "Preencha o nome da etapa",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const stageData = {
        name: stageFormData.name,
        color: stageFormData.color,
        order: stageFormData.order || pipelineStages.length + 1,
        counts_in_conversion: stageFormData.counts_in_conversion
      };

      if (editingStage) {
        const { error } = await supabase
          .from('pipeline_stages')
          .update(stageData)
          .eq('id', editingStage.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Etapa atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('pipeline_stages')
          .insert([stageData]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Etapa criada com sucesso"
        });
      }

      setStageFormData({
        name: '',
        color: '#3B82F6',
        order: 0,
        counts_in_conversion: true
      });
      setEditingStage(null);
      fetchPipelineStages();
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar etapa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditStage = (stage: PipelineStage) => {
    setEditingStage(stage);
    setStageFormData({
      name: stage.name,
      color: stage.color,
      order: stage.order,
      counts_in_conversion: stage.counts_in_conversion
    });
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta etapa?')) return;

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Etapa excluída com sucesso"
      });
      fetchPipelineStages();
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir etapa",
        variant: "destructive"
      });
    }
  };

  const resetStageForm = () => {
    setStageFormData({
      name: '',
      color: '#3B82F6',
      order: 0,
      counts_in_conversion: true
    });
    setEditingStage(null);
  };

  // Profile management functions
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileFormData.name) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            name: profileFormData.name,
            phone: profileFormData.phone
          })
          .eq('id', user.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso"
        });
        
        // Refresh current user data
        fetchCurrentUserData();
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

      {/* Seção Meu Perfil - Para usuários não-admin */}
      {userProfile && userProfile.role !== 'admin' && currentUser && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-crm-blue flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu Perfil
            </CardTitle>
            <CardDescription>
              Visualize e edite suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile_email">Email</Label>
                  <Input
                    id="profile_email"
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile_name">Nome</Label>
                  <Input
                    id="profile_name"
                    value={profileFormData.name}
                    onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="profile_phone">Telefone</Label>
                  <Input
                    id="profile_phone"
                    value={profileFormData.phone}
                    onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <Button type="submit" disabled={loading} className="bg-gradient-primary">
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Gerenciamento de Metas - Apenas para admin */}
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

      {/* Gerenciamento de Usuários */}
      {userProfile && userProfile.role === 'admin' && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-crm-blue flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciamento de Usuários
            </CardTitle>
            <CardDescription>
              Gerencie os usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Formulário para Novo/Editar Usuário */}
            <div className="border rounded-lg p-4 bg-crm-gray-light/20">
              <h3 className="text-lg font-semibold mb-4 text-crm-navy">
                {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </h3>
              <form onSubmit={handleUserSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_name">Nome</Label>
                  <Input
                    id="user_name"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_email">Email</Label>
                  <Input
                    id="user_email"
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required={!editingUser}
                    disabled={!!editingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_password">Senha</Label>
                  <Input
                    id="user_password"
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="••••••••"
                    required={!editingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_phone">Telefone</Label>
                  <Input
                    id="user_phone"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_role">Perfil</Label>
                  <Select
                    value={userFormData.role}
                    onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 lg:col-span-4 flex gap-2 pt-4">
                  <Button type="submit" disabled={loading} className="bg-gradient-primary">
                    {loading ? 'Salvando...' : editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
                  </Button>
                  {editingUser && (
                    <Button type="button" variant="outline" onClick={resetUserForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Tabela de Usuários */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-crm-navy">Usuários Cadastrados</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum usuário cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.status === 'Ativo' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user.id)}
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

      {/* Gerenciamento do Pipeline */}
      {userProfile && userProfile.role === 'admin' && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-crm-blue flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Gerenciamento do Pipeline
            </CardTitle>
            <CardDescription>
              Configure as etapas do pipeline de vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Formulário para Nova/Editar Etapa */}
            <div className="border rounded-lg p-4 bg-crm-gray-light/20">
              <h3 className="text-lg font-semibold mb-4 text-crm-navy">
                {editingStage ? 'Editar Etapa' : 'Adicionar Nova Etapa'}
              </h3>
              <form onSubmit={handleStageSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage_name">Nome da Etapa</Label>
                  <Input
                    id="stage_name"
                    value={stageFormData.name}
                    onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                    placeholder="Ex: Qualificação"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage_color">Cor</Label>
                  <Input
                    id="stage_color"
                    type="color"
                    value={stageFormData.color}
                    onChange={(e) => setStageFormData({ ...stageFormData, color: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage_order">Ordem</Label>
                  <Input
                    id="stage_order"
                    type="number"
                    value={stageFormData.order}
                    onChange={(e) => setStageFormData({ ...stageFormData, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="counts_in_conversion"
                      checked={stageFormData.counts_in_conversion}
                      onChange={(e) => setStageFormData({ ...stageFormData, counts_in_conversion: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="counts_in_conversion" className="text-sm">
                      Conta para conversão
                    </Label>
                  </div>
                </div>

                <div className="md:col-span-4 flex gap-2 pt-4">
                  <Button type="submit" disabled={loading} className="bg-gradient-primary">
                    {loading ? 'Salvando...' : editingStage ? 'Atualizar Etapa' : 'Criar Etapa'}
                  </Button>
                  {editingStage && (
                    <Button type="button" variant="outline" onClick={resetStageForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Tabela de Etapas */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-crm-navy">Etapas do Pipeline</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Conta para Conversão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipelineStages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma etapa cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      pipelineStages.map((stage) => (
                        <TableRow key={stage.id}>
                          <TableCell className="font-medium">{stage.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="text-sm text-muted-foreground">{stage.color}</span>
                            </div>
                          </TableCell>
                          <TableCell>{stage.order}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              stage.counts_in_conversion 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {stage.counts_in_conversion ? 'Sim' : 'Não'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStage(stage)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteStage(stage.id)}
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