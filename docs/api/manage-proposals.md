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
- `owner_id`: ID do responsável (UUID)
- `project_id`: ID do projeto (number)
- `company_id`: ID da empresa (number)

### Campos Opcionais
- `title`: Título da proposta (string) - Se não fornecido, será gerado automaticamente
- `value`: Valor da proposta (number)
- `pdf_url`: URL do PDF da proposta (string)

## Operações Disponíveis

### 1. Criar Proposta
```json
{
  "action": "create",
  "data": {
    "status": "Rascunho",
    "owner_id": "uuid-do-responsavel",
    "project_id": 1,
    "company_id": 1,
    "title": "Proposta Exemplo",
    "value": 50000.00,
    "pdf_url": "https://exemplo.com/proposta.pdf"
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
    "title": "Proposta Exemplo",
    "value": 50000.00,
    "status": "Rascunho",
    "owner_id": "uuid-do-responsavel",
    "project_id": 1,
    "company_id": 1,
    "companies": { "id": 1, "name": "Empresa Exemplo" },
    "projects": { "id": 1, "title": "Projeto Exemplo", "project_code": "PRJ001" }
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
    "value": 55000.00
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

// Criar proposta
async function createProposal(proposalData: any, token: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create',
      data: proposalData
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
      "owner_id": "uuid-do-responsavel",
      "project_id": 1,
      "company_id": 1,
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
- IDs de projeto e empresa devem existir no banco de dados
- O responsável deve ser um usuário válido
- Valores numéricos devem ser positivos

## Tratamento de Erros

Todos os erros são retornados em formato JSON:
```json
{
  "error": "Descrição do erro",
  "details": "Detalhes técnicos (quando disponível)"
}
```