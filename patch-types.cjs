// Script para atualizar tipos de conversas
const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, 'shared/types/conversations.ts');
let content = fs.readFileSync(typesPath, 'utf8');

const oldInterface = `export interface ConversationMessage {
  id: string;
  conversationId: string;
  messageId: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact';
  senderType: 'customer' | 'agent' | 'system';
  senderId: string | null;
  senderName: string | null;
  attachments: Attachment[];
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}`;

const newInterface = `export interface ConversationMessage {
  id: string;
  conversationId: string;
  messageId: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact';
  senderType: 'customer' | 'agent' | 'system';
  senderId: string | null;
  senderName: string | null;
  attachments: Attachment[];
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  // Campos para resposta a stories
  quotedMediaUrl?: string | null;
  quotedMimeType?: string | null;
  quotedCaption?: string | null;
  quotedFileUrl?: string | null;
  isReply?: number;
}`;

content = content.replace(oldInterface, newInterface);

fs.writeFileSync(typesPath, content);
console.log('Tipos de conversas atualizados!');