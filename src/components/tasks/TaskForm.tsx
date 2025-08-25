import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  due_date: z.date().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  status: z.string().min(1, "Status é obrigatório"),
  responsible_id: z.string().min(1, "Responsável é obrigatório"),
  project_id: z.string().optional(),
  company_id: z.string().optional(),
  contact_id: z.string().optional(),
  opportunity_id: z.string().optional(),
  estimated_hours: z.string().optional(),
  notes: z.string().optional(),
});

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  onSuccess: () => void;
}

interface Option {
  id: string | number;
  name: string;
}

export function TaskForm({ isOpen, onClose, task, onSuccess }: TaskFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Option[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [contacts, setContacts] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [opportunities, setOpportunities] = useState<Option[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Option[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Option[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      due_date: undefined,
      priority: "",
      type: "",
      status: "Pendente",
      responsible_id: "",
      project_id: "",
      company_id: "",
      contact_id: "",
      opportunity_id: "",
      estimated_hours: "",
      notes: "",
    },
  });

  // Watch for company changes to filter related data
  const selectedCompanyId = form.watch("company_id");

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
      if (task) {
        form.reset({
          name: task.name || "",
          description: task.description || "",
          due_date: task.due_date ? new Date(task.due_date) : undefined,
          priority: task.priority || "",
          type: task.type || "",
          status: task.status || "Pendente",
          responsible_id: task.responsible_id?.toString() || "",
          project_id: task.project_id?.toString() || "",
          company_id: task.company_id?.toString() || "",
          contact_id: task.contact_id?.toString() || "",
          opportunity_id: task.opportunity_id?.toString() || "",
          estimated_hours: task.estimated_hours?.toString() || "",
          notes: task.notes || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          due_date: undefined,
          priority: "",
          type: "",
          status: "Pendente",
          responsible_id: user?.id || "",
          project_id: "",
          company_id: "",
          contact_id: "",
          opportunity_id: "",
          estimated_hours: "",
          notes: "",
        });
      }
    }
  }, [isOpen, task, form]);

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
      
      // Fetch projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, company_id")
        .order("title", { ascending: true });

      // Fetch companies
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });

      // Fetch contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name, company_id")
        .order("name", { ascending: true });

      // Fetch opportunities
      const { data: opportunitiesData } = await supabase
        .from("opportunities")
        .select("id, title, company_id")
        .order("title", { ascending: true });

      // Fetch users
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name")
        .order("name", { ascending: true });

      setProjects(projectsData?.map(p => ({ id: p.id, name: p.title, company_id: p.company_id })) || []);
      setCompanies(companiesData?.map(c => ({ id: c.id, name: c.name })) || []);
      setContacts(contactsData?.map(c => ({ id: c.id, name: c.name, company_id: c.company_id })) || []);
      setOpportunities(opportunitiesData?.map(o => ({ id: o.id, name: o.title, company_id: o.company_id })) || []);
      setUsers(usersData?.map(u => ({ id: u.id, name: u.name })) || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar opções para os campos.",
        variant: "destructive",
      });
    } finally {
      setLoadingOptions(false);
    }
  };

  // Filter related data based on selected company
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== "none" && selectedCompanyId !== "") {
      const companyIdNum = parseInt(selectedCompanyId);
      
      // Filter contacts for selected company
      const companyContacts = contacts.filter(contact => 
        (contact as any).company_id === companyIdNum
      );
      setFilteredContacts(companyContacts);
      
      // Filter opportunities for selected company
      const companyOpportunities = opportunities.filter(opportunity => 
        (opportunity as any).company_id === companyIdNum
      );
      setFilteredOpportunities(companyOpportunities);
      
      // Filter projects for selected company
      const companyProjects = projects.filter(project => 
        (project as any).company_id === companyIdNum
      );
      setFilteredProjects(companyProjects);
      
      // Reset related fields if they're not valid for the new company
      const currentContactId = form.getValues("contact_id");
      const currentOpportunityId = form.getValues("opportunity_id");
      const currentProjectId = form.getValues("project_id");
      
      if (currentContactId && !companyContacts.find(c => c.id.toString() === currentContactId)) {
        form.setValue("contact_id", "");
      }
      
      if (currentOpportunityId && !companyOpportunities.find(o => o.id.toString() === currentOpportunityId)) {
        form.setValue("opportunity_id", "");
      }
      
      if (currentProjectId && !companyProjects.find(p => p.id.toString() === currentProjectId)) {
        form.setValue("project_id", "");
      }
    } else {
      // Show all options when no company is selected
      setFilteredContacts(contacts);
      setFilteredOpportunities(opportunities);
      setFilteredProjects(projects);
    }
  }, [selectedCompanyId, contacts, opportunities, projects, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    try {
      setIsLoading(true);

      const taskData = {
        name: values.name,
        description: values.description || null,
        due_date: values.due_date ? values.due_date.toISOString() : null,
        priority: values.priority || null,
        type: values.type || null,
        status: values.status,
        project_id: values.project_id && values.project_id !== "" && values.project_id !== "none" ? parseInt(values.project_id) : null,
        company_id: values.company_id && values.company_id !== "" && values.company_id !== "none" ? parseInt(values.company_id) : null,
        contact_id: values.contact_id && values.contact_id !== "" && values.contact_id !== "none" ? parseInt(values.contact_id) : null,
        opportunity_id: values.opportunity_id && values.opportunity_id !== "" && values.opportunity_id !== "none" ? parseInt(values.opportunity_id) : null,
        responsible_id: values.responsible_id,
        estimated_hours: values.estimated_hours && values.estimated_hours !== "" ? parseFloat(values.estimated_hours) : null,
        notes: values.notes || null,
      };

      let error;
      if (task) {
        const { error: updateError } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("tasks")
          .insert([taskData]);
        error = insertError;
      }

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: task ? "Tarefa atualizada com sucesso!" : "Tarefa criada com sucesso!",
      });

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Adicionar Nova Tarefa"}</DialogTitle>
          <DialogDescription>
            {task ? "Atualize as informações da tarefa." : "Preencha os campos abaixo para criar uma nova tarefa."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção: Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome da tarefa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Digite uma descrição para a tarefa"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Vencimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo Estimado (horas)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0"
                          placeholder="Ex: 2.5" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seção: Classificação */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Classificação</h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ligação">Ligação</SelectItem>
                          <SelectItem value="Reunião">Reunião</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Apresentação">Apresentação</SelectItem>
                          <SelectItem value="Negociação">Negociação</SelectItem>
                          <SelectItem value="Proposta">Proposta</SelectItem>
                          <SelectItem value="Visita">Visita</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="responsible_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Primeira linha: Empresa */}
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa/Lead *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma empresa ou lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto">
                        <SelectItem value="none">Nenhuma</SelectItem>
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

              {/* Segunda linha: Contato e Oportunidade */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedCompanyId && selectedCompanyId !== "none" ? "Selecione um contato" : "Selecione uma empresa primeiro"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto">
                          <SelectItem value="none">Nenhum</SelectItem>
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
                  name="opportunity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oportunidade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedCompanyId && selectedCompanyId !== "none" ? "Selecione uma oportunidade" : "Selecione uma empresa primeiro"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto">
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {filteredOpportunities.map((opportunity) => (
                            <SelectItem key={opportunity.id} value={opportunity.id.toString()}>
                              {opportunity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Terceira linha: Projeto */}
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedCompanyId && selectedCompanyId !== "none" ? "Selecione um projeto" : "Selecione uma empresa primeiro"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto">
                        <SelectItem value="none">Nenhum</SelectItem>
                        {filteredProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção: Observações Adicionais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Observações Adicionais</h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas/Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adicione observações, links, ou informações adicionais relevantes para esta tarefa"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : task ? "Atualizar" : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}