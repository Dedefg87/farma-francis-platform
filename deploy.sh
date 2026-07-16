#!/bin/bash

# Script de Deploy para Farma Francis Platform
# Executar no diretório do projeto

echo "🚀 Iniciando deploy do Farma Francis Platform..."

# 1. Verificar se estamos no diretório certo
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado. Execute este script no diretório do projeto."
    exit 1
fi

# 2. Verificar se há alterações a commitar
if git diff-index --quiet HEAD --; then
    echo "✅ Nenhuma alteração para commitar"
else
    echo "📝 Encontradas alterações não commitadas"
    
    # Adicionar arquivos modificados
    git add server/messaging.ts
    git add server/db-messages-outbound.ts
    
    # Commit
    git commit -m "Fix: Persist outbound media messages in conversation_messages table

- Added ingestOutboundConversationMessage function
- Modified sendWhatsAppImage, sendWhatsAppDocument, sendWhatsAppMedia
- Messages sent by agent now appear in chat interface
- Supports both Evolution API and WhatsApp Business API"
    
    echo "✅ Alterações commitadas"
fi

# 3. Push para GitHub (trigger do deploy Railway)
echo "📤 Enviando para GitHub..."
git push origin main

echo "✅ Deploy iniciado!"
echo "📋 Verifique os logs em: railway logs"
echo "💡 O Railway fará o build automaticamente via webhook"