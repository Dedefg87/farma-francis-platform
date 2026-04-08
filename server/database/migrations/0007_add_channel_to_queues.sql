-- Migration: Adicionar coluna 'channel' à tabela 'queues'
-- Data: 2026-04-07 23:50 UTC
-- Motivo: Schema Drizzle requer campo 'channel' (NOT NULL) mas banco não tinha

ALTER TABLE queues 
ADD COLUMN channel VARCHAR(16) NOT NULL DEFAULT 'whatsapp' 
AFTER description;

-- Também ajustar created_by para NOT NULL se necessário? (schemaReference)
-- Por segurança, vamos deixar NULLABLE pois o schema aceita NULL (sem .notNull() no campo createdBy)

COMMIT;
