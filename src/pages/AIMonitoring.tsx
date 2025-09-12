import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AIMonitoring() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch AI-generated leads
  const { data: aiLeads, isLoading } = useQuery({
    queryKey: ["ai-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          contacts(id, name, email, phone, ai_confidence, ai_metadata),
          opportunities(id, title, value, stage_id, ai_confidence, ai_metadata, pipeline_stages(name, color))
        `)
        .eq("source", "ai")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch AI activity logs
  const { data: aiActivities } = useQuery({
    queryKey: ["ai-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("source", "ai")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const metrics = {
    totalLeads: aiLeads?.length || 0,
    avgConfidence: aiLeads?.reduce((acc, lead) => acc + (lead.ai_confidence || 0), 0) / (aiLeads?.length || 1) * 100,
    highConfidence: aiLeads?.filter(lead => (lead.ai_confidence || 0) >= 0.8).length || 0,
    needsReview: aiLeads?.filter(lead => (lead.ai_confidence || 0) < 0.7).length || 0
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return <Badge variant="secondary">N/A</Badge>;
    
    const percentage = confidence * 100;
    if (percentage >= 80) return <Badge variant="default" className="bg-green-500">Alta ({percentage.toFixed(0)}%)</Badge>;
    if (percentage >= 70) return <Badge variant="outline">Média ({percentage.toFixed(0)}%)</Badge>;
    return <Badge variant="destructive">Baixa ({percentage.toFixed(0)}%)</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bot className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Monitoramento de IA</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bot className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Monitoramento de IA</h1>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads IA</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgConfidence.toFixed(0)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Confiança</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.highConfidence}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisam Revisão</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.needsReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="leads">Leads IA</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo dos Leads Gerados pela IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                A IA processou conversas e gerou automaticamente {metrics.totalLeads} leads com uma confiança média de {metrics.avgConfidence.toFixed(0)}%.
              </p>
              {metrics.needsReview > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-700">
                    {metrics.needsReview} leads precisam de revisão manual devido à baixa confiança.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leads Gerados pela IA</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiLeads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-muted-foreground">{lead.city}, {lead.state}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.contacts?.[0] && (
                          <div>
                            <div className="font-medium">{lead.contacts[0].name}</div>
                            <div className="text-sm text-muted-foreground">{lead.contacts[0].email}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getConfidenceBadge(lead.ai_confidence)}</TableCell>
                      <TableCell>
                        {lead.ai_metadata && typeof lead.ai_metadata === 'object' && 'conversation_source' in lead.ai_metadata && (
                          <Badge variant="outline">
                            {String(lead.ai_metadata.conversation_source)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log de Atividades da IA</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Metadados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiActivities?.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate">{activity.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {activity.ai_metadata && typeof activity.ai_metadata === 'object' && 'confidence_score' in activity.ai_metadata && (
                          <span className="text-sm text-muted-foreground">
                            Confiança: {(Number(activity.ai_metadata.confidence_score) * 100).toFixed(0)}%
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}