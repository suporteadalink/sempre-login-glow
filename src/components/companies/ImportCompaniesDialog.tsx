import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Download, Upload, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useSalespeople } from '@/hooks/useSalespeople';
import { useQuery } from '@tanstack/react-query';

interface ImportRecord {
  data: any;
  status: 'valid' | 'error';
  errors: string[];
  contact_name?: string;
  contact_phone?: string;
  contact_cargo?: string;
  gerente?: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  warnings: number;
  details: Array<{
    row: number;
    status: 'success' | 'error';
    message: string;
  }>;
}

interface ImportCompaniesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REQUIRED_COLUMNS = ['name'];

const COLUMN_MAPPING: Record<string, string> = {
  // Mapeamento específico para os campos da planilha do usuário
  'nome completo da empresa': 'name',
  'cnpj': 'cnpj',
  'cidade': 'city',
  'estado': 'state',
  'e-mail': 'email',
  'telefone': 'phone',
  'gerente': 'gerente',
  'nome completo do profissional': 'contact_name',
  'dd': 'contact_dd',
  'celular': 'contact_celular',
  'cargo': 'contact_cargo',
  
  // Mapeamentos existentes para compatibilidade
  'nome': 'name',
  'empresa': 'name',
  'email': 'email',
  'setor': 'sector',
  'website': 'website',
  'site': 'website',
  'tipo': 'type',
  'receita': 'annual_revenue',
  'receita_anual': 'annual_revenue',
  'funcionarios': 'number_of_employees',
  'numero_funcionarios': 'number_of_employees',
  'tamanho': 'size',
  // Nomes em inglês
  'company': 'name',
  'name': 'name',
  'phone': 'phone',
  'city': 'city',
  'state': 'state',
  'sector': 'sector',
  'type': 'type',
  'revenue': 'annual_revenue',
  'employees': 'number_of_employees',
  'size': 'size'
};

const normalizeColumnName = (column: string): string => {
  return COLUMN_MAPPING[column.toLowerCase().trim()] || column;
};

const isValidCNPJ = (cnpj: string): boolean => {
  // CNPJ é sempre opcional e aceita qualquer formato
  return true;
};

const isValidEmail = (email: string): boolean => {
  if (!email) return true; // Email é opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateRecord = (data: any, row: number, salespeople: any[]): ImportRecord => {
  const errors: string[] = [];
  
  if (!data.name || data.name.toString().trim() === '') {
    errors.push('Nome da empresa é obrigatório');
  }
  
  // CNPJ é opcional e aceita qualquer formato - não validamos mais
  
  if (data.email && !isValidEmail(data.email.toString())) {
    errors.push('Email inválido');
  }
  
  // Combinar DD + Celular se ambos existirem
  let contact_phone = '';
  if (data.contact_dd && data.contact_celular) {
    const dd = data.contact_dd.toString().trim();
    const celular = data.contact_celular.toString().trim();
    contact_phone = `(${dd}) ${celular}`;
  }
  
  // Validar formato do telefone combinado
  if (contact_phone && !/^\(\d{2}\) \d{4,5}-?\d{4}$/.test(contact_phone)) {
    errors.push('Formato de telefone inválido (DD + Celular)');
  }
  
  // Validar se o gerente existe na lista de vendedores
  let gerenteEncontrado = null;
  if (data.gerente) {
    const nomeGerente = data.gerente.toString().trim().toLowerCase();
    const primeiroNome = nomeGerente.split(' ')[0];
    
    const gerentesEncontrados = salespeople.filter(person => 
      person.name.toLowerCase().includes(primeiroNome)
    );
    
    if (gerentesEncontrados.length === 0) {
      errors.push(`Gerente "${data.gerente}" não encontrado no sistema`);
    } else if (gerentesEncontrados.length > 1) {
      errors.push(`Múltiplos gerentes encontrados para "${data.gerente}"`);
    } else {
      gerenteEncontrado = gerentesEncontrados[0];
    }
  }
  
  return {
    data,
    status: errors.length > 0 ? 'error' : 'valid',
    errors,
    contact_name: data.contact_name,
    contact_phone,
    contact_cargo: data.contact_cargo,
    gerente: gerenteEncontrado?.name || data.gerente
  };
};

export default function ImportCompaniesDialog({ isOpen, onClose, onSuccess }: ImportCompaniesDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentResultPage, setCurrentResultPage] = useState(1);
  
  const { data: salespeople } = useSalespeople();
  
  // Get current user role
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single();
        
      return { ...user, ...userData };
    }
  });
  
  const isAdmin = currentUser?.role === 'admin';

  const downloadTemplate = () => {
    const templateData = [
      {
        "Profissional - Nome para Etiqueta": "João Silva",
        "Empresa - Nome para Etiqueta": "Empresa Exemplo",
        "Gerente": "Maria Santos", 
        "RG": "12.345.678-9",
        "CPF": "123.456.789-00",
        "DD": "11",
        "Celular": "99999-9999",
        "Telefone": "(11) 3385-1277",
        "E-mail": "joao@exemplo.com",
        "Nome Completo do Profissional": "João Silva Santos",
        "Cargo": "Gerente de TI",
        "Nome Completo da Empresa": "Empresa Exemplo Tecnologia Ltda",
        "Endereço": "Rua das Flores, 123",
        "Bairro": "Centro",
        "Cidade": "São Paulo", 
        "Estado": "SP",
        "CEP": "01234-567",
        "CNPJ": "12.345.678/0001-90"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_importacao_empresas.xlsx");
  };

  const processFile = useCallback((file: File) => {
    console.log('Iniciando processamento do arquivo:', file.name, 'Tamanho:', file.size, 'bytes');
    
    // Validações básicas do arquivo
    if (file.size === 0) {
      toast.error('O arquivo está vazio. Selecione um arquivo válido.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('O arquivo é muito grande. O tamanho máximo permitido é 10MB.');
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('Erro ao ler o arquivo');
      toast.error('Erro ao ler o arquivo. Tente novamente.');
    };
    
    reader.onload = (e) => {
      try {
        console.log('Arquivo lido com sucesso, iniciando processamento...');
        let data: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          const text = e.target?.result as string;
          console.log('Processando arquivo CSV...');
          
          if (!text || text.trim().length === 0) {
            toast.error('O arquivo CSV está vazio ou não possui conteúdo válido.');
            return;
          }
          
          const parsed = Papa.parse(text, { 
            header: true, 
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
          });
          
          if (parsed.errors && parsed.errors.length > 0) {
            console.error('Erros ao processar CSV:', parsed.errors);
            toast.error(`Erro no CSV: ${parsed.errors[0].message}`);
            return;
          }
          
          data = parsed.data;
          console.log('CSV processado com sucesso:', data.length, 'registros encontrados');
          
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          console.log('Processando arquivo Excel...');
          const binaryData = e.target?.result as ArrayBuffer;
          
          if (!binaryData || binaryData.byteLength === 0) {
            toast.error('O arquivo Excel está vazio ou corrompido.');
            return;
          }
          
          try {
            const workbook = XLSX.read(binaryData, { type: 'array' });
            console.log('Planilhas encontradas:', workbook.SheetNames);
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              toast.error('O arquivo Excel não contém planilhas válidas.');
              return;
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            if (!worksheet) {
              toast.error(`A planilha "${sheetName}" não pôde ser lida.`);
              return;
            }
            
            data = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              defval: '',
              raw: false
            });
            
            // Converter primeira linha em cabeçalhos
            if (data.length === 0) {
              toast.error('A planilha está vazia. Adicione dados e tente novamente.');
              return;
            }
            
            const headers = data[0] as string[];
            const rows = data.slice(1);
            
            if (headers.length === 0 || rows.length === 0) {
              toast.error('A planilha não possui dados válidos. Verifique se há cabeçalhos e dados.');
              return;
            }
            
            // Converter para formato de objetos
            data = rows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                if (header && header.trim()) {
                  obj[header.trim()] = row[index] || '';
                }
              });
              return obj;
            }).filter(row => Object.values(row).some(value => value && value.toString().trim()));
            
            console.log('Excel processado com sucesso:', data.length, 'registros encontrados');
            
          } catch (xlsxError) {
            console.error('Erro específico do XLSX:', xlsxError);
            toast.error('Erro ao processar arquivo Excel. Verifique se o arquivo não está corrompido.');
            return;
          }
        } else {
          toast.error('Formato de arquivo não suportado. Use apenas arquivos .csv, .xlsx ou .xls');
          return;
        }

        if (!data || data.length === 0) {
          toast.error('Nenhum dado encontrado no arquivo. Verifique se o arquivo contém dados válidos.');
          return;
        }

        console.log('Dados extraídos:', data.length, 'registros');
        console.log('Primeira linha de exemplo:', data[0]);

        // Normalizar nomes das colunas
        const normalizedData = data.map(row => {
          const normalized: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = normalizeColumnName(key);
            if (normalizedKey && row[key] !== undefined && row[key] !== null) {
              normalized[normalizedKey] = row[key];
            }
          });
          return normalized;
        }).filter(row => Object.keys(row).length > 0);

        if (normalizedData.length === 0) {
          toast.error('Nenhum dado válido encontrado após normalização. Verifique os cabeçalhos das colunas.');
          return;
        }

        console.log('Dados normalizados:', normalizedData.length, 'registros');

        // Validar registros
        const validatedData = normalizedData.map((row, index) => 
          validateRecord(row, index + 2, salespeople || [])
        );

        console.log('Validação concluída:', validatedData.length, 'registros processados');

        setRecords(validatedData);
        setCurrentPage(1); // Reset para primeira página
        setStep('preview');
        
        toast.success(`Arquivo processado com sucesso! ${validatedData.length} registros encontrados.`);
        
      } catch (error) {
        console.error('Erro geral ao processar arquivo:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        toast.error(`Erro ao processar arquivo: ${errorMessage}. Verifique se o arquivo está no formato correto.`);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [salespeople]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    }, [processFile]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    const validRecords = records.filter(r => r.status !== 'error');
    
    if (validRecords.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setStep('importing');
    setProgress(0);
    setCurrentResultPage(1);

    try {
      const importData = {
        companies: validRecords.map(record => {
          // Encontrar o ID do gerente responsável
          let ownerId = selectedSalesperson;
          if (record.gerente && salespeople) {
            const gerente = salespeople.find(person => 
              person.name.toLowerCase().includes(record.gerente.toLowerCase().split(' ')[0])
            );
            if (gerente) {
              ownerId = gerente.id;
            }
          }
          
          return {
            name: record.data.name,
            cnpj: record.data.cnpj,
            phone: record.data.phone,
            email: record.data.email,
            city: record.data.city,
            state: record.data.state,
            sector: record.data.sector,
            website: record.data.website,
            type: record.data.type || 'Lead',
            annual_revenue: record.data.annual_revenue ? parseFloat(record.data.annual_revenue) : null,
            number_of_employees: record.data.number_of_employees ? parseInt(record.data.number_of_employees) : null,
            size: record.data.size,
            owner_id: ownerId,
            contact_name: record.contact_name,
            contact_phone: record.contact_phone,
            contact_cargo: record.contact_cargo
          };
        }),
        owner_id: selectedSalesperson
      };

      const { data, error } = await supabase.functions.invoke('import-companies', {
        body: importData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Erro na função: ${error.message || 'Erro desconhecido'}`);
      }

      setImportResult(data as ImportResult);
      setProgress(100);
      
      // Aguardar um pouco para mostrar o progresso completo antes de ir para os resultados
      setTimeout(() => {
        setStep('results');
      }, 500);
      
      if (data.success > 0) {
        onSuccess();
        // Removido o toast aqui pois a tela de resultados já mostra o status
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      
      let errorMessage = 'Erro desconhecido na importação';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'A importação está demorando muito. Tente com menos registros por vez.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Criar um resultado de erro para mostrar na tela de resultados
      setImportResult({
        total: records.length,
        success: 0,
        errors: 1,
        warnings: 0,
        details: [{
          row: 1,
          status: 'error',
          message: errorMessage
        }]
      });
      
      setProgress(100);
      
      // Mesmo em caso de erro, mostrar a tela de resultados
      setTimeout(() => {
        setStep('results');
      }, 500);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setRecords([]);
    setImportResult(null);
    setProgress(0);
    setCurrentPage(1);
    setCurrentResultPage(1);
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const validCount = records.filter(r => r.status === 'valid').length;
  const errorCount = records.filter(r => r.status === 'error').length;
  
  // Pagination logic
  const recordsPerPage = 50;
  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  
  // Garantir que currentPage está dentro do range válido
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startIndex = (validCurrentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
  const currentRecords = records.slice(startIndex, endIndex);
  
  // Pagination logic for results
  const totalResultRecords = importResult?.details.length || 0;
  const totalResultPages = Math.max(1, Math.ceil(totalResultRecords / recordsPerPage));
  const validCurrentResultPage = Math.min(Math.max(1, currentResultPage), totalResultPages);
  const resultStartIndex = (validCurrentResultPage - 1) * recordsPerPage;
  const resultEndIndex = Math.min(resultStartIndex + recordsPerPage, totalResultRecords);
  const currentResultRecords = importResult?.details.slice(resultStartIndex, resultEndIndex) || [];

  // Debug logging - removido para limpar console
  // console.log('Pagination Debug:', {
  //   totalRecords,
  //   recordsPerPage,
  //   totalPages,
  //   currentPage: validCurrentPage,
  //   startIndex,
  //   endIndex,
  //   currentRecordsLength: currentRecords.length
  // });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Empresas</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Faça upload de um arquivo CSV ou XLSX com os dados das empresas
                </p>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Template
                </Button>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p>Solte o arquivo aqui...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium">Arraste um arquivo aqui ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-2">Formatos aceitos: CSV, XLSX, XLS</p>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Novo formato:</strong> A planilha deve conter campos como "Nome Completo da Empresa", "Gerente", "Nome Completo do Profissional", "DD", "Celular", "Cargo", etc. 
                  Baixe o template para ver o formato correto.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <Badge variant="outline" className="text-green-600">
                      Válidos: {validCount}
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      Erros: {errorCount}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep('upload')}>
                      Voltar
                    </Button>
                    <Button onClick={handleImport} disabled={validCount === 0}>
                      Importar {validCount} Registros
                    </Button>
                  </div>
                </div>

                {isAdmin && salespeople && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="responsible-select">Responsável padrão para empresas sem gerente específico</Label>
                      <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
                        <SelectTrigger id="responsible-select">
                          <SelectValue placeholder="Selecione o responsável padrão (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Eu mesmo ({currentUser?.name})</SelectItem>
                          {salespeople
                            .filter(person => person.id !== currentUser?.id)
                            .map(person => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.name} ({person.role})
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Empresas com campo "Gerente" preenchido serão atribuídas automaticamente ao gerente correspondente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Gerente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRecords.map((record, index) => (
                      <TableRow key={startIndex + index}>
                        <TableCell>{getStatusIcon(record.status)}</TableCell>
                        <TableCell className="font-medium">{record.data.name}</TableCell>
                        <TableCell>{record.data.cnpj || '-'}</TableCell>
                        <TableCell>{record.data.email || '-'}</TableCell>
                        <TableCell>{record.gerente || '-'}</TableCell>
                        <TableCell>
                          {record.contact_name && (
                            <div className="text-sm">
                              <div>{record.contact_name}</div>
                              {record.contact_phone && <div>{record.contact_phone}</div>}
                              {record.contact_cargo && <div className="text-gray-500">{record.contact_cargo}</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.errors.length > 0 && (
                            <div className="text-sm text-red-600">
                              {record.errors.join(', ')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalRecords > recordsPerPage && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Mostrando registros {startIndex + 1} a {endIndex} de {totalRecords} total
                  </p>
                  
                  <Pagination>
                    <PaginationContent>
                      {validCurrentPage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(validCurrentPage - 1);
                            }}
                          />
                        </PaginationItem>
                      )}
                      
                      {(() => {
                        const maxVisiblePages = 5;
                        const startPage = Math.max(1, validCurrentPage - Math.floor(maxVisiblePages / 2));
                        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
                        
                        return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => adjustedStartPage + i).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === validCurrentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ));
                      })()}
                      
                      {validCurrentPage < totalPages && (
                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(validCurrentPage + 1);
                            }}
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Importando empresas...</h3>
                <p className="text-muted-foreground">Processando {validCount} registros</p>
              </div>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
            </div>
          )}

          {step === 'results' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Importação Concluída</h3>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                  <div className="text-sm text-green-700">Sucessos</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                  <div className="text-sm text-red-700">Erros</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.warnings}</div>
                  <div className="text-sm text-yellow-700">Avisos</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
              </div>

              {importResult.details.length > 0 && (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Linha</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mensagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentResultRecords.map((detail, index) => (
                          <TableRow key={resultStartIndex + index}>
                            <TableCell>{detail.row}</TableCell>
                            <TableCell>
                              <Badge variant={detail.status === 'success' ? 'default' : 'destructive'}>
                                {detail.status === 'success' ? 'Sucesso' : 'Erro'}
                              </Badge>
                            </TableCell>
                            <TableCell>{detail.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalResultRecords > recordsPerPage && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Mostrando registros {resultStartIndex + 1} a {resultEndIndex} de {totalResultRecords} total
                      </p>
                      
                      <Pagination>
                        <PaginationContent>
                          {validCurrentResultPage > 1 && (
                            <PaginationItem>
                              <PaginationPrevious 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentResultPage(validCurrentResultPage - 1);
                                }}
                              />
                            </PaginationItem>
                          )}
                          
                          {(() => {
                            const maxVisiblePages = 5;
                            const startPage = Math.max(1, validCurrentResultPage - Math.floor(maxVisiblePages / 2));
                            const endPage = Math.min(totalResultPages, startPage + maxVisiblePages - 1);
                            const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
                            
                            return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => adjustedStartPage + i).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  isActive={page === validCurrentResultPage}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentResultPage(page);
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ));
                          })()}
                          
                          {validCurrentResultPage < totalResultPages && (
                            <PaginationItem>
                              <PaginationNext 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentResultPage(validCurrentResultPage + 1);
                                }}
                              />
                            </PaginationItem>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center">
                <Button onClick={handleClose}>Fechar</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}