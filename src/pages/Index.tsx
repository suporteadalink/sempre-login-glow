import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      fetchPendingTasks();
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

  const recentActivities = [
    {
      title: "Nova oportunidade aprovada",
      description: "2 horas atrás",
      icon: CheckCircle,
      iconColor: "text-green-500"
    },
    {
      title: "Cliente cadastrado no sistema",
      description: "4 horas atrás",
      icon: Users,
      iconColor: "text-blue-500"
    },
    {
      title: "Reunião agendada para amanhã",
      description: "6 horas atrás",
      icon: Calendar,
      iconColor: "text-yellow-500"
    }
  ];


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
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg bg-muted ${activity.iconColor}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
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
    </div>
  );
};

export default Index;