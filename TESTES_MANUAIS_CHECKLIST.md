# ✅ Checklist de Testes Manuais - Integração Mobile

**Responsável:** Anderson (ou equipe de QA)
**Data:** 18/03/2026
**Versão:** v2.0.0-mobile-ready (commit 3cf4253)

---

## 🎯 Objetivo

Validar que:
1. Funcionalidades desktop **não quebraram** após integração mobile
2. Versão mobile **funciona corretamente** em dispositivos reais
3. Fallback para navegadores antigos **é ativado** conforme esperado
4. Navegação mobile é **intuitiva e completa**

---

## 🖥️ Testes Desktop (Não-Regressão)

### Acesso e Autenticação

- [ ] Acessar `http://localhost:3000` (ou produção)
- [ ] Login com credenciais admin funciona
- [ ] Logout funciona e redireciona para login
- [ ] Proteção de rotas: acesso sem login redireciona para `/login`
- [ ] AdminRoute restringe acesso a páginas admin apenas para admins

### Navegação Desktop

- [ ] TopBar aparece e mostra nome do usuário
- [ ] Sidebar (menu lateral) tem todos os itens:
  - Dashboard
  - CRM
  - Tickets
  - Mensagens
  - Automação
  - Execuções
  - Performance de Agentes
  - Configurações
- [ ] Clicar em cada item navega corretamente
- [ ] Breadcrumbs aparecem (se houver)
- [ ] Logout funciona

### Página Dashboard

- [ ] KPIs carregam (convertidos, taxa conversão, ticket médio)
- [ ] Gráficos aparecem (LineChart, BarChart, etc)
- [ ] Não há erros no console
- [ ] Responsividade: em telas menores, gráficos redimensionam

### Página CRM

- [ ] Lista de clientes aparece com paginação
- [ ] Busca funciona (por nome, telefone, tag)
- [ ] Filtros funcionam (tags, source)
- [ ] Detalhes do cliente abrem ao clicar
- [ ] Botão "Nova Conversa" abre modal

### Página Mensagens (AgentMessages)

- [ ] Lista de conversas aparece
- [ ] Filtrar por tag funciona
- [ ] Clicar em conversa abre chat
- [ ] Enviar mensagem funciona (texto)
- [ ] Enviar mídia (imagem/áudio) funciona
- [ ] Quick replies aparecem e funcionam
- [ ] Notificação SSE chega em tempo real

### Página Baby Shower Events

- [ ] Lista de eventos aparece
- [ ] Criar novo evento formulário funciona
- [ ] Editar evento carrega dados
- [ ] Página pública (`/cha-de-bebe/:code`) funciona sem login
- [ ] Compra de produto funciona (fluxo completo)

### Página Configurações API

- [ ] API Evolution config salva corretamente
- [ ] Testar conexão funciona
- [ ] Status da conexão exibido

### Outras Rotas

- [ ] `/tickets` - lista e CRUD de atendimentos
- [ ] `/reports` - relatórios gerenciais
- [ ] `/automation` - editor React Flow carrega e edita fluxos
- [ ] `/executions` - execuções de fluxos
- [ ] `/agent-performance` - métricas de agentes
- [ ] `/settings/system` - monitoramento do sistema

### SSE (Server-Sent Events)

- [ ] Eventos de novas mensagens aparecem em tempo real
- [ ] Indicador de mensagens não lidas atualiza
- [ ] Notificações sonoras opcionais funcionam

---

## 📱 Testes Mobile (Smartphones e Tablets)

### Preparação

- [ ] Abrir Chrome DevTools → Device Toolbar
- [ ] Selecionar dispositivo: iPhone 12 Pro (390x844)
- [ ] Recarregar página (cache limpo)

### Layout e Navegação Mobile

- [ ] **Bottom navigation bar** aparece (fixed no bottom)
- [ ] Barra tem 4 ícones: Home, Mensagens, Contatos, Configurações
- [ ] Ativar cada ícone navega para a rota correta
- [ ] Active state destaca o ícone da página atual
- [ ] Sidebar NÃO aparece (escondida em mobile)
- [ ] TopBar reduzido: apenas logo e menu (se houver)

### Página Home (Mobile)

- [ ] Cards de KPIs aparecem em grid responsivo
- [ ] Últimas conversas aparecem com bubble preview
- [ ] Scroll suave
- [ ] Não há overflow horizontal

### Página Mensagens (Mobile)

- [ ] Lista de conversas aparece
- [ ] Clicar em conversa abre tela de chat full-screen
- [ ] Input de mensagem fixo no bottom (acima da nav bar)
- [ ] Enviar mensagem funciona (teclado Enter)
- [ ] Botão de anexo (paperclip) funciona
- [ ] Scroll no chat funciona com uma mão

### Página CRM (Mobile)

- [ ] Lista de clientes em cards ou linhas compactas
- [ ] Busca funciona
- [ ] Filtros acessíveis (pode esconder em menu)

### Página Baby Shower Event (Mobile) - Crítico

- [ ] Grid de produtos: 2 colunas (mobile), 3-4 (desktop)
- [ ] Cada card de produto mostra:
  - Imagem
  - Nome
  - Preço
  - Botão "Presentear"
- [ ] Botão "Presentear" tem hit area grande (≥44x44px)
- [ ] Tap no botão abre checkout modal
- [ ] Checkout modal é responsivo (full-screen no mobile)
- [ ] Formulário de checkout: campos (nome, telefone, quantidade)
- [ ] Submissão funciona e mostra confirmação
- [ ] Scroll funciona dentro do modal se conteúdo for longo

### Touch Feedback

- [ ] Botões respondem ao `:active` (mudam cor/scale imediatamente)
- [ ] Nenhum botão com hit area < 44x44px
- [ ] Sem "cliques fantasmas" (overlap de elementos)

### Performance Mobile

- [ ] First paint rápido (< 2s em 3G simulado)
- [ ] Nenhum erro de memória (Chrome DevTools → Memory)
- [ ] Nenhum layout shift (CLS ≈ 0)
- [ ] SSE conexão estabelece rapidamente

---

## 🧪 Testes de Fallback (Navegadores Antigos)

### Simulação

Usar Chrome DevTools → Network throttling + User Agent switcher, ou real IE11 se disponível.

### Teste 1: Navegador sem Promise

- [ ] Adicionar no console: `window.Promise = undefined; location.reload();`
- [ ] Esperar redirecionamento para `/fallback.html`
- [ ] Página de fallback carrega com mensagem clara
- [ ] Links para download de Chrome/Firefox/Edge funcionam

### Teste 2: Navegador sem fetch

- [ ] `window.fetch = undefined; location.reload();`
- [ ] Redirecionamento ocorre

### Teste 3: Navegador com user-agent IE11

- [ ] Usar extensão User-Agent Switcher para IE11
- [ ] Recarregar
- [ ] Redirecionamento automático para fallback

### Teste 4: Continuar sem redirecionamento (opcional)

- [ ] Remover script de detecção do index.html (temporariamente)
- [ ] Tentar usar app em IE11: deve haver erros claros no console
- [ ] Restaurar script

---

## 🎯 Testes de Responsividade

### Viewports a Testar (Chrome DevTools Device Toolbar)

| Dispositivo | Resolução | Orientação | Resultado Esperado |
|-------------|-----------|------------|-------------------|
| iPhone SE 1ª | 320x568 | Portrait | Layout OK, sem overflow |
| iPhone 12 Pro | 390x844 | Portrait | Bottom nav visível |
| iPhone 12 Pro | 844x390 | Landscape | Bottom nav ainda visível (pode mudar para top?) |
| iPad Mini | 768x1024 | Portrait | Sidebar aparece? |
| iPad Pro 11" | 834x1194 | Portrait | Layout adaptado |
| Chromebook | 1366x768 | Landscape | Desktop layout (sidebar) |
| Desktop Full HD | 1920x1080 | Landscape | Desktop layout |
| Ultrawide | 3440x1440 | Landscape | Conteúdo centralizado, max-width |

### Testes em Cada Viewport

- [ ] Não há scroll horizontal
- [ ] Containers respeitam padding reduzido no mobile
- [ ] Fontes legíveis (min 14px)
- [ ] Grids usam colunas apropriadas (2-4)
- [ ] Images não estouram container
- [ ] Modais são full-screen ou centered com overlay

---

## 🔄 Testes de Mobile Sync

### Pré-requisitos

- [ ] API Evolution configurada e conectada
- [ ] WhatsApp number vinculado à plataforma
- [ ] SSE conectado (ícone de conexão verde)

### Teste de Envio via WhatsApp

1. No WhatsApp real (ou Evolution API worker), enviar mensagem para o número da plataforma
   - Mensagem: "Teste mobile sync [timestamp]"
2. Observar:
   - [ ] Mensagem aparece na plataforma em ~2-5 segundos
   - [ ] SSE notifica (som/visual)
   - [ ] Notificação no TopBar (badge count) incrementa
   - [ ] Ao abrir a conversa, a mensagem está lá
   - [ ] Se a conversa não existir, é criada automaticamente
   - [ ] Cliente é criado/identificado automaticamente

### Teste de Mídia (Imagem)

1. Enviar imagem via WhatsApp
   - [ ] Imagem aparece na plataforma
   - [ ] Imagem é servida via R2 (Cloudflare) ou backend proxy
   - [ ] Click na imagem abre em tamanho maior

### Teste de Duplicação

1. Enviar a mesma mensagem (mesmo externalId) duas vezes
   - [ ] Segunda mensagem NÃO é duplicada (ignorada)
   - [ ] Logs mostram "duplicate message ignored"

---

## ⚡ Performance e Lighthouse

### Lighthouse Mobile (Chrome DevTools)

- [ ] **Performance** > 85
- [ ] **Accessibility** > 90
- [ ] **Best Practices** > 90
- [ ] **SEO** > 80 (não crítico)
- [ **First Contentful Paint** < 1.5s
- [ ] **Largest Contentful Paint** < 2.5s
- [ ] **Time to Interactive** < 3.5s

### Bundle Size

```bash
pnpm build
ls -lh dist/public/assets/index-*.js
```

- [ ] Bundle principal < 500KB gzipped
- [ ] Não há erros de "chunk too large" (warning ok, mas ideal < 1MB)

---

## 🐛 Issues Conhecidas (Não Bloqueiam Lançamento)

| Issue | Descrição | Workaround |
|-------|-----------|------------|
| MOB-001 | Animação em hover Safari iOS <14 causa crash | Desabilitar animações via CSS media query (já feito) |
| MOB-002 | Drag & drop React Flow difícil em touch | Adicionar botões de zoom/pan alternativos (planejado v2.1) |
| MOB-003 | SSE reconnect instável em iOS 14-15 | Implementar polling fallback (feito em useSSE hook) |

---

## ✅ Checklist Final de Deploy

- [ ] Todos os testes manuais acima passaram
- [ ] Build de produção executado (`pnpm build`) sem erros
- [ ] Bundle size verificado
- [ ] Commit pushado para main (`git log -1` mostra feat(mobile))
- [ ] GitHub Actions CI passou (se houver)
- [ ] Banco de dados migrado (se houver novas migrations)
- [ ] MobileSync worker rodando (se部署)
- [ ] Domínio configurado com SSL (HTTPS)
- [ ] Fork do Evolution API configurado com webhook
- [ ] Telemetria (Google Analytics) rastreando device type

---

## 📞 Report de Bugs

Se encontrar problemas durante os testes, registrar no GitHub Issues com:
- **Label:** `mobile`, `bug`
- **Template:** Preencher passos para reproduzir
- **Ambiente:** iOS Safari 17 / Chrome Mobile 120 / etc
- **Screenshot/Vídeo:** Anexar se possível

---

**Checklist assinado por:** ___________________
**Data de conclusão:** ___/___/_______
**Status final:** ☐ Pendente ☐ Aprovado com ressalvas ✅ Aprovado
