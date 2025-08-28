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
import { Download, Upload, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isValidCNPJ } from '@/lib/cnpj-validator';

interface ImportRecord {
  row: number;
  data: {
    nome: string;
    cnpj?: string;
    cidade?: string;
    estado?: string;
    setor?: string;
    porte?: string;
    funcionarios?: number;
    receita_anual?: number;
    telefone?: string;
    email?: string;
    website?: string;
    tipo: 'Lead' | 'Cliente';
  };
  status: 'valid' | 'warning' | 'error';
  errors: string[];
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

const REQUIRED_COLUMNS = ['nome'];
const COLUMN_MAPPING = {
  'nome': 'nome',
  'name': 'nome',
  'empresa': 'nome',
  'company': 'nome',
  'cnpj': 'cnpj',
  'cidade': 'cidade',
  'city': 'cidade',
  'estado': 'estado',
  'state': 'estado',
  'uf': 'estado',
  'setor': 'setor',
  'sector': 'setor',
  'porte': 'porte',
  'size': 'porte',
  'funcionarios': 'funcionarios',
  'employees': 'funcionarios',
  'receita_anual': 'receita_anual',
  'revenue': 'receita_anual',
  'annual_revenue': 'receita_anual',
  'telefone': 'telefone',
  'phone': 'telefone',
  'email': 'email',
  'website': 'website',
  'site': 'website',
  'tipo': 'tipo',
  'type': 'tipo'
};

export default function ImportCompaniesDialog({ isOpen, onClose, onSuccess }: ImportCompaniesDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = () => {
    const template = [
      {
        nome: 'Empresa Exemplo Ltda',
        cnpj: '11.222.333/0001-81',
        cidade: 'São Paulo',
        estado: 'SP',
        setor: 'Tecnologia',
        porte: 'Média',
        funcionarios: 50,
        receita_anual: 5000000,
        telefone: '(11) 99999-9999',
        email: 'contato@exemplo.com',
        website: 'https://exemplo.com',
        tipo: 'Lead'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_importacao_empresas.xlsx');
  };

  const normalizeColumnName = (column: string): string => {
    const normalized = column.toLowerCase().trim().replace(/\s+/g, '_');
    return COLUMN_MAPPING[normalized] || normalized;
  };

  const validateRecord = (data: any, row: number): ImportRecord => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar campos obrigatórios
    if (!data.nome || data.nome.trim() === '') {
      errors.push('Nome é obrigatório');
    }

    // Validar CNPJ se fornecido
    if (data.cnpj && data.cnpj.trim() !== '') {
      if (!isValidCNPJ(data.cnpj)) {
        errors.push('CNPJ inválido');
      }
    }

    // Validar email se fornecido
    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Email inválido');
      }
    }

    // Validar tipo
    if (data.tipo && !['Lead', 'Cliente'].includes(data.tipo)) {
      errors.push('Tipo deve ser "Lead" ou "Cliente"');
    }

    let status: 'valid' | 'warning' | 'error' = 'valid';
    if (errors.length > 0) {
      status = 'error';
    } else if (warnings.length > 0) {
      status = 'warning';
    }

    return {
      row,
      data: {
        ...data,
        tipo: data.tipo || 'Lead'
      },
      status,
      errors: [...errors, ...warnings]
    };
  };

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let data: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          const text = e.target?.result as string;
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          data = parsed.data;
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const binaryData = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(binaryData, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        }

        // Normalizar nomes das colunas
        const normalizedData = data.map(row => {
          const normalized: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = normalizeColumnName(key);
            normalized[normalizedKey] = row[key];
          });
          return normalized;
        });

        // Validar registros
        const validatedRecords = normalizedData.map((row, index) => 
          validateRecord(row, index + 1)
        );

        setRecords(validatedRecords);
        setStep('preview');
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error('Erro ao processar arquivo. Verifique o formato.');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

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

    try {
      const { data, error } = await supabase.functions.invoke('import-companies', {
        body: { 
          companies: validRecords.map(r => r.data)
        }
      });

      if (error) throw error;

      setImportResult(data as ImportResult);
      setStep('results');
      setProgress(100);
      
      if (data.success > 0) {
        onSuccess();
        toast.success(`${data.success} empresas importadas com sucesso!`);
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar empresas');
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setRecords([]);
    setImportResult(null);
    setProgress(0);
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
                  <strong>Modo Rigoroso:</strong> Registros com CNPJ inválido ou campos obrigatórios em branco serão rejeitados. 
                  Corrija os erros no arquivo e importe novamente.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'preview' && (
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

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 50).map((record) => (
                      <TableRow key={record.row}>
                        <TableCell>{getStatusIcon(record.status)}</TableCell>
                        <TableCell className="font-medium">{record.data.nome}</TableCell>
                        <TableCell>{record.data.cnpj || '-'}</TableCell>
                        <TableCell>{record.data.cidade || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={record.data.tipo === 'Lead' ? 'secondary' : 'default'}>
                            {record.data.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.errors.length > 0 && (
                            <span className="text-red-600 text-sm">
                              {record.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {records.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando primeiros 50 registros de {records.length} total
                </p>
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
                      {importResult.details.slice(0, 20).map((detail, index) => (
                        <TableRow key={index}>
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