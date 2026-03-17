-- SCRIPT DE CONSOLIDAÇÃO DE CLIENTES DUPLICADOS
-- Executar APÓS确认 que a normalização está funcionando
-- Este脚本 funde registros de clientes com o mesmo número normalizado

-- 1. Identificar duplicatas por nome "Anderson" (exemplo do guia)
-- Modifique conforme necessário

WITH duplicados AS (
  SELECT
    phone,
    ARRAY_AGG(id ORDER BY created_at ASC) as ids,
    ARRAY_AGG(name) as nomes,
    COUNT(*) as total
  FROM customers
  WHERE LOWER(name) LIKE '%anderson%'
  GROUP BY phone
  HAVING COUNT(*) > 1
)

SELECT * FROM duplicados;

-- 2. Para cada grupo de duplicados, manter o mais antigo (primeiro da lista)
-- e atualizar foreign keys antes de deletar os outros

DO $$
DECLARE
  dup RECORD;
  principal_id INT;
  outros_ids INT[];
BEGIN
  FOR dup IN
    SELECT phone, ARRAY_AGG(id ORDER BY created_at ASC) as ids
    FROM customers
    WHERE LOWER(name) LIKE '%anderson%'
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    principal_id := dup.ids[1];
    outros_ids := dup.ids[2:array_length(dup.ids, 1)];

    RAISE NOTICE 'Processando phone %: principal=%, outros=%', dup.phone, principal_id, outros_ids;

    -- Atualizar conversations para apontar para o principal
    UPDATE conversations
    SET customer_id = principal_id
    WHERE customer_id IN (SELECT unnest(outros_ids));

    -- Atualizar conversation_messages (se houver customer_id direto)
    -- Nota: conversation_messages geralmente não tem customer_id direto, usa conversations

    -- Deletar duplicados (mantendo o principal)
    DELETE FROM customers
    WHERE id = ANY(outros_ids);
  END LOOP;
END $$;

-- 3. Re-indexar (opcional) - PostgreSQL auto-reindexa, mas pode ajudar
REINDEX TABLE customers;

-- FIM DO SCRIPT
