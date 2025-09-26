import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Edit, Trash2, Clock, Check, X, FileText, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import { ProposalVersionHistory } from "@/components/proposals/ProposalVersionHistory";

interface Proposal {
  id: number;
  title: string;
  value: number | null;
  status: string | null;
  company_id: number | null;
  project_id: number | null;
  owner_id: string;
  created_at: string;
  pdf_url: string | null;
  current_version: number | null;
  version_count: number | null;
  companies?: {
    name: string;
  };
  projects?: {
    title: string;
    project_code: string | null;
  };
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();

  console.log("DEBUG: Proposals component - isHistoryOpen:", isHistoryOpen, "selectedProposal:", selectedProposal?.id);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals' as any)
        .select(`
          *,
          companies:company_id(name),
          projects:project_id(title, project_code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals((data as any) || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as propostas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('proposals' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Proposta deletada com sucesso.",
      });
      
      fetchProposals();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a proposta.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingProposal(null);
    fetchProposals();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProposal(null);
  };

  const handleStatusChange = async (proposalId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('proposals' as any)
        .update({ status: newStatus })
        .eq('id', proposalId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Proposta marcada como ${newStatus}.`,
      });
      
      fetchProposals();
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da proposta.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Rascunho':
        return FileText;
      case 'Enviada':
        return Clock;
      case 'Aceita':
        return Check;
      case 'Rejeitada':
        return X;
      default:
        return FileText;
    }
  };

  const handleRowClick = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsDetailsOpen(true);
  };

  const handleViewHistory = (proposal: Proposal) => {
    console.log("DEBUG: Opening history for proposal", proposal.id);
    setSelectedProposal(proposal);
    setIsHistoryOpen(true);
  };

  const handleBackFromHistory = () => {
    setIsHistoryOpen(false);
    setIsDetailsOpen(true);
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'Enviada':
        return 'secondary';
      case 'Aceita':
        return 'default';
      case 'Rejeitada':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as propostas comerciais
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Nova Proposta
        </Button>
      </div>

      <Card>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Carregando propostas...</div>
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-2">
              <div className="text-muted-foreground">Nenhuma proposta encontrada</div>
              <Button onClick={() => setIsFormOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira proposta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow 
                    key={proposal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(proposal)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {proposal.title}
                        {(proposal.version_count ?? 1) > 1 && (
                          <Badge variant="outline" className="text-xs">
                            v{proposal.current_version} ({proposal.version_count} versões)
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {proposal.companies?.name || `Cliente #${proposal.company_id || 'N/A'}`}
                    </TableCell>
                    <TableCell>
                      {proposal.projects ? (
                        <div>
                          {proposal.projects.project_code && (
                            <span className="text-muted-foreground text-sm">
                              {proposal.projects.project_code} - 
                            </span>
                          )}
                          <span>{proposal.projects.title}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Projeto #${proposal.project_id || 'N/A'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(proposal.value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(proposal.status)}>
                        {proposal.status || 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(proposal)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {(proposal.version_count ?? 1) > 1 && (
                            <DropdownMenuItem onClick={() => handleViewHistory(proposal)}>
                              <History className="mr-2 h-4 w-4" />
                              Ver Histórico ({proposal.version_count} versões)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(proposal.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {['Rascunho', 'Enviada', 'Aceita', 'Rejeitada'].map((status) => {
                            const StatusIcon = getStatusIcon(status);
                            const isCurrentStatus = (proposal.status || 'Rascunho') === status;
                            
                            return (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => handleStatusChange(proposal.id, status)}
                                className={isCurrentStatus ? "bg-muted opacity-50 cursor-not-allowed" : ""}
                                disabled={isCurrentStatus}
                              >
                                <StatusIcon className="mr-2 h-4 w-4" />
                                {status}
                                {isCurrentStatus && <span className="ml-auto text-xs">atual</span>}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <ProposalForm
          proposal={editingProposal}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <div className="p-0">
          <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Detalhes da Proposta</h2>
                {selectedProposal && (selectedProposal.version_count ?? 1) > 1 && (
                  <Button variant="outline" onClick={() => handleViewHistory(selectedProposal)}>
                    <History className="w-4 h-4 mr-2" />
                    Ver Histórico ({selectedProposal.version_count} versões)
                  </Button>
                )}
              </div>
              {selectedProposal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Título</label>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-medium">{selectedProposal.title}</p>
                      {(selectedProposal.version_count ?? 1) > 1 && (
                        <Badge variant="outline">
                          v{selectedProposal.current_version}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                    <p>Cliente #{selectedProposal.company_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Valor</label>
                    <p>{formatCurrency(selectedProposal.value)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="pt-1">
                      <Badge variant={getStatusBadgeVariant(selectedProposal.status)}>
                        {selectedProposal.status || 'Rascunho'}
                      </Badge>
                    </div>
                  </div>
                  {(selectedProposal.version_count ?? 1) > 1 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Versões</label>
                      <p>{selectedProposal.version_count} versões criadas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {selectedProposal?.pdf_url && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Documento PDF</h3>
                {(() => {
                  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(selectedProposal.pdf_url)}&embedded=true`;
                  return (
                    <iframe
                      src={googleViewerUrl}
                      width="100%"
                      height="700px"
                      className="border rounded-lg"
                      title="Visualizador de PDF da Proposta"
                    />
                  );
                })()}
              </div>
            )}
            
            {!selectedProposal?.pdf_url && (
              <div className="flex items-center justify-center h-32 border rounded-lg border-dashed">
                <p className="text-muted-foreground">Nenhum PDF anexado a esta proposta</p>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Dialog para histórico de versões */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Versões da Proposta</DialogTitle>
          </DialogHeader>
          
          {selectedProposal && (
            <ProposalVersionHistory 
              proposalId={selectedProposal.id}
              onBack={handleBackFromHistory}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}