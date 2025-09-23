-- Fix the remaining inconsistency manually
UPDATE companies 
SET owner_id = (
    SELECT o.owner_id 
    FROM opportunities o 
    WHERE o.company_id = companies.id 
    LIMIT 1
)
WHERE id = 160 AND EXISTS (
    SELECT 1 FROM opportunities o 
    WHERE o.company_id = companies.id 
    AND o.owner_id != companies.owner_id
);

-- Log the fix
INSERT INTO activity_log (description, type, user_id, related_company_id)
SELECT 
    'Responsável da empresa "' || c.name || '" corrigido manualmente para manter consistência.',
    'COMPANY_UPDATED',
    c.owner_id,
    c.id
FROM companies c 
WHERE c.id = 160;