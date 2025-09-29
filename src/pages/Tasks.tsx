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
import { TaskForm } from "@/components/tasks/TaskForm";
import { useQuery } from "@tanstack/react-query";

interface Task {
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

const Tasks = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
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
      fetchTasks();
    }
  }, [user, selectedCompanyId]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from("tasks")
        .select(`
          *,
          companies!tasks_company_id_fkey(name),
          contacts!tasks_contact_id_fkey(company_id, companies!contacts_company_id_fkey(name)),
          projects!tasks_project_id_fkey(company_id, companies!projects_company_id_fkey(name)),
          opportunities!tasks_opportunity_id_fkey(company_id, companies!opportunities_company_id_fkey(name))
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
          title: "Erro ao carregar tarefas",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Transform data to include company name
        const transformedTasks = (data || []).map(task => {
          let companyName = "";
          
          // Direct company association
          if (task.companies?.name) {
            companyName = task.companies.name;
          }
          // Through contact
          else if (task.contacts?.companies?.name) {
            companyName = task.contacts.companies.name;
          }
          // Through project
          else if (task.projects?.companies?.name) {
            companyName = task.projects.companies.name;
          }
          // Through opportunity
          else if (task.opportunities?.companies?.name) {
            companyName = task.opportunities.companies.name;
          }

          return {
            ...task,
            company_name: companyName
          };
        });

        setTasks(transformedTasks);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar as tarefas.",
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

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleComplete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "Concluída" })
        .eq("id", task.id);

      if (error) {
        toast({
          title: "Erro ao concluir tarefa",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tarefa concluída",
          description: `${task.name} foi marcada como concluída.`,
        });
        fetchTasks(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao concluir a tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedTask(null);
  };

  const handleFormSuccess = () => {
    fetchTasks();
  };

  const handleDelete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) {
        toast({
          title: "Erro ao excluir tarefa",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tarefa excluída",
          description: `${task.name} foi excluída com sucesso.`,
        });
        fetchTasks(); // Refresh the list
        setTaskToDelete(null);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a tarefa.",
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
          Lista de Tarefas
        </h2>
        <p className="text-muted-foreground">
          Gerencie todas as suas tarefas em um só lugar
        </p>
      </div>

      <Card className="shadow-medium">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-xl font-semibold text-foreground">
            Tarefas
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
              onClick={handleNewTask}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nova Tarefa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando tarefas...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                {selectedCompanyId !== "all" ? "Empresa sem tarefas vinculadas" : "Nenhuma tarefa encontrada"}
              </p>
              <p className="text-muted-foreground text-sm">
                {selectedCompanyId !== "all" ? "Esta empresa não possui tarefas associadas" : "Comece criando sua primeira tarefa"}
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
                  {tasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.name}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.company_name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDueDate(task.due_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-medium ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority || "Não definida"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-medium ${getStatusColor(task.status)}`}
                        >
                          {task.status || "Pendente"}
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
                              onClick={() => handleEdit(task)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {task.status?.toLowerCase() !== "concluída" && task.status?.toLowerCase() !== "concluido" && (
                              <DropdownMenuItem
                                onClick={() => handleComplete(task)}
                                className="cursor-pointer text-green-600 focus:text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Concluir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setTaskToDelete(task)}
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

      <TaskForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        task={selectedTask}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa "{taskToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => taskToDelete && handleDelete(taskToDelete)}
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

export default Tasks;