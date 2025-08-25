import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSalespeople } from "@/hooks/useSalespeople";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";

// Função para validar CNPJ usando o algoritmo oficial brasileiro
const isValidCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais (ex: 11111111111111)
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  
  if (parseInt(cleanCNPJ[12]) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  
  return parseInt(cleanCNPJ[13]) === digit2;
};

// Função para formatar CNPJ
const formatCNPJ = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '');
  return cleanValue
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

// Função para formatar telefone brasileiro (10 ou 11 dígitos)
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    // Telefone fixo: (11) 3385-1277
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  // Celular: (11) 93385-1277
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

// Schema individual para cada contato
// Schema para contato completo (usado quando há dados)
const contactItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string()
    .min(14, "Telefone é obrigatório")
    .max(15, "Telefone inválido")
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Formato: (11) 93385-1277"),
  role: z.string().min(1, "Cargo é obrigatório")
});

// Schema para contato que pode estar vazio
const optionalContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  role: z.string()
}).refine((contact) => {
  // Se qualquer campo estiver preenchido, todos devem estar preenchidos
  const hasAnyField = contact.name || contact.phone || contact.role;
  if (!hasAnyField) return true; // Contato completamente vazio é válido
  
  // Se há algum campo, valida como contato completo
  try {
    contactItemSchema.parse(contact);
    return true;
  } catch {
    return false;
  }
}, {
  message: "Se preencher algum campo do contato, todos os campos são obrigatórios"
});

const companySchema = z.object({
  name: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório").refine((val) => {
    return isValidCNPJ(val);
  }, {
    message: "CNPJ inválido. Verifique os dígitos digitados."
  }),
  sector: z.string().optional(),
  size: z.string().optional(),
  number_of_employees: z.number().optional(),
  annual_revenue: z.number().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().optional(),
  type: z.string().min(1, "Tipo é obrigatório"),
  // Campos específicos para Lead
  owner_id: z.string().optional(),
  stage_id: z.string().optional(),
  opportunity_title: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    role: z.string()
  })).length(3).refine((contacts) => {
    // Primeiro contato deve estar completo
    const firstContact = contacts[0];
    if (!firstContact.name || !firstContact.phone || !firstContact.role) {
      return false;
    }
    
    // Validar primeiro contato
    try {
      contactItemSchema.parse(firstContact);
    } catch {
      return false;
    }
    
    // Validar outros contatos (se preenchidos)
    for (let i = 1; i < contacts.length; i++) {
      const contact = contacts[i];
      const hasAnyField = contact.name || contact.phone || contact.role;
      
      if (hasAnyField) {
        try {
          contactItemSchema.parse(contact);
        } catch {
          return false;
        }
      }
    }
    
    return true;
  }, {
    message: "Primeiro contato é obrigatório. Se preencher outros contatos, todos os campos são obrigatórios."
  })
}).refine((data) => {
  // Se tipo é Lead, título da oportunidade é obrigatório
  if (data.type === "Lead" && !data.opportunity_title?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Título da oportunidade é obrigatório para empresas do tipo Lead",
  path: ["opportunity_title"]
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Company {
  id: number;
  name: string;
  cnpj: string | null;
  city: string | null;
  type: string | null;
  sector: string | null;
  size: string | null;
  number_of_employees: number | null;
  annual_revenue: number | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

interface CompanyFormProps {
  company?: Company | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: salespeople = [] } = useSalespeople();
  const { data: pipelineStages = [] } = usePipelineStages();

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

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      cnpj: "",
      sector: "",
      size: "",
      number_of_employees: undefined,
      annual_revenue: undefined,
      city: "",
      state: "",
      phone: "",
      email: "",
      website: "",
      type: "",
      owner_id: "",
      stage_id: "",
      opportunity_title: "",
      contacts: [
        { name: "", phone: "", role: "" },
        { name: "", phone: "", role: "" },
        { name: "", phone: "", role: "" }
      ]
    },
  });

  // Watch the type field to show/hide Lead-specific fields
  const watchedType = form.watch("type");

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        cnpj: company.cnpj || "",
        sector: company.sector || "",
        size: company.size || "",
        number_of_employees: company.number_of_employees || undefined,
        annual_revenue: company.annual_revenue || undefined,
        city: company.city || "",
        state: company.state || "",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        type: company.type || "",
        owner_id: "",
        stage_id: "",
        opportunity_title: "",
        contacts: [
          { name: "", phone: "", role: "" },
          { name: "", phone: "", role: "" },
          { name: "", phone: "", role: "" }
        ]
      });
    }
  }, [company, form]);

  // Initialize owner_id with current user when not editing
  useEffect(() => {
    if (!company && user?.id && isAdmin) {
      form.setValue("owner_id", user.id);
    }
  }, [user?.id, isAdmin, company, form]);

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Usuário não autenticado");

      // Determine company owner (admin can assign, vendedor = current user)
      const companyOwnerId = isAdmin && data.owner_id && data.owner_id.trim() !== "" ? data.owner_id : currentUser.id;
      
      console.log('DEBUG: Creating company with data:', {
        isAdmin,
        currentUserId: currentUser.id,
        formOwnerId: data.owner_id,
        finalOwnerId: companyOwnerId,
        authSession: await supabase.auth.getSession()
      });

      const submitData = {
        name: data.name,
        email: data.email || null,
        cnpj: data.cnpj || null,
        sector: data.sector || null,
        size: data.size || null,
        city: data.city || null,
        state: data.state || null,
        phone: data.phone || null,
        website: data.website || null,
        type: data.type || null,
        number_of_employees: data.number_of_employees || null,
        annual_revenue: data.annual_revenue || null,
        owner_id: companyOwnerId,
      };

      if (company) {
        const { error } = await supabase
          .from('companies')
          .update(submitData)
          .eq('id', company.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Empresa atualizada com sucesso.",
        });
      } else {
        // Create company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert(submitData)
          .select()
          .single();

        if (companyError) throw companyError;

        // Create contacts
        const validContacts = data.contacts.filter(contact => 
          contact.name.trim() !== "" || contact.phone.trim() !== "" || contact.role.trim() !== ""
        );

        let createdContacts = [];
        if (validContacts.length > 0) {
          for (const contact of validContacts) {
            const validatedContact = contactItemSchema.parse(contact);
            const { data: createdContact, error: contactError } = await supabase
              .from('contacts')
              .insert({
                name: validatedContact.name,
                phone: validatedContact.phone,
                role: validatedContact.role,
                company_id: newCompany.id,
                owner_id: companyOwnerId
              })
              .select()
              .single();

            if (contactError) throw contactError;
            if (createdContact) createdContacts.push(createdContact);
          }
        }

        // If type is Lead, create opportunity automatically
        if (data.type === "Lead" && data.opportunity_title && data.stage_id) {
          const { error: opportunityError } = await supabase
            .from('opportunities')
            .insert({
              title: data.opportunity_title,
              value: data.annual_revenue || 0,
              company_id: newCompany.id,
              contact_id: createdContacts.length > 0 ? createdContacts[0].id : null,
              stage_id: parseInt(data.stage_id),
              owner_id: companyOwnerId,
              description: `Oportunidade criada automaticamente para empresa ${data.name}`
            });

          if (opportunityError) throw opportunityError;

          toast({
            title: "Sucesso",
            description: `Empresa Lead criada com oportunidade "${data.opportunity_title}" e ${validContacts.length} contato(s).`,
          });
        } else {
          toast({
            title: "Sucesso",
            description: `Empresa criada com ${validContacts.length} contato(s) adicionado(s).`,
          });
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      onSuccess();
    } catch (error: any) {
      console.error('Error saving company:', error);
      
      let errorMessage = "Não foi possível salvar a empresa.";
      
      if (error?.code === '23505') {
        if (error.message?.includes('companies_name_unique')) {
          errorMessage = "Erro: Já existe uma empresa cadastrada com este nome.";
        } else {
          errorMessage = "Erro: Já existe uma empresa cadastrada com este Nome ou CNPJ.";
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {company ? "Editar Empresa" : "Adicionar Nova Empresa"}
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="00.000.000/0000-00" 
                      {...field}
                      onChange={(e) => {
                        const formattedValue = formatCNPJ(e.target.value);
                        field.onChange(formattedValue);
                        // Força a validação imediata do campo
                        form.trigger("cnpj");
                      }}
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sector"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor</FormLabel>
                  <FormControl>
                    <Input placeholder="Setor de atividade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porte</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o porte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Micro">Microempresa</SelectItem>
                      <SelectItem value="Pequena">Pequena</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number_of_employees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº de Funcionários</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annual_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receita Anual</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      step="0.01"
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
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input placeholder="Estado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos específicos para admin */}
            {isAdmin && (
              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o vendedor (deixe vazio para você mesmo)" />
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

            {/* Campos específicos para Lead */}
            {watchedType === "Lead" && (
              <>
                <FormField
                  control={form.control}
                  name="stage_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etapa do Funil</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={pipelineStages.find(stage => stage.name === "Novo Lead")?.id.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a etapa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pipelineStages.map((stage) => (
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

                <FormField
                  control={form.control}
                  name="opportunity_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Oportunidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título da oportunidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          {/* Seção de Contatos */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Contatos da Empresa</h3>
            <div className="space-y-6">
              {[0, 1, 2].map((index) => (
                <div key={index} className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-3">
                    Contato {index + 1} {index === 0 && <span className="text-destructive">*</span>}
                    {index > 0 && <span className="text-muted-foreground text-sm">(Opcional)</span>}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome {index === 0 && "*"}</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do contato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone {index === 0 && "*"}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(11) 93385-1277" 
                              {...field}
                              onChange={(e) => {
                                const formattedValue = formatPhone(e.target.value);
                                field.onChange(formattedValue);
                                form.trigger(`contacts.${index}.phone`);
                              }}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.role`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo {index === 0 && "*"}</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Diretor Comercial" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !form.formState.isValid}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}