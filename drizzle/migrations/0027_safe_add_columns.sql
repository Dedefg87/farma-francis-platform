/* MySQL Safe Migration
 * Adiciona reply_to_external_id (se faltar) e garante compatibilidade
 */
DELIMITER $$

DROP PROCEDURE IF EXISTS AddReplyColumns $$
CREATE PROCEDURE AddReplyColumns()
BEGIN
  -- Verificar e adicionar reply_to_external_id se não existir
  IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'conversation_messages' 
    AND COLUMN_NAME = 'reply_to_external_id'
  ) THEN
    ALTER TABLE conversation_messages ADD COLUMN reply_to_external_id VARCHAR(255) NULL AFTER file_size;
    SELECT 'reply_to_external_id added' AS status;
  ELSE
    SELECT 'reply_to_external_id already exists' AS status;
  END IF;

  -- Verificar e adicionar reaction
  IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'conversation_messages' 
    AND COLUMN_NAME = 'reaction'
  ) THEN
    ALTER TABLE conversation_messages ADD COLUMN reaction VARCHAR(10) NULL AFTER reply_to_external_id;
    SELECT 'reaction added' AS status;
  ELSE
    SELECT 'reaction already exists' AS status;
  END IF;

  -- Verificar e adicionar sender_name/sender_position
  IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'conversation_messages' 
    AND COLUMN_NAME = 'sender_name'
  ) THEN
    ALTER TABLE conversation_messages ADD COLUMN sender_name VARCHAR(255) NULL;
    SELECT 'sender_name added' AS status;
  END IF;

  IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'conversation_messages' 
    AND COLUMN_NAME = 'sender_position'
  ) THEN
    ALTER TABLE conversation_messages ADD COLUMN sender_position VARCHAR(255) NULL;
    SELECT 'sender_position added' AS status;
  END IF;
END$$

CALL AddReplyColumns();
DROP PROCEDURE AddReplyColumns $$

DELIMITER ;
