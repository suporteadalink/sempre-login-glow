import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, FileText, User, Calendar, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProposalVersion {
  id: number;
  version_number: number;
  title: string;
  value: number | null;
  status: string | null;
  pdf_url: string | null;
  change_description: string | null;
  created_at: string;
  is_current: boolean;
  changed_by: string | null;
  user_name?: string;
}

interface ProposalVersionHistoryProps {
  proposalId: number;
  onBack: () => void;
}

export function ProposalVersionHistory({ proposalId, onBack }: ProposalVersionHistoryProps) {
  console.log("DEBUG: ProposalVersionHistory loading for proposalId:", proposalId);
  
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<ProposalVersion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVersions();
  }, [proposalId]);

  const fetchVersions = async () => {
    console.log("DEBUG: Fetching versions for proposal:", proposalId);
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("proposal_versions")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      // Buscar nomes dos usuários separadamente
      const userIds = data?.map(v => v.changed_by).filter(Boolean) || [];
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);

      if (usersError) throw usersError;

      // Mapear nomes dos usuários
      const userMap = users?.reduce((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {} as Record<string, string>) || {};

      const versionsWithUserNames = data?.map(version => ({
        ...version,
        user_name: userMap[version.changed_by] || "Usuário desconhecido"
      })) || [];

      setVersions(versionsWithUserNames);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message || "Não foi possível carregar o histórico de versões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "Aceita":
        return "default";
      case "Rejeitada":
        return "destructive";
      case "Em Análise":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getChangeIcon = (description: string | null) => {
    if (!description) return <History className="w-4 h-4" />;
    
    if (description.includes("PDF")) return <FileText className="w-4 h-4" />;
    if (description.includes("Status")) return <Badge className="w-4 h-4" />;
    return <History className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Carregando histórico de versões...</p>
        </div>
      </div>
    );
  }

  console.log("DEBUG: Rendering ProposalVersionHistory with", versions.length, "versions");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Button>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Histórico de Versões</h3>
          <Badge variant="outline">{versions.length} versões</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Versões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Versões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div key={version.id}>
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={version.is_current ? "default" : "outline"}>
                            v{version.version_number}
                          </Badge>
                          {version.is_current && (
                            <Badge variant="secondary">Atual</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(version.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        {getChangeIcon(version.change_description)}
                        <span className="text-sm font-medium">
                          {version.change_description || "Alteração"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {version.user_name}
                      </div>
                    </div>

                    {index < versions.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detalhes da Versão Selecionada */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedVersion 
                ? `Detalhes da Versão ${selectedVersion.version_number}`
                : "Selecione uma versão"
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedVersion ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Título</label>
                  <p className="text-sm mt-1">{selectedVersion.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <p className="text-sm mt-1">
                    {selectedVersion.value 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVersion.value) 
                      : "Não informado"
                    }
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    {selectedVersion.status ? (
                      <Badge variant={getStatusBadgeVariant(selectedVersion.status)}>
                        {selectedVersion.status}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Não definido</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">PDF</label>
                  <div className="mt-1">
                    {selectedVersion.pdf_url ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedVersion.pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 mr-2" />
                          Visualizar PDF
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhum PDF</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Alteração</label>
                  <p className="text-sm mt-1">
                    {selectedVersion.change_description || "Nenhuma descrição"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Modificado por</label>
                  <p className="text-sm mt-1">{selectedVersion.user_name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedVersion.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Selecione uma versão na lista ao lado para ver os detalhes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}