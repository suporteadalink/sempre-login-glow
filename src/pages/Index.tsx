import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { TaskForm } from "@/components/tasks/TaskForm";
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
  AlertCircle
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
        .from('tasks')
        .select('*')
        .eq('status', 'Pendente')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tarefas pendentes:', error);
        setPendingTasks([]);
      } else {
        setPendingTasks(tasks || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas pendentes:', error);
      setPendingTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function fetchRecentActivities() {
    try {
      setLoadingActivities(true);
      const { data: activities, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar atividades recentes:', error);
        setRecentActivities([]);
      } else {
        setRecentActivities(activities || []);
      }
    } catch (error) {
      console.error('Erro ao carregar atividades recentes:', error);
      setRecentActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }

  // Modal handlers
  const handleModalSuccess = () => {
    // Refresh data when forms are successfully submitted
    loadDashboardData();
    fetchPendingTasks();
    fetchRecentActivities();
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
              Tarefas Pendentes
            </h3>
            <div className="space-y-4">
              {loadingTasks ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando tarefas...</p>
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
                  Nenhuma tarefa pendente encontrada.
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

      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={handleModalSuccess}
        task={taskType ? { type: taskType } : undefined}
      />
    </div>
  );
};

export default Index;