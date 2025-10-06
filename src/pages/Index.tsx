import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { FollowUpForm } from "@/components/followups/FollowUpForm";
import { 
  DollarSign, 
  Users, 
  FolderOpen, 
  Target,
  UserPlus,
  Briefcase,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [goalProgress, setGoalProgress] = useState<any>(null);
  const [leadsGoalProgress, setLeadsGoalProgress] = useState<any>(null);
  const [projectsGoalProgress, setProjectsGoalProgress] = useState<any>(null);
  const [conversionGoalProgress, setConversionGoalProgress] = useState<any>(null);
  const [loadingGoal, setLoadingGoal] = useState(true);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [conversionTrend, setConversionTrend] = useState<any[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  
  // Modal states
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskType, setTaskType] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      fetchPendingTasks();
      fetchRecentActivities();
      fetchGoalProgress();
      fetchLeadsGoalProgress();
      fetchProjectsGoalProgress();
      fetchConversionGoalProgress();
      fetchChartsData();
    }
  }, [user]);

  async function loadDashboardData() {
    try {
      setLoadingMetrics(true);
      // @ts-ignore - Function exists in database but not in types
      const { data, error } = await supabase.rpc('get_dashboard_metrics');

      if (error) {
        console.error('Erro ao buscar métricas do dashboard:', error);
      } else {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoadingMetrics(false);
    }
  }

  async function fetchPendingTasks() {
    try {
      setLoadingTasks(true);
      const { data: tasks, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('status', 'Pendente')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar follow ups pendentes:', error);
        setPendingTasks([]);
      } else {
        setPendingTasks(tasks || []);
      }
    } catch (error) {
      console.error('Erro ao carregar follow ups pendentes:', error);
      setPendingTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function fetchRecentActivities() {
    try {
      setLoadingActivities(true);
      // @ts-ignore - Function exists in database but not in types
      const { data: activities, error } = await supabase.rpc('get_recent_activities');

      if (error) {
        console.error('Erro ao buscar atividades recentes:', error);
        setRecentActivities([]);
      } else {
        // Parse the JSON response since RPC returns JSON
        const activitiesArray = Array.isArray(activities) ? activities : [];
        setRecentActivities(activitiesArray);
      }
    } catch (error) {
      console.error('Erro ao carregar atividades recentes:', error);
      setRecentActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }

  // Exemplo de como chamar a função de progresso de meta
  async function fetchGoalProgress() {
    try {
      setLoadingGoal(true);
      // @ts-ignore - Function exists in database but not in types
      const { data: goalProgress, error } = await supabase.rpc('get_my_goal_progress');

      if (error) {
        console.error('Erro ao buscar progresso da meta:', error);
        setGoalProgress(null);
      } else if (goalProgress) { 
        setGoalProgress(goalProgress);
      } else {
        setGoalProgress(null);
      }
    } catch (error) {
      console.error('Erro ao carregar progresso da meta:', error);
      setGoalProgress(null);
    } finally {
      setLoadingGoal(false);
    }
  }

  async function fetchLeadsGoalProgress() {
    try {
      // @ts-ignore - Function exists in database but not in types
      const { data, error } = await supabase.rpc('get_leads_goal_progress');
      if (error) throw error;
      setLeadsGoalProgress(data);
    } catch (error) {
      console.error('Erro ao buscar progresso da meta de leads:', error);
    }
  }

  async function fetchProjectsGoalProgress() {
    try {
      // @ts-ignore - Function exists in database but not in types
      const { data, error } = await supabase.rpc('get_projects_goal_progress');
      if (error) throw error;
      setProjectsGoalProgress(data);
    } catch (error) {
      console.error('Erro ao buscar progresso da meta de projetos:', error);
    }
  }

  async function fetchConversionGoalProgress() {
    try {
      // @ts-ignore - Function exists in database but not in types
      const { data, error } = await supabase.rpc('get_conversion_goal_progress');
      if (error) throw error;
      setConversionGoalProgress(data);
    } catch (error) {
      console.error('Erro ao buscar progresso da meta de conversão:', error);
    }
  }

  async function fetchChartsData() {
    try {
      setLoadingCharts(true);
      
      // Fetch pipeline distribution
      // @ts-ignore - Function exists in database but not in types
      const { data: pipelineData, error: pipelineError } = await supabase.rpc('get_pipeline_distribution');
      
      if (pipelineError) {
        console.error('Erro ao buscar dados do pipeline:', pipelineError);
        setPipelineData([]);
      } else {
        setPipelineData(Array.isArray(pipelineData) ? pipelineData : []);
      }

      // Fetch conversion trend
      // @ts-ignore - Function exists in database but not in types
      const { data: conversionData, error: conversionError } = await supabase.rpc('get_conversion_trend');
      
      if (conversionError) {
        console.error('Erro ao buscar tendência de conversão:', conversionError);
        setConversionTrend([]);
      } else {
        setConversionTrend(Array.isArray(conversionData) ? conversionData : []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error);
      setPipelineData([]);
      setConversionTrend([]);
    } finally {
      setLoadingCharts(false);
    }
  }

  // Modal handlers
  const handleModalSuccess = () => {
    // Refresh data when forms are successfully submitted
    loadDashboardData();
    fetchPendingTasks();
    fetchRecentActivities();
    fetchGoalProgress();
    fetchLeadsGoalProgress();
    fetchProjectsGoalProgress();
    fetchConversionGoalProgress();
    fetchChartsData();
    setIsCompanyModalOpen(false);
    setIsOpportunityModalOpen(false);
    setIsTaskModalOpen(false);
  };

  const handleQuickAction = (actionTitle: string) => {
    switch (actionTitle) {
      case "Novo Lead":
        setIsCompanyModalOpen(true);
        break;
      case "Nova Oportunidade":
        setIsOpportunityModalOpen(true);
        break;
      case "Agendar Reunião":
        setTaskType("Reunião");
        setIsTaskModalOpen(true);
        break;
      case "Enviar Proposta":
        setTaskType("Proposta");
        setIsTaskModalOpen(true);
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const metrics = [
    {
      title: "Receita Total",
      value: dashboardData ? `R$ ${new Intl.NumberFormat('pt-BR').format(dashboardData.totalRevenue || 0)}` : "R$ 0",
      icon: DollarSign,
      iconColor: "bg-green-500",
      description: "Total arrecadado este mês"
    },
    {
      title: "Leads Ativos",
      value: dashboardData?.activeLeads?.toString() || "0",
      icon: Users,
      iconColor: "bg-blue-500",
      description: "Leads em potencial"
    },
    {
      title: "Projetos Ativos",
      value: dashboardData?.activeProjects?.toString() || "0",
      icon: FolderOpen,
      iconColor: "bg-purple-500",
      description: "Projetos em andamento"
    },
    {
      title: "Taxa de Conversão",
      value: dashboardData ? `${Math.round(dashboardData.conversionRate || 0)}%` : "0%",
      icon: Target,
      iconColor: "bg-yellow-500",
      description: "Leads convertidos em vendas"
    }
  ];

  const quickActions = [
    { title: "Novo Lead", icon: UserPlus },
    { title: "Nova Oportunidade", icon: Briefcase },
    { title: "Agendar Reunião", icon: Calendar },
    { title: "Enviar Proposta", icon: FileText }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'COMPANY_CREATED':
        return Users;
      case 'OPPORTUNITY_CREATED':
        return Briefcase;
      case 'TASK_CREATED':
        return Calendar;
      default:
        return CheckCircle;
    }
  };

  const getActivityIconColor = (type: string) => {
    switch (type) {
      case 'COMPANY_CREATED':
        return 'text-blue-500';
      case 'OPPORTUNITY_CREATED':
        return 'text-green-500';
      case 'TASK_CREATED':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatActivityTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Agora há pouco';
    } else if (diffInHours === 1) {
      return '1 hora atrás';
    } else if (diffInHours < 24) {
      return `${diffInHours} horas atrás`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1 dia atrás' : `${diffInDays} dias atrás`;
    }
  };


  return (
    <div className="space-y-8">
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="transition-all hover:shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.iconColor}`}>
                  <metric.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {metric.title}
              </h3>
              <p className="text-3xl font-bold text-foreground mb-2">
                {metric.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-16 justify-start space-x-3 text-left transition-all hover:shadow-medium"
              onClick={() => handleQuickAction(action.title)}
            >
              <action.icon className="h-5 w-5" />
              <span>{action.title}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Seção de Metas */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Minhas Metas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Meta de Valor */}
          {goalProgress && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Meta de Receita</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">{goalProgress.goalName}</span>
                      <span className="text-sm text-muted-foreground">
                        {goalProgress.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={goalProgress.progressPercentage} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Atual:</span>
                      <span className="font-semibold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(goalProgress.currentValue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meta:</span>
                      <span>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(goalProgress.targetValue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Período:</span>
                      <span>
                        {new Date(goalProgress.startDate).toLocaleDateString('pt-BR')} - {new Date(goalProgress.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta de Leads */}
          {leadsGoalProgress && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-foreground">Meta de Novos Leads</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">{leadsGoalProgress.goalName}</span>
                      <span className="text-sm text-muted-foreground">
                        {leadsGoalProgress.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={leadsGoalProgress.progressPercentage} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Atual:</span>
                      <span className="font-semibold text-blue-500">
                        {leadsGoalProgress.currentValue} leads
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meta:</span>
                      <span>
                        {leadsGoalProgress.targetValue} leads
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Período:</span>
                      <span>
                        {new Date(leadsGoalProgress.startDate).toLocaleDateString('pt-BR')} - {new Date(leadsGoalProgress.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta de Projetos */}
          {projectsGoalProgress && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-foreground">Meta de Projetos Fechados</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">{projectsGoalProgress.goalName}</span>
                      <span className="text-sm text-muted-foreground">
                        {projectsGoalProgress.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={projectsGoalProgress.progressPercentage} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Atual:</span>
                      <span className="font-semibold text-green-500">
                        {projectsGoalProgress.currentValue} projetos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meta:</span>
                      <span>
                        {projectsGoalProgress.targetValue} projetos
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Período:</span>
                      <span>
                        {new Date(projectsGoalProgress.startDate).toLocaleDateString('pt-BR')} - {new Date(projectsGoalProgress.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta de Conversão */}
          {conversionGoalProgress && (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-foreground">Meta de Taxa de Conversão</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">{conversionGoalProgress.goalName}</span>
                      <span className="text-sm text-muted-foreground">
                        {conversionGoalProgress.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={conversionGoalProgress.progressPercentage} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Taxa Atual:</span>
                      <span className="font-semibold text-purple-500">
                        {conversionGoalProgress.currentValue.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meta:</span>
                      <span>
                        {conversionGoalProgress.targetValue}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Leads:</span>
                      <span>
                        {conversionGoalProgress.convertedLeads}/{conversionGoalProgress.totalLeads}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Período:</span>
                      <span>
                        {new Date(conversionGoalProgress.startDate).toLocaleDateString('pt-BR')} - {new Date(conversionGoalProgress.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline Distribution Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Distribuição do Pipeline
            </h3>
            {loadingCharts ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                </div>
              </div>
            ) : pipelineData.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Oportunidades",
                  },
                }}
                className="h-64"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="count"
                      nameKey="stage"
                      label={false}
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || `hsl(${index * 45}, 70%, 50%)`}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const total = pipelineData.reduce((sum, item) => sum + item.count, 0);
                          const percentage = Math.round((data.count / total) * 100);
                          return (
                            <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-foreground">{data.stage}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.count} oportunidade{data.count !== 1 ? 's' : ''} ({percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Trend Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Tendência de Conversão
            </h3>
            {loadingCharts ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
                </div>
              </div>
            ) : conversionTrend.length > 0 ? (
              <ChartContainer
                config={{
                  conversion_rate: {
                    label: "Taxa de Conversão (%)",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-48"
              >
                <ResponsiveContainer width="100%" height={192}>
                  <LineChart data={conversionTrend} width={400} height={192}>
                    <XAxis 
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversion_rate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [
                          `${value}%`,
                          name === 'conversion_rate' ? 'Taxa de Conversão' : name
                        ]}
                      />} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activities and Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Atividades Recentes
            </h3>
            <div className="space-y-4">
              {loadingActivities ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando atividades...</p>
                </div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  const iconColor = getActivityIconColor(activity.type);
                  
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatActivityTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade recente encontrada.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Follow Ups Pendentes
            </h3>
            <div className="space-y-4">
              {loadingTasks ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando follow ups...</p>
                </div>
              ) : pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {task.name}
                        </p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Vence em: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      task.priority === 'Alta' ? 'destructive' : 
                      task.priority === 'Média' ? 'default' : 
                      'secondary'
                    }>
                      {task.priority || 'Normal'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum follow up pendente encontrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <CompanyForm 
            onSuccess={handleModalSuccess}
            onCancel={() => setIsCompanyModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isOpportunityModalOpen} onOpenChange={setIsOpportunityModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Oportunidade</DialogTitle>
          </DialogHeader>
          <OpportunityForm 
            onSuccess={handleModalSuccess}
          />
        </DialogContent>
      </Dialog>

      <FollowUpForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={handleModalSuccess}
        followUp={taskType ? { type: taskType } : undefined}
      />
    </div>
  );
};

export default Index;