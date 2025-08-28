import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Building2, AlertTriangle } from "lucide-react";
import { ProjectSelector } from "@/components/opportunities/ProjectSelector";
import { supabase } from "@/integrations/supabase/client";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { LeadCompanyForm } from "@/components/opportunities/LeadCompanyForm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

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
  owner_id: string;
  project_id?: number | null;
  companies: {
    name: string;
  };
  users: {
    name: string;
  } | null;
}

interface SortableOpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
  currentUserId?: string;
  aceitosStageId: number;
}

function SortableOpportunityCard({ opportunity, onEdit, onDelete, isAdmin, currentUserId, aceitosStageId }: SortableOpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OpportunityCard 
        opportunity={opportunity} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        isAdmin={isAdmin} 
        currentUserId={currentUserId}
        aceitosStageId={aceitosStageId}
      />
    </div>
  );
}

interface DroppableStageProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
  currentUserId?: string;
  aceitosStageId: number;
}

function DroppableStage({ stage, opportunities, onEdit, onDelete, isAdmin, currentUserId, aceitosStageId }: DroppableStageProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
  });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color || "#6b7280" }}
          />
          <h3 className="font-bold text-base">
            {stage.name}
          </h3>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {opportunities.length}
          </span>
        </div>
      </div>
      
      <div 
        ref={setNodeRef}
        className={`space-y-3 min-h-[400px] rounded-lg p-3 transition-colors ${
          isOver 
            ? 'bg-primary/10 border-2 border-primary border-dashed' 
            : 'bg-muted/30'
        }`}
      >
        <SortableContext 
          items={opportunities.map(opp => opp.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opportunity) => (
            <SortableOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onEdit={onEdit}
              onDelete={onDelete}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              aceitosStageId={aceitosStageId}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
  currentUserId?: string;
  aceitosStageId: number;
}

function OpportunityCard({ opportunity, onEdit, onDelete, isAdmin, currentUserId, aceitosStageId }: OpportunityCardProps) {
  const canDelete = isAdmin || opportunity.owner_id === currentUserId;
  const isInAceitos = opportunity.stage_id === aceitosStageId;
  const needsProject = isInAceitos && !opportunity.project_id;
  
  return (
    <Card className={`rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing bg-background border ${
      needsProject ? 'border-orange-400 border-2' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h4 className="font-bold text-sm leading-tight line-clamp-2 flex-1 mr-2">
            {opportunity.title}
          </h4>
          <div className="flex items-center gap-2">
            {needsProject && (
              <div title="Projeto obrigatório">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-70 hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem onClick={() => onEdit(opportunity)}>
                  Editar
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(opportunity.id)}
                    className="text-destructive"
                  >
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="text-sm truncate">{opportunity.companies?.name}</span>
        </div>
        
        {/* Project section for "Aceitos" stage */}
        {isInAceitos && (
          <div className="space-y-2">
            {needsProject && (
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                ⚠️ Projeto obrigatório para esta etapa
              </div>
            )}
            <ProjectSelector
              opportunityId={opportunity.id}
              companyId={opportunity.company_id}
              currentProjectId={opportunity.project_id}
              trigger={
                <Button 
                  variant={needsProject ? "default" : "outline"} 
                  size="sm" 
                  className="w-full gap-2 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {opportunity.project_id ? "Alterar Projeto" : "Selecionar Projeto"}
                </Button>
              }
            />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(opportunity.value)}
          </div>
          {opportunity.users && (
            <div className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              {opportunity.users.name}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Pipeline() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get "Aceitos" stage ID
  const aceitosStageId = 26; // Based on the query result we got earlier

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
          companies (name),
          users:owner_id (name),
          projects:project_id (title)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Opportunity[];
    }
  });

  // Get user role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data?.role;
    },
    enabled: !!user?.id
  });

  const isAdmin = userRole === 'admin';

  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ id, stage_id }: { id: number; stage_id: number }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ stage_id })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao mover oportunidade",
        variant: "destructive",
      });
    }
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: async (id: number) => {
      // First get the opportunity to find the associated company
      const { data: opportunity, error: opportunityError } = await supabase
        .from('opportunities')
        .select('company_id')
        .eq('id', id)
        .single();
      
      if (opportunityError) throw opportunityError;
      
      // Delete the entire company (which will cascade delete the opportunity and all related data)
      const { data, error } = await supabase.rpc('delete_company_with_relations', {
        company_id_param: opportunity.company_id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: "Sucesso",
        description: "Oportunidade excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir oportunidade",
        variant: "destructive",
      });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeOpportunity = opportunities.find(opp => opp.id === active.id);
      
      if (activeOpportunity && over.id && typeof over.id === 'string' && over.id.startsWith('stage-')) {
        const newStageId = parseInt(over.id.replace('stage-', ''));
        
        if (activeOpportunity.stage_id !== newStageId) {
          updateOpportunityMutation.mutate({
            id: activeOpportunity.id,
            stage_id: newStageId
          });
        }
      }
    }
    
    setActiveId(null);
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const opportunity = opportunities.find(opp => opp.id === id);
    const canDelete = isAdmin || (opportunity && opportunity.owner_id === user?.id);
    
    if (!canDelete) {
      toast({
        title: "Acesso negado",
        description: "Você só pode excluir suas próprias oportunidades.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm("Tem certeza que deseja excluir esta oportunidade e a empresa associada? Esta ação irá remover todos os dados relacionados (contatos, projetos, propostas, etc.) e não pode ser desfeita.")) {
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

  const activeOpportunity = activeId ? opportunities.find(opp => opp.id === activeId) : null;

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
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunity ? "Editar Oportunidade" : "Novo Lead"}
              </DialogTitle>
            </DialogHeader>
            {editingOpportunity ? (
              <OpportunityForm
                opportunity={editingOpportunity}
                onSuccess={handleDialogClose}
              />
            ) : (
              <LeadCompanyForm
                onSuccess={handleDialogClose}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageOpportunities = opportunities.filter(
              (opp) => opp.stage_id === stage.id
            );
            
            return (
                <DroppableStage
                  key={stage.id}
                  stage={stage}
                  opportunities={stageOpportunities}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                  currentUserId={user?.id}
                  aceitosStageId={aceitosStageId}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeOpportunity ? (
              <OpportunityCard
                opportunity={activeOpportunity}
                onEdit={() => {}}
                onDelete={() => {}}
                isAdmin={isAdmin}
                currentUserId={user?.id}
                aceitosStageId={aceitosStageId}
              />
            ) : null}
          </DragOverlay>
      </DndContext>
    </div>
  );
}