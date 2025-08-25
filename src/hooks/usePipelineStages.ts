import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineStage {
  id: number;
  name: string;
  color: string | null;
  order: number | null;
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async (): Promise<PipelineStage[]> => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, name, color, order")
        .order("order");
      
      if (error) throw error;
      return data || [];
    }
  });
}