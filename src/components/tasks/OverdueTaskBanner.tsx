import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Eye, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: number;
  name: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  description: string | null;
  type: string | null;
  companies?: { name: string };
  opportunities?: { title: string };
  projects?: { title: string };
}

interface OverdueTaskBannerProps {
  tasks: Task[];
  onMarkComplete: (taskId: number) => Promise<boolean>;
}

export const OverdueTaskBanner = ({ tasks, onMarkComplete }: OverdueTaskBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  if (tasks.length === 0 || isDismissed) return null;

  const formatDaysOverdue = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const dueDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return "1 dia atrasada";
      return `${diffDays} dias atrasada`;
    } catch {
      return "";
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "alta":
      case "urgente":
        return "bg-red-100 text-red-800";
      case "média":
      case "normal":
        return "bg-yellow-100 text-yellow-800";
      case "baixa":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleComplete = async (taskId: number) => {
    await onMarkComplete(taskId);
  };

  return (
    <div className="mb-4">
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="font-medium text-red-800">
                Você tem {tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} atrasada{tasks.length !== 1 ? "s" : ""}!
              </span>
              {!isExpanded && tasks.length > 0 && (
                <span className="text-red-700 ml-2">
                  "{tasks[0].name}" {formatDaysOverdue(tasks[0].due_date)}
                  {tasks.length > 1 && ` e mais ${tasks.length - 1}...`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <Eye className="h-3 w-3 mr-1" />
                {isExpanded ? "Ocultar" : "Ver"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/tarefas")}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Ir para Tarefas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDismissed(true)}
                className="text-red-700 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{task.name}</span>
                      {task.priority && (
                        <Badge className={getPriorityColor(task.priority)} variant="secondary">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Vencimento: {formatDueDate(task.due_date)}</span>
                      <span className="text-red-600 font-medium">
                        {formatDaysOverdue(task.due_date)}
                      </span>
                      {task.companies?.name && <span>• {task.companies.name}</span>}
                      {task.opportunities?.title && <span>• {task.opportunities.title}</span>}
                      {task.projects?.title && <span>• {task.projects.title}</span>}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleComplete(task.id)}
                    className="bg-green-600 hover:bg-green-700 text-white ml-3"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Concluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};