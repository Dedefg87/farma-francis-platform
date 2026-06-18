// Script de patch para webhooks.ts
const fs = require('fs');
const path = require('path');

const webhooksPath = path.join(__dirname, 'server/webhooks.ts');
let content = fs.readFileSync(webhooksPath, 'utf8');

// PATCH 1: Adicionar extendedTextMessage ao mapeamento de tipo
content = content.replace(
  /else if \(rawMessageType === 'reactionMessage'\) typeToSave = 'reaction';/g,
  `else if (rawMessageType === 'reactionMessage') typeToSave = 'reaction';
    else if (rawMessageType === 'extendedTextMessage') typeToSave = 'extendedTextMessage';`
);

// PATCH 2: Adicionar extração de contextInfo após o actualMessage
const contextInfoCode = `
  // ===========================================
  // 🎯 EXTRAÇÃO DE CONTEXTINFO PARA RESPOSTAS A STORIES
  // Quando cliente responde a um story, o extendedTextMessage contém contextInfo
  // ===========================================
  const contextInfo = message?.contextInfo || 
                      message?.extendedTextMessage?.contextInfo || 
                      null;
  const quotedMessage = contextInfo?.quotedMessage || null;

  // Extrair dados do story citado (quotedMessage)
  let quotedMediaUrl: string | null = null;
  let quotedMimeType: string | null = null;
  let quotedCaption: string | null = null;
  let isReply = false;

  if (quotedMessage) {
    isReply = true;
    
    if (quotedMessage.imageMessage) {
      quotedMediaUrl = quotedMessage.imageMessage.url || quotedMessage.imageMessage.mediaUrl || null;
      quotedMimeType = quotedMessage.imageMessage.mimetype || quotedMessage.imageMessage.mimeType || null;
      quotedCaption = quotedMessage.imageMessage.caption || null;
    } else if (quotedMessage.videoMessage) {
      quotedMediaUrl = quotedMessage.videoMessage.url || quotedMessage.videoMessage.mediaUrl || null;
      quotedMimeType = quotedMessage.videoMessage.mimetype || quotedMessage.videoMessage.mimeType || null;
      quotedCaption = quotedMessage.videoMessage.caption || null;
    } else if (quotedMessage.extendedTextMessage) {
      // Story textual
      quotedCaption = quotedMessage.extendedTextMessage.text || quotedMessage.message?.text || null;
    }
    
    // Limpar URL do R2 se aplicável
    if (quotedMediaUrl) {
      quotedMediaUrl = cleanR2Url(quotedMediaUrl);
    }
  }

  // ===========================================
  // 🎯 PRIORIDADE 1: Usar messageType da Evolution API
  // A Evolution envia o tipo exato em payload.data.messageType
  // ===========================================
  let typeToSave = 'text';`;

content = content.replace(
  /\/\/ ============================================\s*\n\s*\/\/ 🎯 PRIORIDADE 1: Usar messageType da Evolution API/g,
  contextInfoCode + '\n\n'
);

// PATCH 3: Adicionar os campos no return
content = content.replace(
  /return \{\s*\n\s*type: typeToSave as any,\s*\n\s*text,\s*\n\s*caption,\s*\n\s*mediaUrl,\s*\n\s*mimeType,\s*\n\s*fileName,\s*\n\s*fileSize,/,
  `return {
    type: typeToSave as any,
    text,
    caption,
    mediaUrl,
    mimeType,
    fileName,
    fileSize,
    // Campos para resposta a stories
    quotedMediaUrl,
    quotedMimeType,
    quotedCaption,
    isReply,`
);

fs.writeFileSync(webhooksPath, content);
console.log('Patch aplicado com sucesso!');