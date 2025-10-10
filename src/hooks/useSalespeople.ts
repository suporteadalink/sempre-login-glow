import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Salesperson {
  id: string;
  name: string;
  role: string;
}

export function useSalespeople() {
  return useQuery({
    queryKey: ["salespeople"],
    queryFn: async (): Promise<Salesperson[]> => {
      // Get users with their roles from user_roles table
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;
      
      const userIdsWithRoles = userRoles
        ?.filter(ur => ur.role === 'admin' || ur.role === 'vendedor')
        .map(ur => ur.user_id) || [];
      
      if (userIdsWithRoles.length === 0) return [];
      
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIdsWithRoles)
        .eq("status", "Ativo")
        .order("name");
      
      if (error) throw error;
      
      // Join roles with users
      return (data || []).map(user => {
        const userRole = userRoles?.find(ur => ur.user_id === user.id);
        return {
          ...user,
          role: userRole?.role || 'vendedor'
        };
      });
    }
  });
}