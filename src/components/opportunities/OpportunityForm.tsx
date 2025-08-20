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

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.string().min(1, "Valor é obrigatório"),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  description: z.string().optional(),
  company_id: z.string().min(1, "Cliente é obrigatório"),
  contact_id: z.string().optional(),
  stage_id: z.string().min(1, "Etapa é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

interface OpportunityFormProps {
  opportunity?: any;
  onSuccess: () => void;
}

export function OpportunityForm({ opportunity, onSuccess }: OpportunityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: opportunity?.title || "",
      value: opportunity?.value?.toString() || "",
      probability: opportunity?.probability?.toString() || "",
      expected_close_date: opportunity?.expected_close_date || "",
      description: opportunity?.description || "",
      company_id: opportunity?.company_id?.toString() || "",
      contact_id: opportunity?.contact_id?.toString() || "",
      stage_id: opportunity?.stage_id?.toString() || "",
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, company_id")
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, name")
        .order("order");
      
      if (error) throw error;
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const opportunityData = {
        title: data.title,
        value: parseFloat(data.value),
        probability: data.probability ? parseFloat(data.probability) : null,
        expected_close_date: data.expected_close_date || null,
        description: data.description || null,
        company_id: parseInt(data.company_id),
        contact_id: data.contact_id ? parseInt(data.contact_id) : null,
        stage_id: parseInt(data.stage_id),
        owner_id: user.id,
      };

      if (opportunity) {
        const { owner_id, ...updateData } = opportunityData;
        const { error } = await supabase
          .from("opportunities")
          .update(updateData)
          .eq("id", opportunity.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("opportunities")
          .insert([opportunityData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({
        title: "Sucesso",
        description: opportunity 
          ? "Oportunidade atualizada com sucesso" 
          : "Oportunidade criada com sucesso",
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

  // Filter contacts based on selected company
  const selectedCompanyId = form.watch("company_id");
  const filteredContacts = contacts.filter(
    contact => !selectedCompanyId || contact.company_id?.toString() === selectedCompanyId
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o título da oportunidade" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contato</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stage_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etapa do Pipeline</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma etapa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id.toString()}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}