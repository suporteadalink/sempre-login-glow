import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { ProjectForm } from "@/components/projects/ProjectForm";

interface Project {
  id: number;
  project_code: string;
  title: string;
  budget: number;
  status: string;
  description: string;
  start_date: string;
  end_date: string;
  progress: number;
  manager_id: string;
  company_id: number;
  created_at: string;
  company_name?: string;
  manager_name?: string;
}

const Projects = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          companies!projects_company_id_fkey(name),
          users!projects_manager_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Erro ao carregar projetos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const projectsWithJoins = data?.map(project => ({
          ...project,
          company_name: project.companies?.name || "-",
          manager_name: project.users?.name || "-"
        })) || [];
        setProjects(projectsWithJoins);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar os projetos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "proposta":
        return "default"; // Blue
      case "em andamento":
      case "ativo":
        return "secondary"; // Yellow/Orange
      case "concluído":
      case "finalizado":
        return "outline"; // Green - will be customized
      case "pausado":
        return "outline";
      case "cancelado":
        return "destructive"; // Red
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "proposta":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "em andamento":
      case "ativo":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "concluído":
      case "finalizado":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "pausado":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "cancelado":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (project: Project) => {
    // TODO: Implement delete functionality with confirmation
    toast({
      title: "Excluir Projeto",
      description: `Funcionalidade de exclusão para ${project.title} será implementada em breve.`,
    });
  };

  const handleNewProject = () => {
    setSelectedProject(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedProject(null);
  };

  const handleFormSuccess = () => {
    fetchProjects();
  };

  const formatCurrency = (value: number) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
          Lista de Projetos
        </h2>
        <p className="text-muted-foreground">
          Gerencie todos os seus projetos em um só lugar
        </p>
      </div>

      <Card className="shadow-medium">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-xl font-semibold text-foreground">
            Projetos
          </CardTitle>
          <Button
            onClick={handleNewProject}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Novo Projeto
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando projetos...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                Nenhum projeto encontrado
              </p>
              <p className="text-muted-foreground text-sm">
                Comece criando seu primeiro projeto
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">
                      Código
                    </TableHead>
                    <TableHead className="font-semibold">
                      Projeto
                    </TableHead>
                    <TableHead className="font-semibold">
                      Cliente
                    </TableHead>
                    <TableHead className="font-semibold">
                      Gerente
                    </TableHead>
                    <TableHead className="font-semibold">
                      Orçamento
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
                  {projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {project.project_code || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.title}</p>
                          {project.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.company_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.manager_name}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(project.budget)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-medium ${getStatusColor(project.status)}`}
                        >
                          {project.status || "Não definido"}
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
                              onClick={() => handleEdit(project)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(project)}
                              className="cursor-pointer text-destructive focus:text-destructive"
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

      <ProjectForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        project={selectedProject}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default Projects;