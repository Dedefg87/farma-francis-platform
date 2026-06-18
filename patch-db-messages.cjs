// Script de patch para db-messages.ts
const fs = require('fs');
const path = require('path');

const dbMessagesPath = path.join(__dirname, 'server/db-messages.ts');
let content = fs.readFileSync(dbMessagesPath, 'utf8');

// PATCH 1: Adicionar campos ao buildInboundContent
const oldBuildInboundContent = `function buildInboundContent(message: {
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  text?: string | null;
  extendedTextMessage?: { text?: string } | null;
}) {
  if (message.text?.trim()) return message.text;
  
  // PROBLEMA 2: extendedTextMessage (respostas a status)
  if (message.extendedTextMessage?.text?.trim()) {
    return message.extendedTextMessage.text;
  }

  if (message.messageText?.trim()) return message.messageText;
  if (message.caption?.trim()) return message.caption;`;

const newBuildInboundContent = `function buildInboundContent(message: {
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  text?: string | null;
  extendedTextMessage?: { text?: string } | null;
  quotedMediaUrl?: string | null;
  quotedMimeType?: string | null;
  quotedCaption?: string | null;
  isReply?: boolean;
}) {
  // Se é uma resposta a story, formatar como "[Resposta ao Story]: <texto>"
  if (message.isReply && message.quotedCaption) {
    const replyText = message.text || message.messageText || "";
    return \`[Resposta ao Story] \${replyText}\`.trim();
  }
  
  if (message.text?.trim()) return message.text;
  
  // PROBLEMA 2: extendedTextMessage (respostas a status)
  if (message.extendedTextMessage?.text?.trim()) {
    return message.extendedTextMessage.text;
  }

  if (message.messageText?.trim()) return message.messageText;
  if (message.caption?.trim()) return message.caption;`;

content = content.replace(oldBuildInboundContent, newBuildInboundContent);

// PATCH 2: Adicionar campos ao ingestInboundConversationMessage
const oldIngestSignature = `export async function ingestInboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  fromNumber: string;
  fromName?: string | null;
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null; // Evolution API message ID
  createdAt?: Date;
})`;

const newIngestSignature = `export async function ingestInboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  fromNumber: string;
  fromName?: string | null;
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null; // Evolution API message ID
  createdAt?: Date;
  quotedMediaUrl?: string | null;
  quotedMimeType?: string | null;
  quotedCaption?: string | null;
  isReply?: boolean;
})`;

content = content.replace(oldIngestSignature, newIngestSignature);

// PATCH 3: Adicionar quoted fields no insert do conversationMessages
const oldInsert = `const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    externalId: message.externalId || null,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message),
    fileUrl: fileUrlToSave,
    fileName: message.fileName || null,
    fileType: message.mimeType || null,
    fileSize: message.fileSize || null,
    createdAt: now,
  });`;

const newInsert = `const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    externalId: message.externalId || null,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message),
    fileUrl: fileUrlToSave,
    fileName: message.fileName || null,
    fileType: message.mimeType || null,
    fileSize: message.fileSize || null,
    quotedMediaUrl: message.quotedMediaUrl || null,
    quotedMimeType: message.quotedMimeType || null,
    quotedCaption: message.quotedCaption || null,
    isReply: message.isReply ? 1 : 0,
    createdAt: now,
  });`;

content = content.replace(oldInsert, newInsert);

fs.writeFileSync(dbMessagesPath, content);
console.log('Patch db-messages.ts aplicado com sucesso!');