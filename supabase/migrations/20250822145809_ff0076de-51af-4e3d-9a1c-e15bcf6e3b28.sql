-- Adicionar restrição UNIQUE na coluna name da tabela companies
-- Primeiro, vamos remover possíveis duplicatas existentes (se houver)
DELETE FROM public.companies a
USING public.companies b
WHERE a.id < b.id 
AND a.name = b.name;

-- Agora adicionar a constraint UNIQUE na coluna name
ALTER TABLE public.companies 
ADD CONSTRAINT companies_name_unique UNIQUE (name);