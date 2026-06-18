/**
 * Patch para corrigir o scroll de mensagens nas conversas
 * 
 * PROBLEMA: Ao mudar de conversa, o scroll não vai para o final automaticamente
 * CAUSA: hasInitiallyScrolledRef nunca é reiniciado quando selectedConversationId muda
 * 
 * SOLUÇÃO: Adicionar useEffect para resetar os refs quando a conversa muda
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/AgentMessages.tsx');

// Ler o arquivo
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar o local do useEffect que precisa ser modificado
const oldCode = `  // Scroll inicial quando carrega conversa
  useEffect(() => {
    if (!hasInitiallyScrolledRef.current && messages && messages.length > 0) {
      scrollToBottom(true);
      hasInitiallyScrolledRef.current = true;
    }
  }, [messages, scrollToBottom]);`;

const newCode = `  // Resets: when conversation changes, allow scroll to bottom on new conversation
  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
    isAtBottomRef.current = true;
  }, [selectedConversationId]);

  // Scroll inicial quando carrega conversa
  useEffect(() => {
    if (!hasInitiallyScrolledRef.current && messages && messages.length > 0) {
      scrollToBottom(true);
      hasInitiallyScrolledRef.current = true;
    }
  }, [messages, scrollToBottom]);`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content);
  console.log('✅ Patch aplicado com sucesso!');
  console.log('   - Adicionado reset de hasInitiallyScrolledRef ao mudar de conversa');
  console.log('   - Adicionado reset de isAtBottomRef ao mudar de conversa');
} else {
  console.log('⚠️ Código alvo não encontrado - pode já estar corrigido ou ter mudado');
}

// Também preparar CSS para scroll behavior
const cssPath = path.join(__dirname, 'client/src/index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

const scrollCss = `
/* Scroll behavior for message containers - always start at bottom */
.message-container {
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

/* Radix UI ScrollArea customization */
[data-radix-scroll-area-viewport] {
  scroll-behavior: smooth;
}
`;

// Verificar se já existe
if (!cssContent.includes('.message-container')) {
  cssContent += scrollCss;
  fs.writeFileSync(cssPath, cssContent);
  console.log('✅ CSS de scroll adicionado');
}