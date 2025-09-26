# API Edge Function: Manage Proposals

Esta edge function permite gerenciar propostas através de uma API REST, com operações de CRUD completas.

## Endpoint
```
POST https://xrfaptpqlllibcopnzdm.supabase.co/functions/v1/manage-proposals
```

## Autenticação
Requer autenticação JWT válida no header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Campos da Proposta

### Campos Obrigatórios
- `status`: Status da proposta (string)
- `owner_name`: Nome do responsável (string)
- `project_name`: Nome do projeto (string)  
- `company_name`: Nome da empresa (string)

### Campos Opcionais
- `title`: Título da proposta (string) - Se não fornecido, será gerado automaticamente
- `value`: Valor da proposta (number)
- `pdf_url`: URL do PDF da proposta (string)
- `related_name`: Nome do relacionado (string) - Campo opcional para futura expansão

## Operações Disponíveis

### 1. Criar Proposta
```json
{
  "action": "create",
  "data": {
    "status": "Rascunho",
    "owner_name": "João Silva",
    "project_name": "Sistema de Vendas",
    "company_name": "Empresa XYZ",
    "title": "Proposta Exemplo",
    "value": 50000.00,
    "pdf_url": "https://exemplo.com/proposta.pdf",
    "related_name": "Maria Santos"
  }
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Proposal created successfully",
  "data": {
    "id": 1,
    "title": "Proposta Empresa XYZ - [PRJ001] Sistema de Vendas",
    "value": 50000.00,
    "status": "Rascunho",
    "owner_id": "uuid-convertido-automaticamente",
    "project_id": 1,
    "company_id": 1,
    "companies": { "id": 1, "name": "Empresa XYZ" },
    "projects": { "id": 1, "title": "Sistema de Vendas", "project_code": "PRJ001" }
  }
}
```

### 2. Atualizar Proposta
```json
{
  "action": "update",
  "id": 1,
  "data": {
    "status": "Enviada",
    "value": 55000.00,
    "owner_name": "Pedro Costa"
  }
}
```

### 3. Buscar Propostas

#### Buscar por ID
```json
{
  "action": "get",
  "id": 1
}
```

#### Buscar com Filtros
```json
{
  "action": "get",
  "filters": {
    "company_id": 1,
    "status": "Rascunho",
    "owner_id": "uuid-do-responsavel"
  }
}
```

**Nota:** Os filtros ainda utilizam IDs internos, apenas a criação e atualização aceitam nomes.

### 4. Deletar Proposta
```json
{
  "action": "delete",
  "id": 1
}
```

## Exemplos de Uso

### JavaScript/TypeScript
```typescript
const API_URL = 'https://xrfaptpqlllibcopnzdm.supabase.co/functions/v1/manage-proposals';

// Criar proposta usando nomes ao invés de IDs
async function createProposal(proposalData: any, token: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create',
      data: {
        status: proposalData.status,
        owner_name: proposalData.owner_name,
        project_name: proposalData.project_name,
        company_name: proposalData.company_name,
        title: proposalData.title,
        value: proposalData.value,
        pdf_url: proposalData.pdf_url,
        related_name: proposalData.related_name
      }
    })
  });
  
  return response.json();
}

// Buscar propostas por empresa
async function getProposalsByCompany(companyId: number, token: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'get',
      filters: { company_id: companyId }
    })
  });
  
  return response.json();
}
```

### cURL
```bash
# Criar proposta
curl -X POST https://xrfaptpqlllibcopnzdm.supabase.co/functions/v1/manage-proposals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "data": {
      "status": "Rascunho",
      "owner_name": "João Silva",
      "project_name": "Sistema de Vendas",
      "company_name": "Empresa XYZ",
      "title": "Nova Proposta",
      "value": 25000.00
    }
  }'
```

## Códigos de Resposta

- `200`: Operação realizada com sucesso
- `201`: Proposta criada com sucesso
- `400`: Erro de validação ou dados inválidos
- `401`: Token de autenticação inválido
- `404`: Proposta não encontrada
- `500`: Erro interno do servidor

## Recursos Automáticos

### Geração Automática de Título
Se o campo `title` não for fornecido, será gerado automaticamente no formato:
```
"Proposta [Nome da Empresa] - [Código do Projeto] [Título do Projeto]"
```

### Log de Atividades
Todas as operações são automaticamente registradas na tabela `activity_log` para auditoria.

### Versionamento
O sistema de versionamento é aplicado automaticamente quando uma proposta é atualizada, mantendo histórico de mudanças.

## Validações

- Campos obrigatórios são validados antes da criação
- Nomes de projeto, empresa e responsável devem existir no banco de dados
- A conversão de nomes para IDs é feita automaticamente
- Se um nome não for encontrado, a operação retorna erro específico
- Valores numéricos devem ser positivos

## Conversão Automática de Nomes para IDs

A API agora aceita nomes ao invés de IDs para facilitar a integração:

- `owner_name` → busca na tabela `users` pelo campo `name`
- `project_name` → busca na tabela `projects` pelo campo `title` 
- `company_name` → busca na tabela `companies` pelo campo `name`
- `related_name` → campo opcional para futuras expansões

**Importante:** Se um nome não for encontrado, a API retornará um erro específico indicando qual nome não foi localizado.

## Tratamento de Erros

Todos os erros são retornados em formato JSON:
```json
{
  "error": "Descrição do erro",
  "details": "Detalhes técnicos (quando disponível)"
}
```