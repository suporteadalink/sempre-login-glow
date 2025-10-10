import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Upload, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CompanyForm } from "@/components/companies/CompanyForm";
import ImportCompaniesDialog from "@/components/companies/ImportCompaniesDialog";
import { CompanyFilters } from "@/components/companies/CompanyFilters";
import { useAuth } from "@/components/auth/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Company {
  id: number;
  name: string;
  cnpj: string | null;
  city: string | null;
  type: string | null;
  sector: string | null;
  size: string | null;
  number_of_employees: number | null;
  annual_revenue: number | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  owner_id: string | null;
}

export default function Companies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [dependencies, setDependencies] = useState<{opportunities: any[], projects: any[]}>({opportunities: [], projects: []});
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    sector: "all",
    city: "all",
    state: "all",
    size: "all",
    owner: "all"
  });
  const { toast } = useToast();

  // Get user role using the new secure hook
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      return data?.role;
    },
    enabled: !!user?.id
  });

  // Get companies using React Query
  const { data: companies = [], isLoading: loading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *, 
          users:owner_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Company & { users: { name: string } | null })[];
    }
  });

  const isAdmin = userRole === 'admin';

  // Filter companies based on search term and filters
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // Search term filter
      const searchMatch = searchTerm === "" || 
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter matches
      const typeMatch = filters.type === "" || filters.type === "all" || company.type === filters.type;
      const sectorMatch = filters.sector === "" || filters.sector === "all" || company.sector === filters.sector;
      const cityMatch = filters.city === "" || filters.city === "all" || company.city === filters.city;
      const stateMatch = filters.state === "" || filters.state === "all" || company.state === filters.state;
      const sizeMatch = filters.size === "" || filters.size === "all" || company.size === filters.size;
      const ownerMatch = filters.owner === "" || filters.owner === "all" || company.owner_id === filters.owner;

      return searchMatch && typeMatch && sectorMatch && cityMatch && stateMatch && sizeMatch && ownerMatch;
    });
  }, [companies, searchTerm, filters]);

  const handleFilterChange = (filterKey: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({
      type: "all",
      sector: "all",
      city: "all",
      state: "all",
      size: "all",
      owner: "all"
    });
  };

  const handleDelete = async (company: Company) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir empresas.",
        variant: "destructive",
      });
      return;
    }

    // Check for dependencies first
    try {
      const [opportunitiesResult, projectsResult] = await Promise.all([
        supabase
          .from("opportunities")
          .select("id, title, value")
          .eq("company_id", company.id),
        supabase
          .from("projects")
          .select("id, title, status")
          .eq("company_id", company.id)
      ]);

      if (opportunitiesResult.error || projectsResult.error) {
        toast({
          title: "Erro ao verificar dependências",
          description: opportunitiesResult.error?.message || projectsResult.error?.message,
          variant: "destructive",
        });
        return;
      }

      const opportunities = opportunitiesResult.data || [];
      const projects = projectsResult.data || [];

      if (opportunities.length > 0 || projects.length > 0) {
        setDependencies({ opportunities, projects });
        setCompanyToDelete(company);
        setDependenciesDialogOpen(true);
        return;
      }

      // No dependencies, proceed with normal deletion
      if (!confirm("Tem certeza que deseja excluir esta empresa? Todos os dados relacionados (contatos, propostas, etc.) também serão excluídos.")) {
        return;
      }

      // Use the database function to safely delete the company and all related records
      const { data, error } = await supabase.rpc('delete_company_with_relations', {
        company_id_param: company.id
      });

      if (error) throw error;

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({
        title: "Sucesso",
        description: "Empresa e todos os dados relacionados foram excluídos com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a empresa.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCompany(null);
  };

  const handleFormSuccess = () => {
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    handleFormClose();
  };

  const getStatusBadge = (type: string | null) => {
    if (!type) return <Badge variant="secondary">-</Badge>;
    
    const statusColors = {
      'Lead': 'default',
      'Cliente': 'default',
      'Inativa': 'secondary'
    } as const;

    return (
      <Badge variant={statusColors[type as keyof typeof statusColors] || 'secondary'}>
        {type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
        </div>
        <Card className="p-6">
          <div className="text-center text-muted-foreground">Carregando empresas...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar Empresas
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Nova Empresa
          </Button>
        </div>
      </div>

      <CompanyFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <Table>
          <TableHeader>
             <TableRow>
               <TableHead>Nome</TableHead>
               <TableHead>CNPJ</TableHead>
               <TableHead>Cidade</TableHead>
               <TableHead>Tipo</TableHead>
               <TableHead>Vendedor Responsável</TableHead>
               <TableHead>Status</TableHead>
               <TableHead className="w-[50px]">Ações</TableHead>
             </TableRow>
          </TableHeader>
          <TableBody>
             {filteredCompanies.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                   {companies.length === 0 ? "Nenhuma empresa encontrada" : "Nenhuma empresa corresponde aos filtros aplicados"}
                 </TableCell>
               </TableRow>
             ) : (
               filteredCompanies.map((company) => (
                 <TableRow key={company.id}>
                   <TableCell className="font-medium">{company.name}</TableCell>
                   <TableCell>{company.cnpj || '-'}</TableCell>
                   <TableCell>{company.city || '-'}</TableCell>
                   <TableCell>{company.type || '-'}</TableCell>
                   <TableCell>
                     {company.users?.name ? (
                       <div className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                         {company.users.name}
                       </div>
                     ) : '-'}
                   </TableCell>
                   <TableCell>{getStatusBadge(company.type)}</TableCell>
                   <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(company)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(company)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <CompanyForm 
          company={editingCompany} 
          onSuccess={handleFormSuccess}
          onCancel={handleFormClose}
        />
      </Dialog>

      <ImportCompaniesDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          queryClient.invalidateQueries({ queryKey: ["companies"] });
          queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        }}
      />

      {/* Dependencies Dialog */}
      <AlertDialog open={dependenciesDialogOpen} onOpenChange={setDependenciesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não é possível excluir a empresa</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa "{companyToDelete?.name}" não pode ser excluída porque possui dependências:
              <br /><br />
              {dependencies.opportunities.length > 0 && (
                <>
                  <strong>Oportunidades ativas ({dependencies.opportunities.length}):</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {dependencies.opportunities.map((opp) => (
                      <li key={opp.id} className="text-sm">
                        {opp.title} - {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(opp.value || 0)}
                      </li>
                    ))}
                  </ul>
                  <br />
                </>
              )}
              {dependencies.projects.length > 0 && (
                <>
                  <strong>Projetos ativos ({dependencies.projects.length}):</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {dependencies.projects.map((proj) => (
                      <li key={proj.id} className="text-sm">
                        {proj.title} - Status: {proj.status}
                      </li>
                    ))}
                  </ul>
                  <br />
                </>
              )}
              Para excluir esta empresa, primeiro gerencie as dependências nas páginas correspondentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Fechar
            </AlertDialogCancel>
            {dependencies.opportunities.length > 0 && (
              <AlertDialogAction onClick={() => navigate('/pipeline')}>
                Ir para Pipeline
              </AlertDialogAction>
            )}
            {dependencies.projects.length > 0 && (
              <AlertDialogAction onClick={() => navigate('/projects')}>
                Ir para Projetos
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}