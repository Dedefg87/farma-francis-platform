// Patch para incluir campos de reply na chamada ingestInboundConversationMessage
const fs = require('fs');
const path = require('path');

const webhooksPath = path.join(__dirname, 'server/webhooks.ts');
let content = fs.readFileSync(webhooksPath, 'utf8');

// Encontrar a chamada e adicionar os campos de reply
const oldCall = `          await ingestInboundConversationMessage({
            provider: "whatsapp",
            fromNumber,
            fromName: pushName || null,
            messageType,
            messageText,
            caption,
            mediaUrl: mediaUrl || null,
            mediaId: parsed.mediaId || null,
            mimeType,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            externalId: messageId,
          });`;

const newCall = `          await ingestInboundConversationMessage({
            provider: "whatsapp",
            fromNumber,
            fromName: pushName || null,
            messageType,
            messageText,
            caption,
            mediaUrl: mediaUrl || null,
            mediaId: parsed.mediaId || null,
            mimeType,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            externalId: messageId,
            // Campos para resposta a stories
            quotedMediaUrl: parsed.quotedMediaUrl || null,
            quotedMimeType: parsed.quotedMimeType || null,
            quotedCaption: parsed.quotedCaption || null,
            isReply: parsed.isReply || false,
          });`;

content = content.replace(oldCall, newCall);

fs.writeFileSync(webhooksPath, content);
console.log('Patch de chamada de ingestInboundConversationMessage aplicado com sucesso!');