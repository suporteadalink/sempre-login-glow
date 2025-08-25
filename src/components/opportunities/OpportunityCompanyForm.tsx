import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useSalespeople } from "@/hooks/useSalespeople";
import { useAuth } from "@/components/auth/AuthProvider";

// Utility functions from CompanyForm
const isValidCNPJ = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1*$/.test(cnpj)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = cnpj.slice(0, 12).split('').reduce((acc, digit, i) => acc + parseInt(digit) * weights1[i], 0);
  let remainder = sum % 11;
  let checkDigit1 = remainder < 2 ? 0 : 11 - remainder;
  
  sum = cnpj.slice(0, 13).split('').reduce((acc, digit, i) => acc + parseInt(digit) * weights2[i], 0);
  remainder = sum % 11;
  let checkDigit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cnpj[12]) === checkDigit1 && parseInt(cnpj[13]) === checkDigit2;
};

const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatCurrency = (value: string): string => {
  const num = parseFloat(value.replace(/[^\d]/g, '')) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num || 0);
};

const parseCurrency = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, '');
  return (parseFloat(numbers) / 100).toString();
};

// Company size options
const companySizeOptions = [
  { value: "Microempresa", label: "Microempresa" },
  { value: "Pequena", label: "Pequena" },
  { value: "Média", label: "Média" },
  { value: "Grande", label: "Grande" }
];

// Brazilian states
const brazilianStates = [
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

// Contact schema
const contactItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string()
    .min(1, "Telefone é obrigatório")
    .transform(formatPhone)
    .refine((val) => val.replace(/\D/g, '').length >= 10, "Telefone deve ter pelo menos 10 dígitos"),
  role: z.string().min(1, "Cargo é obrigatório")
});

// Optional contact schema
const optionalContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  role: z.string()
}).refine((contact) => {
  const hasAnyField = contact.name || contact.phone || contact.role;
  if (!hasAnyField) return true;
  
  try {
    contactItemSchema.parse(contact);
    return true;
  } catch {
    return false;
  }
}, {
  message: "Se preencher algum campo do contato, todos os campos são obrigatórios"
});

// Unified form schema
const opportunityCompanySchema = z.object({
  // Company data
  name: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório").refine((val) => {
    return isValidCNPJ(val);
  }, {
    message: "CNPJ inválido. Verifique os dígitos digitados."
  }),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().optional(),
  sector: z.string().optional(),
  size: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  annual_revenue: z.string().min(1, "Receita anual é obrigatória"),
  
  // Contacts (3 contacts, first mandatory)
  contacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    role: z.string()
  })).length(3).refine((contacts) => {
    const firstContact = contacts[0];
    
    // First contact must be complete
    if (!firstContact.name || !firstContact.phone || !firstContact.role) {
      return false;
    }
    
    // Validate first contact phone
    const firstContactPhone = firstContact.phone.replace(/\D/g, '');
    if (firstContactPhone.length !== 10 && firstContactPhone.length !== 11) {
      return false;
    }
    
    // Other contacts validation (if any field is filled, all must be filled)
    for (let i = 1; i < contacts.length; i++) {
      const contact = contacts[i];
      const hasAnyField = contact.name || contact.phone || contact.role;
      
      if (hasAnyField) {
        if (!contact.name || !contact.phone || !contact.role) {
          return false;
        }
        const cleanPhone = contact.phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
          return false;
        }
      }
    }
    
    return true;
  }, {
    path: ["contacts", 0],
    message: "Primeiro contato é obrigatório com todos os campos preenchidos."
  }),
  
  // Opportunity data
  opportunity_title: z.string().min(1, "Título da oportunidade é obrigatório"),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  description: z.string().optional(),
  owner_id: z.string().optional()
});

type OpportunityCompanyFormData = z.infer<typeof opportunityCompanySchema>;

interface OpportunityCompanyFormProps {
  onSuccess: () => void;
}

export function OpportunityCompanyForm({ onSuccess }: OpportunityCompanyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: salespeople = [] } = useSalespeople();

  const form = useForm<OpportunityCompanyFormData>({
    resolver: zodResolver(opportunityCompanySchema),
    defaultValues: {
      name: "",
      cnpj: "",
      phone: "",
      email: "",
      website: "",
      sector: "",
      size: "",
      city: "",
      state: "",
      annual_revenue: "",
      contacts: [
        { name: "", phone: "", role: "" },
        { name: "", phone: "", role: "" },
        { name: "", phone: "", role: "" }
      ],
      opportunity_title: "",
      probability: "",
      expected_close_date: "",
      description: "",
      owner_id: ""
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

  // Get first pipeline stage (Novo Lead)
  const { data: firstStage } = useQuery({
    queryKey: ["first-pipeline-stage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id")
        .order("order")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: OpportunityCompanyFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!firstStage) throw new Error("Primeiro estágio do pipeline não encontrado");

      // Determine opportunity owner (admin can assign, vendedor uses own id)
      const opportunityOwnerId = isAdmin && data.owner_id ? data.owner_id : user.id;

      console.log('DEBUG: OpportunityCompanyForm creating company with data:', {
        isAdmin,
        currentUserId: user.id,
        formOwnerId: data.owner_id,
        finalOwnerId: opportunityOwnerId,
        authSession: await supabase.auth.getSession()
      });

      // Start transaction - create company first
      const companyData = {
        name: data.name,
        cnpj: data.cnpj,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        sector: data.sector || null,
        size: data.size || null,
        city: data.city || null,
        state: data.state || null,
        annual_revenue: parseFloat(data.annual_revenue) / 100, // Fix currency conversion
        type: "Lead", // Always start as Lead
        owner_id: opportunityOwnerId, // Ensure company and opportunity have same owner
      };

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert([companyData])
        .select()
        .single();

      if (companyError) throw companyError;

      // Create contacts
      const validContacts = data.contacts.filter(contact => 
        contact.name && contact.phone && contact.role
      );

      const contactsToInsert = validContacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        role: contact.role,
        company_id: company.id,
        owner_id: opportunityOwnerId, // Ensure contacts have same owner as opportunity
      }));

      const { data: createdContacts, error: contactsError } = await supabase
        .from("contacts")
        .insert(contactsToInsert)
        .select();

      if (contactsError) throw contactsError;

      // Create opportunity
      const opportunityData = {
        title: data.opportunity_title, // Custom opportunity title
        value: parseFloat(data.annual_revenue) / 100, // Fix currency conversion for opportunity
        probability: data.probability ? parseFloat(data.probability) : null,
        expected_close_date: data.expected_close_date || null,
        description: data.description || null,
        company_id: company.id,
        contact_id: createdContacts[0]?.id || null, // First contact
        stage_id: firstStage.id, // Always "Novo Lead"
        owner_id: opportunityOwnerId,
      };

      const { error: opportunityError } = await supabase
        .from("opportunities")
        .insert([opportunityData]);

      if (opportunityError) throw opportunityError;

      return { company, contacts: createdContacts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Sucesso",
        description: "Novo lead criado com sucesso",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Error creating opportunity with company:", error);
      
      // Check for specific error types
      let errorMessage = "Erro ao criar novo lead";
      
      if (error?.message?.includes("duplicate key value violates unique constraint \"companies_cnpj_key\"")) {
        errorMessage = "Já existe uma empresa cadastrada com este CNPJ. Verifique se a empresa já não está registrada no sistema.";
      } else if (error?.message?.includes("companies_cnpj_key")) {
        errorMessage = "CNPJ já cadastrado no sistema.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: OpportunityCompanyFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados da Empresa */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da empresa" {...field} />
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
                      onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
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
                  <FormLabel>Receita Anual (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite a receita anual"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        field.onChange(value);
                      }}
                      value={field.value ? formatCurrency(field.value) : ''}
                    />
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
                    <Input 
                      placeholder="(00) 00000-0000"
                      {...field}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
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
                    <Input placeholder="www.empresa.com" {...field} />
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
                    <Input placeholder="Ex: Tecnologia" {...field} />
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
                  <FormLabel>Tamanho</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tamanho" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companySizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite a cidade" {...field} />
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
                    <SelectContent>
                      {brazilianStates.map((state) => (
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
          </div>
        </div>

        <Separator />

        {/* Contatos */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contatos (Primeiro obrigatório)</h3>
          <div className="space-y-6">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Contato {index + 1} {index === 0 && "(Obrigatório)"}
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
                            placeholder="(00) 00000-0000"
                            {...field}
                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
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
                          <Input placeholder="Ex: Gerente" {...field} />
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

        <Separator />

        {/* Detalhes da Oportunidade */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Detalhes da Oportunidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="opportunity_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Oportunidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título da oportunidade" {...field} />
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
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Fechamento Esperada</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mt-4">
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
                <FormItem className="mt-4">
                  <FormLabel>Vendedor Responsável</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Atribuir a um vendedor (deixe vazio para você mesmo)" />
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
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Criando..." : "Criar Novo Lead"}
          </Button>
        </div>
      </form>
    </Form>
  );
}