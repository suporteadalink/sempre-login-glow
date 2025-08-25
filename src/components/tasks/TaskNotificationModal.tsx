import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Building2, Target, FolderOpen, X } from "lucide-react";
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

interface TaskNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onMarkComplete: (taskId: number) => Promise<boolean>;
  onViewAllTasks: () => void;
}

export const TaskNotificationModal = ({
  isOpen,
  onClose,
  tasks,
  onMarkComplete,
  onViewAllTasks
}: TaskNotificationModalProps) => {
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

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const handleComplete = async (taskId: number) => {
    const success = await onMarkComplete(taskId);
    if (success) {
      // Task will be removed from the list by the parent component
    }
  };

  if (tasks.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-primary" />
              Tarefas para Hoje
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-muted-foreground">
            Você tem {tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} programada{tasks.length !== 1 ? "s" : ""} para hoje:
          </p>

          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{task.name}</h4>
                        {task.priority && (
                          <Badge className={getPriorityColor(task.priority)} variant="secondary">
                            {task.priority}
                          </Badge>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(task.due_date)}
                          </div>
                        )}
                        
                        {task.companies?.name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {task.companies.name}
                          </div>
                        )}
                        
                        {task.opportunities?.title && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {task.opportunities.title}
                          </div>
                        )}
                        
                        {task.projects?.title && (
                          <div className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            {task.projects.title}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleComplete(task.id)}
                      className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Concluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onViewAllTasks}>
              Ver Todas as Tarefas
            </Button>
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};