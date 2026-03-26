-- Migration: 20250325_add_queues_created_by
-- Purpose: Add created_by column and foreign key to queues

-- Adicionar coluna created_by
ALTER TABLE queues 
  ADD COLUMN created_by INT NULL;

-- Criar foreign key para users(id)
ALTER TABLE queues 
  ADD CONSTRAINT queues_created_by_users_id_fk
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL;
