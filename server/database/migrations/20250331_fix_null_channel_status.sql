-- Preencher campos NULL em conversations existentes
-- Executar uma única vez

-- Preencher channel NULL com 'unknown' (ou 'whatsapp' se preferir)
UPDATE conversations SET channel = 'unknown' WHERE channel IS NULL;

-- Preencher status NULL com 'open' (padrão)
UPDATE conversations SET status = 'open' WHERE status IS NULL;

-- Log de verificação
SELECT 
  'NULLs remanescentes em channel:' as check, COUNT(*) FROM conversations WHERE channel IS NULL
UNION ALL
SELECT 
  'NULLs remanescentes em status:' as check, COUNT(*) FROM conversations WHERE status IS NULL
UNION ALL
SELECT 
  'Total conversations:' as check, COUNT(*) FROM conversations;
