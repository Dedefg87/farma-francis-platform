-- Preencher opened_at NULL em conversations com data da primeira mensagem
-- Se não houver mensagens, usar NOW() como fallback

UPDATE conversations c
LEFT JOIN (
  SELECT 
    conversation_id, 
    MIN(created_at) as first_msg_date
  FROM conversation_messages
  GROUP BY conversation_id
) fm ON c.id = fm.conversation_id
SET c.opened_at = COALESCE(fm.first_msg_date, NOW())
WHERE c.opened_at IS NULL;

-- Log de verificação
SELECT 
  'Total conversations:' as metric,
  COUNT(*) as value
FROM conversations
UNION ALL
SELECT 
  'Conversations with opened_at NOT NULL:',
  COUNT(*) 
FROM conversations 
WHERE opened_at IS NOT NULL
UNION ALL
SELECT 
  'Conversations with opened_at NULL (remaining):',
  COUNT(*) 
FROM conversations 
WHERE opened_at IS NULL;
