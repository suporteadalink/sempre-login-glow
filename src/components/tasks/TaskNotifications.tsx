import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TaskNotificationModal } from "./TaskNotificationModal";
import { OverdueTaskBanner } from "./OverdueTaskBanner";

export function TaskNotifications() {
  const { user, notificationTrigger } = useAuth();
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
      // Debounce to avoid multiple calls
      const timer = setTimeout(() => {
        checkForLoginNotifications();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, notificationTrigger]);

  const handleViewAllTasks = () => {
    dismissTodayModal();
    navigate("/tarefas");
  };

  return (
    <>
      <OverdueTaskBanner 
        tasks={overdueTasks} 
        onMarkComplete={markTaskComplete}
      />
      
      <TaskNotificationModal
        isOpen={showTodayModal}
        onClose={dismissTodayModal}
        tasks={todayTasks}
        onMarkComplete={markTaskComplete}
        onViewAllTasks={handleViewAllTasks}
      />
    </>
  );
}