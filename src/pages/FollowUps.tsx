import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, MoreHorizontal, Edit, CheckCircle, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FollowUpForm } from "@/components/followups/FollowUpForm";
import { useQuery } from "@tanstack/react-query";

interface FollowUp {
  id: number;
  name: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  description: string | null;
  created_at: string;
  responsible_id: string | null;
  company_name?: string;
}

interface Company {
  id: number;
  name: string;
  type: string;
}

const FollowUps = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [followUpToDelete, setFollowUpToDelete] = useState<FollowUp | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch companies for filter
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, type")
        .order("name");
      
      if (error) throw error;
      return data as Company[];
    },
    enabled: !!user
  });

  useEffect(() => {
    if (user) {
      fetchFollowUps();
    }
  }, [user, selectedCompanyId]);

  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from("follow_ups")
        .select(`
          *,
          companies!follow_ups_company_id_fkey(name),
          contacts!follow_ups_contact_id_fkey(company_id, companies!contacts_company_id_fkey(name)),
          projects!follow_ups_project_id_fkey(company_id, companies!projects_company_id_fkey(name)),
          opportunities!follow_ups_opportunity_id_fkey(company_id, companies!opportunities_company_id_fkey(name))
        `)
        .order("created_at", { ascending: false });

      // Apply company filter if selected - simplified to only filter by direct company_id
      if (selectedCompanyId !== "all") {
        const companyId = parseInt(selectedCompanyId);
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Erro ao carregar follow ups",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Transform data to include company name
        const transformedFollowUps = (data || []).map(followUp => {
          let companyName = "";
          
          // Direct company association
          if (followUp.companies?.name) {
            companyName = followUp.companies.name;
          }
          // Through contact
          else if (followUp.contacts?.companies?.name) {
            companyName = followUp.contacts.companies.name;
          }
          // Through project
          else if (followUp.projects?.companies?.name) {
            companyName = followUp.projects.companies.name;
          }
          // Through opportunity
          else if (followUp.opportunities?.companies?.name) {
            companyName = followUp.opportunities.companies.name;
          }

          return {
            ...followUp,
            company_name: companyName
          };
        });

        setFollowUps(transformedFollowUps);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar os follow ups.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityVariant = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "alta":
      case "urgente":
        return "destructive"; // Red
      case "média":
      case "normal":
        return "secondary"; // Yellow/Orange  
      case "baixa":
        return "outline"; // Default/Gray
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "alta":
      case "urgente":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "média":
      case "normal":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "baixa":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "em andamento":
      case "em_andamento":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "concluída":
      case "concluido":
      case "finalizada":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "cancelada":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const handleEdit = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setIsFormOpen(true);
  };

  const handleComplete = async (followUp: FollowUp) => {
    try {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "Concluída" })
        .eq("id", followUp.id);

      if (error) {
        toast({
          title: "Erro ao concluir follow up",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Follow up concluído",
          description: `${followUp.name} foi marcado como concluído.`,
        });
        fetchFollowUps(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao concluir o follow up.",
        variant: "destructive",
      });
    }
  };

  const handleNewFollowUp = () => {
    setSelectedFollowUp(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedFollowUp(null);
  };

  const handleFormSuccess = () => {
    fetchFollowUps();
  };

  const handleDelete = async (followUp: FollowUp) => {
    try {
      const { error } = await supabase
        .from("follow_ups")
        .delete()
        .eq("id", followUp.id);

      if (error) {
        toast({
          title: "Erro ao excluir follow up",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Follow up excluído",
          description: `${followUp.name} foi excluído com sucesso.`,
        });
        fetchFollowUps(); // Refresh the list
        setFollowUpToDelete(null);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o follow up.",
        variant: "destructive",
      });
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Lista de Follow Ups
        </h2>
        <p className="text-muted-foreground">
          Gerencie todos os seus follow ups em um só lugar
        </p>
      </div>

      <Card className="shadow-medium">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-xl font-semibold text-foreground">
            Follow Ups
          </CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} ({company.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleNewFollowUp}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Follow Up
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando follow ups...</span>
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                {selectedCompanyId !== "all" ? "Empresa sem follow ups vinculados" : "Nenhum follow up encontrado"}
              </p>
              <p className="text-muted-foreground text-sm">
                {selectedCompanyId !== "all" ? "Esta empresa não possui follow ups associados" : "Comece criando seu primeiro follow up"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">
                      Nome
                    </TableHead>
                    <TableHead className="font-semibold">
                      Cliente
                    </TableHead>
                    <TableHead className="font-semibold">
                      Data de Vencimento
                    </TableHead>
                    <TableHead className="font-semibold">
                      Prioridade
                    </TableHead>
                    <TableHead className="font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold w-12">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUps.map((followUp) => (
                    <TableRow
                      key={followUp.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{followUp.name}</p>
                          {followUp.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {followUp.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {followUp.company_name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDueDate(followUp.due_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-medium ${getPriorityColor(followUp.priority)}`}
                        >
                          {followUp.priority || "Não definida"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-medium ${getStatusColor(followUp.status)}`}
                        >
                          {followUp.status || "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(followUp)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {followUp.status?.toLowerCase() !== "concluída" && followUp.status?.toLowerCase() !== "concluido" && (
                              <DropdownMenuItem
                                onClick={() => handleComplete(followUp)}
                                className="cursor-pointer text-green-600 focus:text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Concluir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setFollowUpToDelete(followUp)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FollowUpForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        followUp={selectedFollowUp}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!followUpToDelete} onOpenChange={() => setFollowUpToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o follow up "{followUpToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => followUpToDelete && handleDelete(followUpToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FollowUps;