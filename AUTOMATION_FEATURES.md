# Automação Farma Francis - Recursos (Tipo n8n)

Plataforma de automação e integração com fluxos personalizados, permitindo conectar sistemas, APIs, bancos de dados, serviços externos e lógica avançada — tudo sem código ou com código opcional.

## 🚀 Capacidades Gerais

O sistema opera com três pilares:
- **Nodes (nós)** → Blocos que executam ações.
- **Triggers (gatilhos)** → Eventos que iniciam fluxos.
- **Executions** → Execução completa do fluxo.

---

## 🎯 1. TRIGGERS (Gatilhos)

### 1.1 HTTP Trigger
- Cria endpoint público.
- Recebe requisições GET, POST, PUT, DELETE.
- Processa JSON, formulário, cabeçalhos e anexos.
- Integração com WordPress, sistemas internos, ERPs, CRMs.

### 1.2 Webhook Trigger
- Foco em eventos externos.
- Captura notificações de pagamentos, mensagens de WhatsApp/chatbots, eventos de Instagram, Facebook, Slack.

### 1.3 Cron Trigger
- Agenda automações:
  - A cada 1 minuto, hora, diariamente, dias específicos.
  - Intervalos personalizados.

### 1.4 Interval Trigger
- Executa ações a cada X minutos/horas (ideal para monitoramento).

---

## 🧠 2. FUNÇÕES DE PROCESSAMENTO DE DADOS

### 2.1 Function Node
- Executa JavaScript personalizado.
- Criação de lógica avançada: cálculos, regras de negócio, loops, transformações complexas.

### 2.2 Function Item Node
- Aplica código por item (ideal para processamento em massa).

### 2.3 IF Node
- Criação de condições (verdadeiro/falso).
- Filtra dados e direciona o fluxo.

### 2.4 Switch Node
- Seleciona caminhos diferentes conforme valores (ex: status de pedido, categorias, tipos de leads).

### 2.5 Set Node
- Cria e altera campos.
- Adiciona variáveis e manipula JSON.

### 2.6 Merge Node
- Une dados em paralelo, sequência, combinando arrays, sincronizando fontes diferentes.

### 2.7 Split In Batches
- Quebra listas grandes em lotes.
- Evita limites de API, envia mensagens/email individualmente, processa leads em fila.

### 2.8 Code Node
- Lógica avançada em JavaScript sem limitações (acesso total ao runtime).

---

## 🔗 3. INTEGRAÇÕES COM SISTEMAS & APIS

### 3.1 HTTP Request Node
- Mais poderoso e versátil: consome qualquer API REST (GET, POST, PUT, DELETE).
- Autenticação: Token, Bearer, Basic Auth, OAuth2.
- Envia e recebe arquivos.
- Integração com: SISTEMA FARMA FRANCIS PRO, ERPs, serviços de WhatsApp, gateways de pagamento.

### 3.2 Webhook Response
- Responde para quem chamou o webhook (mensagem, JSON, anexos, status HTTP).

### 3.3 GraphQL Node
- Consulta APIs GraphQL (ideal para plataformas modernas).

---

## 🗄 4. BANCO DE DADOS

### 4.1 MySQL Node
- Select, Insert, Update, Delete.
- Perfeito para sistemas como CRM, estoque e vendas.

### 4.2 PostgreSQL Node
- Funcionalidades idênticas ao MySQL, com suporte a JSONB.

### 4.3 SQLite Node
- Banco leve interno para armazenar status e logs.

---

## 🛠 5. OUTRAS FUNCIONALIDADES

- **Delay Node**: Aguarda tempo específico antes do próximo nó.
- **Transfer Node**: Transfere atendimento para humanos ou outras filas.
- **Notification Node**: Envia notificações em tempo real via SSE.
- **AI Node**: Integração com modelos de IA (GPT, Claude) para processamento de linguagem natural, classificação de intenção, recomendações.

---

## ✅ STATUS DE IMPLEMENTAÇÃO

| Funcionalidade | Status | Local |
|---------------|--------|-------|
| HTTP Trigger | ✅ Implementado | `FlowBuilder.tsx`, `automation-engine.ts` |
| Webhook Trigger | ✅ Implementado | `FlowBuilder.tsx`, `automation-engine.ts` |
| Cron Trigger | ✅ Implementado | `FlowBuilder.tsx`, `automation-engine.ts` |
| IF Node | ✅ Implementado | `automation-engine.ts` (executeIf) |
| Set Node | ✅ Implementado | `automation-engine.ts` (executeSet) |
| Function/Code Node | ✅ Implementado | `automation-engine.ts` (executeFunction) |
| HTTP Request Node | ✅ Implementado | `automation-engine.ts` (executeHttpRequest) |
| MySQL/PostgreSQL | ✅ Implementado | `automation-engine.ts` (executeMySqlQuery, executePostgreSqlQuery) |
| GraphQL Node | ✅ Implementado | `automation-engine.ts` (executeGraphQLQuery) |
| Switch Node | ✅ Implementado | `automation-engine.ts` (executeSwitch) |
| Merge/Split | ✅ Implementado | `automation-engine.ts` (executeMerge, executeSplitInBatches) |
| Webhook Response | ✅ Implementado | `automation-engine.ts` (executeWebhookResponse) |

---

**Nota:** Todas as funcionalidades listadas estão implementadas e prontas para uso na plataforma Farma Francis. O sistema utiliza React Flow para o editor visual e um motor de execução customizado no backend.

## 📧 5. EMAIL & COMUNICAÇÃO
### 5.1 Email Send
- SMTP (Gmail, Outlook, etc.)
- Anexos, templates HTML.

### 5.2 IMAP/POP3 Email Trigger
- Lê caixas de entrada, processa anexos.

## 💬 6. MENSAGERIA & REDES SOCIAIS
### 6.1 WhatsApp Node
- Envio de mensagens, consulta status, webhooks.

### 6.2 Telegram Node
- Bots, comandos, mensagens.

### 6.3 Slack Node
- Notificações, upload de arquivos.

### 6.4 Discord Node
- Bots, alertas.

## ☁️ 7. NUVEM & ARMAZENAMENTO
### 7.1 Google Drive Node
- Pastas, upload, listagem.

### 7.2 Amazon S3 / MinIO
- Buckets, arquivos.

### 7.3 Dropbox Node
- Uploads, backup.

## 📎 8. GESTÃO DOCUMENTAL
### 8.1 Read/Write Binary File
- PDFs, imagens, planilhas.

### 8.2 Convert Binary to JSON
- Conversão de planilhas, PDFs.

## 🧮 9. LÓGICA AVANÇADA
### 9.1 Regex Node
- Extração de padrões.

### 9.2 Date & Time Node
- Manipulação de datas.

### 9.3 Math Node
- Operações matemáticas.

## 🔐 10. SEGURANÇA
### 10.1 API Key Vault
- Armazena tokens, chaves.

### 10.2 Credentials
- Autenticação: Basic, OAuth2, Token.

## 📊 11. MONITORAMENTO & LOGS
### 11.1 Execution History
- Log completo: inputs, outputs, erros, tempo.

### 11.2 Executions Control
- Repetir, pausar, reexecutar.

## 🎛 12. ORQUESTRAÇÃO DE PROCESSOS
### 12.1 Sub-Workflows
- Automações reutilizáveis.

### 12.2 Error Workflow
- Fluxos para tratar erros.

## 🧠 13. INTELIGÊNCIA ARTIFICIAL
### 13.1 OpenAI Node
- GPT para resumos, classificação, geração.

### 13.2 HuggingFace Node
- Modelos de IA: visão, sentimento.

## ✨ 14. EXEMPLOS PRONTOS
- Capturar leads do Instagram → CRM.
- Pedidos via WhatsApp → Sistema.
- Backup diário em S3.
- Sincronização de bancos via API.
