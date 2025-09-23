import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSalespeople } from "@/hooks/useSalespeople";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";

// Lista de estados brasileiros
const BRAZILIAN_STATES = [
  { value: "AC", label: "AC - Acre" },
  { value: "AL", label: "AL - Alagoas" },
  { value: "AP", label: "AP - Amapá" },
  { value: "AM", label: "AM - Amazonas" },
  { value: "BA", label: "BA - Bahia" },
  { value: "CE", label: "CE - Ceará" },
  { value: "DF", label: "DF - Distrito Federal" },
  { value: "ES", label: "ES - Espírito Santo" },
  { value: "GO", label: "GO - Goiás" },
  { value: "MA", label: "MA - Maranhão" },
  { value: "MT", label: "MT - Mato Grosso" },
  { value: "MS", label: "MS - Mato Grosso do Sul" },
  { value: "MG", label: "MG - Minas Gerais" },
  { value: "PA", label: "PA - Pará" },
  { value: "PB", label: "PB - Paraíba" },
  { value: "PR", label: "PR - Paraná" },
  { value: "PE", label: "PE - Pernambuco" },
  { value: "PI", label: "PI - Piauí" },
  { value: "RJ", label: "RJ - Rio de Janeiro" },
  { value: "RN", label: "RN - Rio Grande do Norte" },
  { value: "RS", label: "RS - Rio Grande do Sul" },
  { value: "RO", label: "RO - Rondônia" },
  { value: "RR", label: "RR - Roraima" },
  { value: "SC", label: "SC - Santa Catarina" },
  { value: "SP", label: "SP - São Paulo" },
  { value: "SE", label: "SE - Sergipe" },
  { value: "TO", label: "TO - Tocantins" }
];

// Função para validar CNPJ - agora sempre retorna true (campo opcional)
export const isValidCNPJ = (cnpj: string): boolean => {
  // CNPJ é opcional e aceita qualquer formato
  return true;
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

// Função para formatar telefone brasileiro (aceita qualquer número de dígitos)
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  
  // Se tem 10 dígitos: (11) 3385-1277
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  // Se tem 11 dígitos: (11) 93385-1277  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  // Para outros tamanhos, aplica formatação básica
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 6) {
    return numbers.replace(/(\d{2})(\d+)/, '($1) $2');
  } else if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  } else {
    // Para números com mais de 11 dígitos, usa formato celular
    return numbers.replace(/(\d{2})(\d{5})(\d{4})(\d*)/, '($1) $2-$3$4');
  }
};

// Função para validar telefone
const isValidPhone = (phone: string): boolean => {
  if (!phone || phone.trim() === "") return true; // Campo opcional
  // Aceita formatos: (11) 3385-1277, (11) 93385-1277 ou variações
  return /^\(\d{2}\) \d{4,5}-?\d{4}$/.test(phone);
};

// Função para formatar valor monetário
const formatCurrency = (value: string | number | null | undefined): string => {
  if (value == null || value === '') return '';
  const str = String(value);
  const numbers = str.replace(/\D/g, '');
  if (numbers === '') return '';
  const amount = Number(numbers) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(amount);
};

const parseCurrency = (value: string): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const numbers = value.replace(/\D/g, '');
  if (numbers === '') return undefined;
  const parsed = Number(numbers) / 100;
  return parsed;
};

// Função para formatar URL de website
const formatWebsite = (value: string): string => {
  if (!value) return value;
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return `https://${value}`;
  }
  return value;
};

// Função para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função para validar URL
const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Schema individual para cada contato
// Schema para contato completo (usado quando há dados)
const contactItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string()
    .min(10, "Telefone é obrigatório")
    .max(20, "Telefone muito longo")
    .regex(/^\(\d{2}\) \d{4,5}-?\d{4}$/, "Formato: (11) 93385-1277 ou similar"),
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
  name: z.string().optional(),
  cnpj: z.string().optional(),
  sector: z.string().optional(),
  size: z.string().optional(),
  number_of_employees: z.number().optional(),
  annual_revenue: z.number().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  type: z.string().optional(),
  owner_id: z.string().optional(),
  stage_id: z.string().optional(),
  opportunity_title: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string().optional(),
    phone: z.string().optional(), 
    role: z.string().optional()
  })).length(3).optional()
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
  owner_id: string | null;
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

  // Fetch contacts when editing a company
  const { data: companyContacts = [] } = useQuery({
    queryKey: ["company-contacts", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id
  });

  useEffect(() => {
    if (company) {
      // Prepare contacts array with existing contacts + empty slots
      const contactsArray = [
        { name: "", phone: "", role: "" },
        { name: "", phone: "", role: "" },
        { name: "", phone: "", role: "" }
      ];
      
      // Fill with existing contacts
      companyContacts.forEach((contact, index) => {
        if (index < 3) {
          contactsArray[index] = {
            name: contact.name || "",
            phone: contact.phone || "",
            role: contact.role || ""
          };
        }
      });

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
        owner_id: company.owner_id || "",
        stage_id: "",
        opportunity_title: "",
        contacts: contactsArray
      });
    }
  }, [company, companyContacts, form]);

  // Initialize owner_id with current user when not editing
  useEffect(() => {
    if (!company && user?.id && isAdmin) {
      form.setValue("owner_id", user.id);
    }
  }, [user?.id, isAdmin, company, form]);

  const onSubmit = async (data: CompanyFormData) => {
    console.log('🔍 DEBUG: Form submit iniciado', data);
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
        name: data.name || "Nova Empresa",
        email: data.email || null,
        cnpj: data.cnpj || null,
        sector: data.sector || null,
        size: data.size || null,
        city: data.city || null,
        state: data.state || null,
        phone: data.phone || null,
        website: data.website || null,
        type: data.type || "Lead",
        number_of_employees: data.number_of_employees || null,
        annual_revenue: data.annual_revenue || null,
        owner_id: companyOwnerId,
        stage_id: data.stage_id ? parseInt(data.stage_id) : null,
      };

      console.log('🔍 DEBUG: Submit data with stage_id:', {
        type: data.type,
        stage_id: data.stage_id,
        parsed_stage_id: data.stage_id ? parseInt(data.stage_id) : null,
        submitData
      });

      if (company) {
        const { error } = await supabase
          .from('companies')
          .update(submitData)
          .eq('id', company.id);

        if (error) throw error;

        // Update contacts for existing company
        // First, delete existing contacts
        await supabase
          .from('contacts')
          .delete()
          .eq('company_id', company.id);

        // Then, create new contacts
        const validContacts = data.contacts?.filter(contact => 
          contact?.name?.trim() || contact?.phone?.trim() || contact?.role?.trim()
        ) || [];

        if (validContacts.length > 0) {
          for (const contact of validContacts) {
            const { error: contactError } = await supabase
              .from('contacts')
              .insert({
                name: contact.name || "",
                phone: contact.phone || "",
                role: contact.role || "",
                company_id: company.id,
                owner_id: companyOwnerId
              });

            if (contactError) throw contactError;
          }
        }

        toast({
          title: "Sucesso",
          description: "Empresa e contatos atualizados com sucesso.",
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
        const validContacts = data.contacts?.filter(contact => 
          contact?.name?.trim() || contact?.phone?.trim() || contact?.role?.trim()
        ) || [];

        let createdContacts = [];
        if (validContacts.length > 0) {
          for (const contact of validContacts) {
            const { data: createdContact, error: contactError } = await supabase
              .from('contacts')
              .insert({
                name: contact.name || "",
                phone: contact.phone || "",
                role: contact.role || "",
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
        if (data.type === "Lead" && data.stage_id) {
          // Use company name as opportunity title if not provided
          const opportunityTitle = data.opportunity_title?.trim() || submitData.name;
          
          const { error: opportunityError } = await supabase
            .from('opportunities')
            .insert({
              title: opportunityTitle,
              value: data.annual_revenue || 0,
              company_id: newCompany.id,
              contact_id: createdContacts.length > 0 ? createdContacts[0].id : null,
              stage_id: parseInt(data.stage_id),
              owner_id: companyOwnerId,
              description: `Oportunidade criada automaticamente para empresa ${submitData.name}`
            });

          if (opportunityError) throw opportunityError;

          toast({
            title: "Sucesso",
            description: `Empresa criada com oportunidade "${opportunityTitle}" e ${validContacts.length} contato(s).`,
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
      queryClient.invalidateQueries({ queryKey: ["lead-companies"] }); // Add this new query key
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
        <form onSubmit={(e) => {
          console.log('🔍 DEBUG: Form onSubmit disparado');
          form.handleSubmit(onSubmit)(e);
        }} className="space-y-4">
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
                  <FormLabel>CNPJ (Opcional)</FormLabel>
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
                      placeholder="R$ 0,00" 
                      value={field.value !== undefined && field.value !== null ? formatCurrency((field.value * 100).toString()) : ''}
                      onChange={(e) => {
                        const parsedValue = parseCurrency(e.target.value);
                        field.onChange(parsedValue);
                      }}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto">
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(11) 93385-1277" 
                      {...field}
                      onChange={(e) => {
                        const formattedValue = formatPhone(e.target.value);
                        field.onChange(formattedValue);
                        form.trigger("phone");
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
                    <Input 
                      placeholder="empresa.com" 
                      {...field}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const formattedValue = formatWebsite(e.target.value);
                          field.onChange(formattedValue);
                          form.trigger("website");
                        }
                      }}
                    />
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
                      <FormLabel>Título da Oportunidade</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Deixe vazio para usar o nome da empresa" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Se não especificar, será usado o nome da empresa como título da oportunidade.
                      </FormDescription>
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
                    Contato {index + 1}
                    <span className="text-muted-foreground text-sm ml-2">(Opcional)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
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
                          <FormLabel>Telefone</FormLabel>
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
                          <FormLabel>Cargo</FormLabel>
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
              disabled={loading}
              onClick={(e) => {
                console.log('🔍 DEBUG: Botão salvar clicado');
                console.log('🔍 DEBUG: Form errors:', form.formState.errors);
                console.log('🔍 DEBUG: Form isValid:', form.formState.isValid);
                console.log('🔍 DEBUG: Form values:', form.getValues());
              }}
            >
              {loading ? "Salvando..." : company ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}