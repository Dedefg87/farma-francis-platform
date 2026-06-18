// Script para adicionar campos de reply ao drizzle schema
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'drizzle/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf8');

// Adicionar campos de quoted após fileSize no conversationMessages
const oldSchema = `  fileSize: int("file_size"), // Tamanho em bytes
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`;

const newSchema = `  fileSize: int("file_size"), // Tamanho em bytes
  readAt: timestamp("read_at"),
  quotedMediaUrl: text("quoted_media_url"),
  quotedMimeType: varchar("quoted_mime_type", { length: 100 }),
  quotedCaption: text("quoted_caption"),
  quotedFileUrl: text("quoted_file_url"),
  isReply: int("is_reply").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`;

content = content.replace(oldSchema, newSchema);

fs.writeFileSync(schemaPath, content);
console.log('Schema drizzle atualizado com campos de reply!');