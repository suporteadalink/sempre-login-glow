import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSalespeople } from "@/hooks/useSalespeople";
import { useAuth } from "@/components/auth/AuthProvider";

// Limited form schema for editing opportunities (Pipeline context)
const formSchema = z.object({
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  description: z.string().optional(),
  owner_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface OpportunityFormProps {
  opportunity?: any;
  onSuccess: () => void;
}

export function OpportunityForm({ opportunity, onSuccess }: OpportunityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: salespeople = [] } = useSalespeople();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      probability: opportunity?.probability?.toString() || "",
      expected_close_date: opportunity?.expected_close_date || "",
      description: opportunity?.description || "",
      owner_id: opportunity?.owner_id || "",
    },
  });

  // Get user role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data?.role;
    },
    enabled: !!user?.id
  });

  const isAdmin = userRole === 'admin';

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!opportunity) {
        throw new Error("OpportunityForm can only be used for editing existing opportunities");
      }

      const updateData: any = {
        probability: data.probability ? parseFloat(data.probability) : null,
        expected_close_date: data.expected_close_date || null,
        description: data.description || null,
      };

      // Only allow admin to change owner
      if (isAdmin && data.owner_id) {
        updateData.owner_id = data.owner_id;
      }

      const { error } = await supabase
        .from("opportunities")
        .update(updateData)
        .eq("id", opportunity.id);
      
      if (error) throw error;

      // If admin changed the owner, also update the company owner for consistency
      // Note: The database trigger will also handle this, but this provides frontend validation
      if (isAdmin && data.owner_id && data.owner_id !== opportunity.owner_id) {
        const { error: companyError } = await supabase
          .from("companies")
          .update({ owner_id: data.owner_id })
          .eq("id", opportunity.company_id);
        
        if (companyError) {
          console.warn("Failed to update company owner:", companyError);
          // Don't throw error as the trigger should handle this
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({
        title: "Sucesso",
        description: "Oportunidade atualizada com sucesso",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar oportunidade",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (!opportunity) {
    return (
      <div className="text-center text-muted-foreground">
        Este formulário é apenas para edição de oportunidades existentes.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <strong>Empresa:</strong> {opportunity.companies?.name || "N/A"} | 
            <strong> Título:</strong> {opportunity.title} | 
            <strong> Valor:</strong> {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(opportunity.value)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Probabilidade (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100"
                      placeholder="0" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_close_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Fechamento Esperada</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descreva os detalhes da oportunidade"
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isAdmin && (
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alterar Vendedor Responsável</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salespeople.map((salesperson) => (
                        <SelectItem key={salesperson.id} value={salesperson.id}>
                          {salesperson.name} ({salesperson.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
            💡 Para alterar dados da empresa, título ou valor da oportunidade, vá para a seção "Empresas"
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}