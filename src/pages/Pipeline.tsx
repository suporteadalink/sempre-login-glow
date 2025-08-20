import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { useToast } from "@/hooks/use-toast";

interface PipelineStage {
  id: number;
  name: string;
  color: string;
  order: number;
}

interface Opportunity {
  id: number;
  title: string;
  value: number;
  stage_id: number;
  company_id: number;
  companies: {
    name: string;
  };
}

export default function Pipeline() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order");
      
      if (error) throw error;
      return data as PipelineStage[];
    }
  });

  const { data: opportunities = [], isLoading: opportunitiesLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          companies (name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Opportunity[];
    }
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({
        title: "Sucesso",
        description: "Oportunidade excluída com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir oportunidade",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta oportunidade?")) {
      deleteOpportunityMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingOpportunity(null);
  };

  if (stagesLoading || opportunitiesLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas oportunidades de negócio
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunity ? "Editar Oportunidade" : "Nova Oportunidade"}
              </DialogTitle>
            </DialogHeader>
            <OpportunityForm
              opportunity={editingOpportunity}
              onSuccess={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto">
        {stages.map((stage) => {
          const stageOpportunities = opportunities.filter(
            (opp) => opp.stage_id === stage.id
          );
          
          return (
            <div key={stage.id} className="min-w-[300px]">
              <div className="mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color || "#6b7280" }}
                  />
                  {stage.name}
                  <span className="text-sm text-muted-foreground">
                    ({stageOpportunities.length})
                  </span>
                </h3>
              </div>
              
              <div className="space-y-3 min-h-[200px]">
                {stageOpportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {opportunity.title}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(opportunity)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(opportunity.id)}
                              className="text-destructive"
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {opportunity.companies?.name}
                        </p>
                        <p className="text-lg font-semibold text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(opportunity.value)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}