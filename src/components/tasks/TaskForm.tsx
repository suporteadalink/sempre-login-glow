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
  project_id: z.string().optional(),
  company_id: z.string().optional(),
  contact_id: z.string().optional(),
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
      project_id: "",
      company_id: "",
      contact_id: "",
    },
  });

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
          project_id: task.project_id?.toString() || "",
          company_id: task.company_id?.toString() || "",
          contact_id: task.contact_id?.toString() || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          due_date: undefined,
          priority: "",
          type: "",
          status: "Pendente",
          project_id: "",
          company_id: "",
          contact_id: "",
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
        .select("id, title")
        .order("title", { ascending: true });

      // Fetch companies
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });

      // Fetch contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name")
        .order("name", { ascending: true });

      setProjects(projectsData?.map(p => ({ id: p.id, name: p.title })) || []);
      setCompanies(companiesData?.map(c => ({ id: c.id, name: c.name })) || []);
      setContacts(contactsData?.map(c => ({ id: c.id, name: c.name })) || []);
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
        project_id: values.project_id && values.project_id !== "" ? parseInt(values.project_id) : null,
        company_id: values.company_id && values.company_id !== "" ? parseInt(values.company_id) : null,
        contact_id: values.contact_id && values.contact_id !== "" ? parseInt(values.contact_id) : null,
        responsible_id: user.id,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Adicionar Nova Tarefa"}</DialogTitle>
          <DialogDescription>
            {task ? "Atualize as informações da tarefa." : "Preencha os campos abaixo para criar uma nova tarefa."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
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

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {projects.map((project) => (
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

                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
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
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {contacts.map((contact) => (
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
              </div>
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