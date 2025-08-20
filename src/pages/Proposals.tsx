import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProposalForm } from "@/components/proposals/ProposalForm";

interface Proposal {
  id: number;
  title: string;
  value: number | null;
  status: string | null;
  company_id: number | null;
  owner_id: string;
  created_at: string;
  companies?: {
    name: string;
  };
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const { toast } = useToast();

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals' as any)
        .select('*')
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
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">
                      {proposal.title}
                    </TableCell>
                    <TableCell>
                      Cliente #{proposal.company_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(proposal.value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(proposal.status)}>
                        {proposal.status || 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                          <DropdownMenuItem 
                            onClick={() => handleDelete(proposal.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
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
    </div>
  );
}