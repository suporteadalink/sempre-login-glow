import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const proposalSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  company_id: z.string().min(1, "Cliente é obrigatório"),
  value: z.number().min(0, "Valor deve ser positivo").optional(),
  status: z.string().optional(),
  pdf_file: z.instanceof(File).optional().or(z.literal(undefined)),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface Proposal {
  id: number;
  title: string;
  value: number | null;
  status: string | null;
  company_id: number | null;
  owner_id: string;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
}

interface ProposalFormProps {
  proposal?: Proposal | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProposalForm({ proposal, onSuccess, onCancel }: ProposalFormProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: proposal?.title || "",
      company_id: proposal?.company_id?.toString() || "",
      value: proposal?.value || undefined,
      status: proposal?.status || "Rascunho",
    },
  });

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as empresas.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const uploadPDF = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('propostas-pdf')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('propostas-pdf')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do PDF.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProposalFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let pdfUrl = null;
      if (data.pdf_file) {
        pdfUrl = await uploadPDF(data.pdf_file);
        if (!pdfUrl) {
          throw new Error('Falha no upload do PDF');
        }
      }

      const proposalData = {
        title: data.title,
        company_id: parseInt(data.company_id),
        value: data.value || null,
        status: data.status || "Rascunho",
        owner_id: user.id,
        pdf_url: pdfUrl,
      };

      if (proposal) {
        const { error } = await supabase
          .from('proposals' as any)
          .update(proposalData)
          .eq('id', proposal.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Proposta atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('proposals' as any)
          .insert([proposalData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Proposta criada com sucesso.",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a proposta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>
          {proposal ? "Editar Proposta" : "Nova Proposta"}
        </DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o título da proposta" {...field} />
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
                <FormLabel>Cliente *</FormLabel>
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
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                    <SelectItem value="Enviada">Enviada</SelectItem>
                    <SelectItem value="Aceita">Aceita</SelectItem>
                    <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pdf_file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anexar Proposta em PDF</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      field.onChange(file);
                    }}
                    disabled={uploading}
                  />
                </FormControl>
                <FormMessage />
                {uploading && (
                  <p className="text-sm text-muted-foreground">
                    Enviando arquivo...
                  </p>
                )}
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : proposal ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}