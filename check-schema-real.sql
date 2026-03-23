-- Script para verificar colunas reais das tabelas problemáticas
-- Execute no MySQL do Railway

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN (
  'baby_shower_events',
  'baby_shower_gift_packages',
  'baby_shower_purchases',
  'customer_treatments',
  'pharma_products',
  'pharma_purchases',
  'pharma_purchase_items',
  'queue_agents',
  'tags',
  'customer_tags',
  'crm_scripts',
  'agent_status',
  'queues'
)
ORDER BY TABLE_NAME, ORDINAL_POSITION;
