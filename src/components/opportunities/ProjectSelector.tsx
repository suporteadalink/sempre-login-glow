import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectForm } from "@/components/projects/ProjectForm";

interface Project {
  id: number;
  title: string;
  project_code: string | null;
  status: string | null;
}

interface ProjectSelectorProps {
  opportunityId: number;
  companyId: number;
  currentProjectId?: number | null;
  trigger?: React.ReactNode;
}

export function ProjectSelector({ opportunityId, companyId, currentProjectId, trigger }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId?.toString() || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects for the company
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", companyId],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, project_code, status")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Update opportunity with selected project
  const updateOpportunityMutation = useMutation({
    mutationFn: async (projectId: number | null) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ project_id: projectId })
        .eq("id", opportunityId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({
        title: "Projeto vinculado",
        description: "O projeto foi vinculado à oportunidade com sucesso.",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível vincular o projeto à oportunidade.",
        variant: "destructive",
      });
      console.error("Error updating opportunity:", error);
    }
  });

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    updateOpportunityMutation.mutate(projectId === "none" ? null : parseInt(projectId));
  };

  const handleProjectCreated = () => {
    setShowProjectForm(false);
    queryClient.invalidateQueries({ queryKey: ["projects", companyId] });
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Briefcase className="h-4 w-4" />
      {currentProjectId ? "Alterar Projeto" : "Selecionar Projeto"}
    </Button>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedProjectId}
              onValueChange={handleProjectSelect}
              disabled={updateOpportunityMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum projeto</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.project_code ? `${project.project_code} - ` : ""}{project.title}
                      {project.status && ` (${project.status})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowProjectForm(true)}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Novo Projeto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectForm
        isOpen={showProjectForm}
        onClose={() => setShowProjectForm(false)}
        onSuccess={handleProjectCreated}
        project={null}
      />
    </>
  );
}