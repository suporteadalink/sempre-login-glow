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
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .in("role", ["admin", "vendedor"])
        .eq("status", "Ativo")
        .order("name");
      
      if (error) throw error;
      return data || [];
    }
  });
}