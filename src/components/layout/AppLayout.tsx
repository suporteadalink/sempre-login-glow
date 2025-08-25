import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TaskNotificationModal } from "@/components/tasks/TaskNotificationModal";
import { OverdueTaskBanner } from "@/components/tasks/OverdueTaskBanner";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, notificationTrigger } = useAuth() as any;
  const navigate = useNavigate();
  const {
    todayTasks,
    overdueTasks,
    showTodayModal,
    checkForLoginNotifications,
    dismissTodayModal,
    markTaskComplete,
  } = useTaskNotifications();

  useEffect(() => {
    if (user && notificationTrigger > 0) {
      checkForLoginNotifications();
    }
  }, [user, notificationTrigger]);

  const handleViewAllTasks = () => {
    dismissTodayModal();
    navigate("/tarefas");
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 bg-background overflow-x-auto min-w-0">
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="flex items-center h-12 px-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
          </div>
          <div className="p-6">
            <OverdueTaskBanner 
              tasks={overdueTasks} 
              onMarkComplete={markTaskComplete}
            />
            {children}
          </div>
        </main>
      </div>

      <TaskNotificationModal
        isOpen={showTodayModal}
        onClose={dismissTodayModal}
        tasks={todayTasks}
        onMarkComplete={markTaskComplete}
        onViewAllTasks={handleViewAllTasks}
      />
    </SidebarProvider>
  );
}