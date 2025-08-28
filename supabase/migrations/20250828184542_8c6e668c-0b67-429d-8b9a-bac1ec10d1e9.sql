-- Criar a oportunidade que deveria ter sido criada automaticamente
INSERT INTO opportunities (title, value, company_id, contact_id, stage_id, owner_id, description)
SELECT 
  'Oportunidade - ' || c.name,
  0,
  c.id,
  ct.id,
  14, -- Primeiro estágio do pipeline
  c.owner_id,
  'Oportunidade criada automaticamente através do cadastro de lead'
FROM companies c
JOIN contacts ct ON ct.company_id = c.id
WHERE c.cnpj = '60.352.107/0001-20'
  AND NOT EXISTS (
    SELECT 1 FROM opportunities o WHERE o.company_id = c.id
  );