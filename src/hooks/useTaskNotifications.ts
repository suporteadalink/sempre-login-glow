import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface Task {
  id: number;
  name: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  description: string | null;
  type: string | null;
  company_id: number | null;
  opportunity_id: number | null;
  project_id: number | null;
  estimated_hours: number | null;
}

interface TaskWithRelations extends Task {
  companies?: { name: string };
  opportunities?: { title: string };
  projects?: { title: string };
}

export const useTaskNotifications = () => {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<TaskWithRelations[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);

  const fetchTodayTasks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          companies(name),
          opportunities(title),
          projects(title)
        `)
        .eq("responsible_id", user.id)
        .gte("due_date", today.toISOString())
        .lt("due_date", tomorrow.toISOString())
        .neq("status", "Concluída")
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Erro ao buscar tarefas do dia:", error);
        return;
      }

      setTodayTasks(data || []);
    } catch (error) {
      console.error("Erro ao buscar tarefas do dia:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchOverdueTasks = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          companies(name),
          opportunities(title),
          projects(title)
        `)
        .eq("responsible_id", user.id)
        .lt("due_date", today.toISOString())
        .neq("status", "Concluída")
        .order("due_date", { ascending: false });

      if (error) {
        console.error("Erro ao buscar tarefas atrasadas:", error);
        return;
      }

      setOverdueTasks(data || []);
    } catch (error) {
      console.error("Erro ao buscar tarefas atrasadas:", error);
    }
  }, [user]);

  const checkForLoginNotifications = useCallback(async () => {
    if (!user) return;

    // Check if we should show today's modal
    const lastShown = localStorage.getItem(`lastShownTaskModal_${user.id}`);
    const today = new Date().toDateString();
    
    if (lastShown !== today) {
      await fetchTodayTasks();
    }

    // Always fetch overdue tasks for the banner
    await fetchOverdueTasks();
  }, [user, fetchTodayTasks, fetchOverdueTasks]);

  const dismissTodayModal = () => {
    setShowTodayModal(false);
    if (user) {
      const today = new Date().toDateString();
      localStorage.setItem(`lastShownTaskModal_${user.id}`, today);
    }
  };

  const markTaskComplete = async (taskId: number) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "Concluída" })
        .eq("id", taskId);

      if (!error) {
        // Refresh both lists
        await fetchTodayTasks();
        await fetchOverdueTasks();
        return true;
      }
    } catch (error) {
      console.error("Erro ao concluir tarefa:", error);
    }
    return false;
  };

  // Effect to check for today's tasks and show modal
  useEffect(() => {
    if (user && todayTasks.length > 0) {
      const lastShown = localStorage.getItem(`lastShownTaskModal_${user.id}`);
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        setShowTodayModal(true);
        localStorage.setItem(`lastShownTaskModal_${user.id}`, today);
      }
    }
  }, [todayTasks, user]);

  useEffect(() => {
    if (user) {
      // Only fetch overdue tasks on mount, not repeatedly
      const timer = setTimeout(() => {
        fetchOverdueTasks();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  return {
    todayTasks,
    overdueTasks,
    loading,
    showTodayModal,
    checkForLoginNotifications,
    dismissTodayModal,
    markTaskComplete,
    refreshTasks: useCallback(() => {
      fetchTodayTasks();
      fetchOverdueTasks();
    }, [fetchTodayTasks, fetchOverdueTasks])
  };
};