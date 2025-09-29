# Teste da função add-proposal com nomes

A função `add-proposal` foi modificada para aceitar nomes em vez de IDs, tornando-a mais user-friendly.

## Novos campos aceitos:

### Formato com nomes:
```json
{
  "company_name": "Teste importação",
  "owner_name": "Karina Guimaraes", 
  "project_title": "novo projeto",
  "status": "Rascunho",
  "value": 45000
}
```

### Formato misto (IDs + nomes):
```json
{
  "company_id": 226,
  "owner_name": "Alan",
  "project_title": "Decomissioning", 
  "status": "Enviada",
  "value": 75000
}
```

### Formato original (ainda suportado):
```json
{
  "company_id": 82,
  "owner_id": "873850eb-b284-478a-ab05-609f0cc91d52",
  "project_id": 11,
  "status": "Rascunho",
  "value": 35000
}
```

## cURL de teste com nomes:

```bash
curl -X POST \
  https://xrfaptpqlllibcopnzdm.supabase.co/functions/v1/add-proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -d '{
    "company_name": "Teste importação",
    "owner_name": "Karina Guimaraes",
    "project_title": "novo projeto", 
    "status": "Rascunho",
    "value": 50000
  }'
```

## Vantagens:

✅ **Mais intuitivo**: Use nomes em vez de buscar IDs
✅ **Flexível**: Aceita IDs, nomes ou mistura de ambos
✅ **Compatível**: Não quebra integrações existentes
✅ **Validação**: Retorna erro se nome não encontrado
✅ **Busca exata**: Busca pelo nome/título exato na base

## Campos obrigatórios:

- `company_id` OU `company_name`
- `owner_id` OU `owner_name` 
- `project_id` OU `project_title`
- `status`

## Erros específicos:

- `Empresa "[nome]" não encontrada`
- `Usuário "[nome]" não encontrado`
- `Projeto "[título]" não encontrado`