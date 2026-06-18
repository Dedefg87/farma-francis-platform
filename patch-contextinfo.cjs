// Patch completo para webhooks.ts - Adicionar extração de contextInfo para stories
const fs = require('fs');
const path = require('path');

const webhooksPath = path.join(__dirname, 'server/webhooks.ts');
let content = fs.readFileSync(webhooksPath, 'utf8');

// PATCH: Adicionar declaração das variáveis de contextInfo após actualMessage
const oldActualMessageCode = `  // ===========================================
  // 🎯 DESEMPACOTAMENTO DE VIEW ONCE E OUTROS WRAPPERS
  // O WhatsApp (Baileys) encapsula mídias em viewOnceMessage, viewOnceMessageV2, etc.
  // Precisamos extrair a mensagem real desses wrappers
  // ===========================================
  const actualMessage = 
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message;

  // ===========================================
  // 🎯 PRIORIDADE 1: Usar messageType da Evolution API`;

const newActualMessageCode = `  // ===========================================
  // 🎯 DESEMPACOTAMENTO DE VIEW ONCE E OUTROS WRAPPERS
  // O WhatsApp (Baileys) encapsula mídias em viewOnceMessage, viewOnceMessageV2, etc.
  // Precisamos extrair a mensagem real desses wrappers
  // ===========================================
  const actualMessage = 
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message;

  // ===========================================
  // 🎯 EXTRAÇÃO DE CONTEXTINFO PARA RESPOSTAS A STORIES
  // Quando cliente responde a um story, o extendedTextMessage contém contextInfo
  // ===========================================
  const contextInfo = message?.contextInfo || 
                      message?.extendedTextMessage?.contextInfo || 
                      message?.message?.contextInfo ||
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
    } else if (quotedMessage.documentMessage) {
      quotedMediaUrl = quotedMessage.documentMessage.url || quotedMessage.documentMessage.mediaUrl || null;
      quotedMimeType = quotedMessage.documentMessage.mimetype || quotedMessage.documentMessage.mimeType || null;
      quotedCaption = quotedMessage.documentMessage.caption || null;
    } else if (quotedMessage.audioMessage) {
      quotedMediaUrl = quotedMessage.audioMessage.url || quotedMessage.audioMessage.mediaUrl || null;
      quotedMimeType = quotedMessage.audioMessage.mimetype || quotedMessage.audioMessage.mimeType || null;
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
  // 🎯 PRIORIDADE 1: Usar messageType da Evolution API`;

content = content.replace(oldActualMessageCode, newActualMessageCode);

fs.writeFileSync(webhooksPath, content);
console.log('Patch contextInfo aplicado com sucesso!');