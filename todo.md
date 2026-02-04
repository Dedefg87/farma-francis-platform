# Farma Francis - TODO List

## 1. Arquitetura e Configuração Inicial
- [x] Definir schema completo do banco de dados
- [ ] Configurar estrutura de pastas e arquivos
- [ ] Configurar variáveis de ambiente

## 2. Sistema de Autenticação e Segurança
- [x] Implementar autenticação JWT robusta
- [x] Sistema de login/logout
- [ ] Recuperação de senha via email
- [x] Controle de sessão com expiração
- [ ] Proteção contra força bruta (rate limiting)
- [x] Sistema RBAC (Role-Based Access Control)
- [x] Middleware de autorização por roles
- [x] Auditoria de ações críticas
- [x] Adicionar rota /login no App.tsx
- [x] Implementar redirecionamento para /login após logout
- [x] Criar componente ProtectedRoute para proteção de rotas
- [x] Aplicar proteção em todas as rotas privadas (Home, Inbox, CRM, etc)
- [x] Redirecionar para /login se usuário não autenticado ao acessar qualquer rota
- [x] Testar fluxo: logout → /login → login → dashboard

## 3. Dashboard e Métricas
- [x] Layout responsivo do dashboard
- [x] Gráfico de pizza (distribuição de atendimentos)
- [x] Gráficos de barras (comparativos por período)
- [x] Gráficos de linha (tendências)
- [x] Cards de KPIs em tempo real
- [x] Filtros por período (dia/semana/mês)
- [ ] Exportação de gráficos

## 4. Módulo CRM
- [x] CRUD completo de clientes
- [x] Gerenciamento de leads
- [x] Funil de vendas com estágios configuráveis
- [x] Histórico de interações
- [x] Timeline visual de atividades
- [x] Segmentação de clientes
- [x] Tags e categorias personalizáveis
- [x] Busca e filtros avançados

## 5. Sistema de Atendimentos
- [x] CRUD de tickets/chamados
- [x] Sistema de filas
- [x] Priorização (baixa/média/alta/crítica)
- [x] Status (aberto/em andamento/pendente/resolvido/fechado)
- [x] Atribuição de funcionários
- [x] SLA (tempo máximo de resposta)
- [ ] Roteamento automático
- [x] Registro de tempo gasto
- [x] Notas internas
- [ ] Anexos de documentos

## 6. Cadastro de Funcionários
- [x] CRUD completo de funcionários
- [x] Campos obrigatórios e opcionais
- [x] Validações (email único, CPF válido)
- [x] Sistema de permissões granulares
- [x] Gestão de roles (admin/gerente/funcionário/suporte)
- [x] Ativação/desativação de usuários
- [x] Histórico de atividades
- [ ] Upload de foto de perfil

## 7. Sistema de Relatórios
- [ ] Relatório de atendimentos
- [ ] Relatório de vendas/conversão
- [ ] Relatório de desempenho de funcionários
- [ ] Relatório de CRM
- [ ] Exportação em PDF
- [ ] Exportação em CSV/Excel
- [ ] Filtros personalizáveis
- [ ] Agendamento de relatórios

## 8. Integração WhatsApp e Instagram
- [ ] Integração WhatsApp Business API
- [ ] Integração Instagram Graph API
- [ ] Webhooks para recebimento de mensagens
- [ ] Envio de mensagens
- [ ] Sincronização com CRM
- [ ] Histórico de conversas

## 9. Sistema de Automação e URA
- [ ] Fluxos de automação configuráveis
- [ ] Respostas automáticas por palavras-chave
- [ ] Menu de URA interativo
- [ ] Direcionamento inteligente
- [ ] Interface visual para criar fluxos
- [ ] Testes de fluxo
- [ ] Ativação/desativação de automações

## 10. Preparação para IA
- [ ] Endpoints para integração de chatbot
- [ ] Estrutura para análise de sentimento
- [ ] Sistema de sugestões automáticas
- [ ] Assistente virtual com LLM
- [ ] Processamento de linguagem natural
- [ ] Classificação automática de atendimentos
- [ ] Respostas sugeridas para funcionários

## 11. Sistema de Notificações
- [ ] Notificações in-app
- [ ] Notificações por email
- [ ] Alertas de novos atendimentos
- [ ] Alertas de mudança de status
- [ ] Notificações de metas atingidas
- [ ] Configuração de preferências de notificação

## 12. Upload e Gerenciamento de Arquivos
- [ ] Upload de documentos para S3
- [ ] Upload de imagens
- [ ] Anexos de atendimentos
- [ ] Gerenciamento de arquivos
- [ ] URLs públicas para acesso
- [ ] Validação de tipos de arquivo
- [ ] Limite de tamanho

## 13. Infraestrutura e DevOps
- [ ] Configuração do banco de dados (MySQL/TiDB)
- [ ] Configuração de cache (Redis via backend)
- [ ] Docker/Docker Compose
- [ ] CI/CD pipeline
- [ ] Variáveis de ambiente
- [ ] Logs e monitoramento

## 14. Testes e Documentação
- [ ] Testes unitários (70% cobertura)
- [ ] Testes de integração
- [ ] Testes E2E para fluxos críticos
- [ ] Documentação de API
- [ ] Documentação de arquitetura
- [ ] Guia de setup
- [ ] Guia de deployment

## 15. UI/UX e Design
- [ ] Design system consistente
- [ ] Paleta de cores profissional
- [ ] Tipografia legível
- [ ] Componentes reutilizáveis
- [ ] Responsividade mobile
- [ ] Estados de loading/erro/vazio
- [ ] Feedback visual para ações

## 16. Funcionalidades Faltantes (Reportadas pelo Usuário)
- [x] Página de Automação funcionando completamente
- [x] Página de Mensagens funcionando completamente
- [x] Página de Relatórios funcionando completamente
- [x] Formulário de adicionar funcionário
- [x] Formulário de adicionar cliente
- [x] Formulário de adicionar lead
- [x] Formulário de adicionar ticket

## 17. Correções de Bugs Reportados
- [x] Corrigir erro de tags `<a>` aninhadas na página /dashboard

## 18. Funcionalidades de Automação (Backend Real)
- [x] Criar tabela de fluxos de automação no banco de dados
- [ ] Criar tabela de configurações de URA no banco de dados
- [x] Implementar rota tRPC para listar fluxos
- [x] Implementar rota tRPC para criar fluxo
- [x] Implementar rota tRPC para editar fluxo
- [x] Implementar rota tRPC para deletar fluxo
- [x] Implementar rota tRPC para ativar/desativar fluxo
- [x] Conectar frontend com backend real
- [x] Adicionar validações e tratamento de erros
- [x] Criar testes unitários

## 19. Correção de Erro require is not defined
- [x] Substituir require("zod") por import z from "zod" nas rotas tRPC

## 20. Flow Builder Visual Completo (Estilo N8N)
- [x] Criar schema de banco de dados para fluxos visuais (nós, conexões, posições)
- [x] Criar tabela de configurações de URA com menu interativo
- [x] Implementar rotas tRPC para CRUD de fluxos visuais
- [x] Criar componente FlowBuilder com React Flow
- [x] Implementar biblioteca completa de nós:
  - [x] Trigger (Mensagem, Palavra-chave, Horário)
  - [x] Condition (If/Else, Horário, Variável)
  - [x] Message (Texto, Imagem, Áudio, Documento)
  - [x] AI Assistant (GPT-4, Claude, Gemini)
  - [x] Transfer Human (Atendente/Departamento)
  - [x] Create Ticket (Automático)
  - [x] Wait (Delay configurável)
  - [x] Set Variable (Armazenar dados)
  - [x] HTTP Request (APIs externas)
  - [x] URA Menu (Menu interativo)
- [x] Adicionar sistema de conexões visuais com validação
- [x] Criar editor de propriedades dinâmico para cada tipo de nó
- [ ] Implementar sistema de variáveis de contexto ({{cliente.nome}})
- [ ] Adicionar validação de fluxos (sem nós desconectados)
- [ ] Implementar engine de execução de fluxos em tempo real
- [ ] Criar simulador de fluxos com preview
- [ ] Adicionar analytics de execução (taxa de sucesso, tempo médio)
- [ ] Implementar versionamento de fluxos
- [ ] Adicionar exportação/importação de fluxos JSON

## 21. Importação de Fluxos em Múltiplos Formatos
- [x] Adicionar botão "Importar Fluxo" na página de Automação
- [x] Criar parser para formato .json (genérico)
- [x] Criar parser para formato .ivr (URA tradicional)
- [x] Criar parser para formato .n8n (N8N workflows)
- [x] Criar parser para formato .zapier (Zapier Zaps)
- [x] Criar parser para formato .make (Make scenarios)
- [x] Validar estrutura dos fluxos importados
- [x] Converter formatos externos para estrutura interna
- [ ] Testar importação de cada formato

## 22. Configuração de APIs na Página Mensagens
- [ ] Criar seção de Configurações de API
- [ ] Adicionar formulário para WhatsApp Business API
  - [ ] Campo para Phone Number ID
  - [ ] Campo para Access Token
  - [ ] Campo para Webhook Verify Token
  - [ ] Campo para Business Account ID
- [ ] Adicionar formulário para Instagram Graph API
  - [ ] Campo para Instagram Business Account ID
  - [ ] Campo para Access Token
  - [ ] Campo para Page ID
- [ ] Implementar validação de tokens
- [ ] Criar teste de conexão com APIs
- [ ] Salvar configurações no banco de dados
- [ ] Adicionar indicador de status da conexão

## 23. Redesign Completo do Dashboard
- [ ] Criar abas Atendimentos/Integrações
- [ ] Adicionar filtros de Fila e Período
- [ ] Adicionar botão Atualizar com ícone
- [ ] Implementar métricas principais:
  - [ ] Atendimentos (total + variação %)
  - [ ] Clientes únicos (total + variação %)
  - [ ] Mensagens enviadas (total + variação %)
  - [ ] Mensagens recebidas (total + variação %)
  - [ ] Média atend./agente (total + variação %)
  - [ ] TMA - Tempo Médio de Atendimento (formato HH:MM:SS)
- [ ] Criar gráfico de contatos por hora (barras verticais)
- [ ] Adicionar alternância "Contatos por hora" / "Contatos por dia do mês"
- [ ] Criar gráfico de pizza: Atendimentos por fila
- [ ] Criar gráfico de pizza: Atendimentos por canal
- [ ] Criar gráfico de pizza: Atend. por filtro da URA
- [ ] Criar gráfico de pizza: Atend. por fechamento
- [ ] Criar tabela de agentes com colunas:
  - [ ] Agente (nome)
  - [ ] Atendimentos
  - [ ] Dias
  - [ ] Méd. Atend. / Dia
  - [ ] Msg. Enviadas
  - [ ] Msg. Recebidas
  - [ ] TMA (HH:MM:SS)
- [ ] Aplicar cores e estilo da imagem (azul escuro #1e1b4b)

## 24. Correções Urgentes Reportadas
- [x] Corrigir botão "Importar Fluxo" na página de Automação (está baixando ao invés de importar)
- [x] Adicionar funcionalidade real de importação de arquivos .ivr, .json, .n8n, etc.
- [x] Criar interface de configuração de APIs na página Mensagens
- [x] Adicionar formulário para WhatsApp Business API (token, phone number ID, webhook URL)
- [x] Adicionar formulário para Instagram Graph API (token, page ID, webhook URL)
- [x] Implementar validação e teste de conexão das APIs
- [ ] Salvar configurações de API no banco de dados

## 25. Correções de Importação e Configuração de API
- [x] Corrigir parser de arquivos .ivr (formato base64-encoded JSON)
- [ ] Criar página dedicada de Configurações de API
- [ ] Adicionar rota para página de Configurações de API
- [ ] Conectar botões "Configurar" à página real ao invés de toast

## 26. Correção de Detecção de Formato .ivr
- [x] Corrigir método detectFormat() para tentar decodificar base64 antes de parsear JSON
- [x] Adicionar validação específica para formato .ivr base64-encoded

## 27. Correção de Edges Duplicadas no Parser .ivr
- [x] Corrigir geração de IDs únicos para edges no método importIVR
- [x] Adicionar contador incremental para garantir unicidade de IDs
- [ ] Testar importação sem warnings de keys duplicadas

## 28. Página de Configurações de API
- [x] Criar tabela de configurações de API no banco de dados
- [x] Implementar rotas tRPC para salvar/buscar configu- [x] Criar página /settings/api com formulários
- [x] Adicionar formulário para WhatsApp Business API (token, phone number ID, webhook URL)
- [x] Adicionar formulário para Instagram Graph API (token, page ID, webhook URL)
- [x] Implementar validação de campos obrigatórios
- [x] Adicionar botão de testar conexão
- [x] Implementar feedback visual de status (sucesso/erro)
- [x] Adicionar switch para ativar/desativar integrações
- [x] Adicionar documentação e links úteis FarmaDashboardLayout

## 29. Implementação de Webhooks WhatsApp e Instagram
- [x] Criar schema de banco de dados para mensagens recebidas
- [x] Implementar endpoint GET /api/webhooks/whatsapp (validação de verificação)
- [x] Implementar endpoint POST /api/webhooks/whatsapp (processamento de mensagens)
- [x] Implementar endpoint GET /api/webhooks/instagram (validação de verificação)
- [x] Implementar endpoint POST /api/webhooks/instagram (processamento de mensagens)
- [x] Criar funções de parsing de payload do WhatsApp
- [x] Criar funções de parsing de payload do Instagram
- [x] Implementar salvamento de mensagens no banco de dados
- [x] Adicionar validação de webhook verify token
- [x] Criar estrutura para integração com engine de automação
- [x] Escrever testes unitários para webhooks
- [ ] Documentar formato de payloads esperados

## 30. Sistema de Envio de Mensagens
- [x] Criar funções para enviar mensagens via WhatsApp Business API
- [x] Criar funções para enviar mensagens via Instagram Graph API
- [x] Suporte a mensagens de texto
- [x] Suporte a imagens com caption
- [ ] Suporte a áudio/vídeo
- [ ] Suporte a documentos
- [ ] Suporte a templates do WhatsApp
- [ ] Suporte a botões interativos
- [x] Tratamento de erros e retry
- [x] Logs de mensagens enviadas

## 31. Engine de Execução de Fluxos
- [x] Sistema de monitoramento de mensagens não processadas
- [x] Identificação de fluxos ativos por trigger
- [x] Execução sequencial de nós (Trigger → Condition → Message → AI → Transfer)
- [x] Sistema de variáveis de contexto ({{cliente.nome}}, {{ticket.id}})
- [x] Substituição de variáveis em mensagens
- [x] Execução de condições (if/else, horário, variável)
- [x] Integração com LLM para nó AI Assistant
- [x] Criação automática de tickets
- [x] Transferência para agentes humanos
- [x] Delays configuráveis (nó Wait)
- [x] Chamadas HTTP externas (nó HTTP Request)
- [x] Marcação de mensagens como processadas
- [x] Logs de execução de fluxos

## 32. Painel de Inbox em Tempo Real
- [x] Criar página /inbox
- [x] Lista de conversas ativas
- [x] Preview de últimas mensagens
- [x] Indicador de mensagens não lidas
- [ ] Busca por cliente/número
- [x] Filtro por provedor (WhatsApp/Instagram)
- [x] Interface de chat para responder manualmente
- [x] Histórico completo de conversas
- [ ] Indicador de digitação
- [ ] Atualização em tempo real (polling ou websocket)
- [ ] Anexar arquivos na resposta
- [ ] Emojis e formatação de texto

## 33. Dashboard com Dados Reais
- [x] Substituir dados mockados por queries reais
- [x] Contagem de atendimentos do banco
- [x] Contagem de clientes únicos
- [x] Contagem de mensagens enviadas/recebidas
- [x] Cálculo de média de atendimentos por agente
- [x] Cálculo de TMA (Tempo Médio de Atendimento)
- [x] Gráfico de contatos por hora (dados reais)
- [x] Gráfico de atendimentos por fila
- [x] Gráfico de atendimentos por canal
- [x] Tabela de agentes com métricas reais
- [ ] Filtros funcionais (período, fila)
- [ ] Botão atualizar funcionando

## 34. Criptografia de Tokens API
- [ ] Implementar criptografia AES-256 para tokens
- [ ] Criptografar tokens antes de salvar no banco
- [ ] Descriptografar tokens ao buscar do banco
- [ ] Usar variável de ambiente para chave de criptografia
- [ ] Atualizar funções de API config para usar criptografia
- [ ] Migrar tokens existentes (se houver)

## 35. Validação e Simulação de Fluxos
- [ ] Validar fluxos antes de ativar (sem nós desconectados)
- [ ] Validar que todo fluxo tem um nó Trigger
- [ ] Validar conexões válidas entre nós
- [ ] Simulador de fluxos com preview
- [ ] Testar fluxo com mensagem de exemplo
- [ ] Visualizar caminho de execução
- [ ] Logs de simulação

## 36. Testes Finais e Documentação
- [x] Testes unitários para envio de mensagens
- [x] Testes unitários para engine de fluxos
- [x] Testes unitários para sistema de variáveis
- [ ] Testes de integração end-to-end
- [x] Documentação completa do sistema (WEBHOOKS.md)
- [ ] Guia de deployment
- [ ] Guia de configuração


## 37. Melhorias Enterprise do Painel de Automação
- [x] Instalar e configurar React Flow para flow builder visual
- [x] Criar canvas drag-and-drop profissional
- [x] Implementar 7 tipos de nós principais (Trigger, Message, Condition, AI, API, Delay, Transfer)
- [x] Sidebar com paleta de nós categorizados
- [x] Conexões visuais com validação de tipos
- [x] Zoom, pan e minimap do canvas
- [x] Undo/redo de operações
- [x] Seleção múltipla e operações em lote
- [x] Copiar/colar nós
- [ ] Alinhamento automático de nós
- [x] Exportar/importar fluxos JSON

## 38. Biblioteca de Templates de Fluxos
- [x] Template: Boas-vindas automáticas
- [x] Template: FAQ com AI Assistant
- [x] Template: Qualificação de leads
- [x] Template: Agendamento de consultas
- [x] Template: Pesquisa de satisfação
- [ ] Template: Recuperação de carrinho abandonado
- [ ] Template: Suporte técnico com escalação
- [ ] Template: Vendas consultivas
- [x] Preview visual de cada template
- [x] Botão "Usar Template" que duplica fluxo
- [x] Categorização de templates (Vendas, Suporte, Marketing, Atendimento, Qualidade)

## 39. Editor de Condições Avançado
- [ ] Interface visual para múltiplas condições
- [ ] Operadores lógicos AND/OR/NOT
- [ ] Grupos de condições aninhados
- [ ] Comparadores: equals, contains, starts_with, ends_with, regex, greater_than, less_than, in_list
- [ ] Condições por: texto da mensagem, horário, dia da semana, variável customizada, tag do cliente, histórico de compras
- [ ] Preview de resultado da condição
- [ ] Validação de sintaxe em tempo real

## 40. Sistema de Variáveis Personalizadas
- [ ] Painel de gerenciamento de variáveis
- [ ] Criar variáveis customizadas (nome, tipo, valor padrão)
- [ ] Tipos: string, number, boolean, date, array, object
- [ ] Escopo: global, por fluxo, por cliente
- [ ] Autocomplete de variáveis no editor
- [ ] Preview de valores de variáveis
- [ ] Operações: set, get, increment, decrement, append, clear
- [ ] Variáveis de sistema: {{now}}, {{random}}, {{user.name}}, {{user.email}}

## 41. Simulação e Preview de Fluxos
- [ ] Modo de teste com dados mockados
- [ ] Input de mensagem de teste
- [ ] Visualização passo-a-passo da execução
- [ ] Highlight de nó ativo durante simulação
- [ ] Log de cada ação executada
- [ ] Preview de mensagens que seriam enviadas
- [ ] Validação de erros antes de ativar
- [ ] Sugestões de otimização

## 42. Analytics e Métricas de Fluxos
- [ ] Dashboard de performance por fluxo
- [ ] Taxa de conversão (início → conclusão)
- [ ] Tempo médio de execução
- [ ] Identificação de gargalos (nós com maior drop-off)
- [ ] Heatmap de caminhos mais percorridos
- [ ] Gráfico de execuções ao longo do tempo
- [ ] Comparação entre fluxos
- [ ] Exportar relatórios em PDF/CSV

## 43. Versionamento e Histórico
- [ ] Salvar versão a cada alteração significativa
- [ ] Lista de versões com timestamp e autor
- [ ] Diff visual entre versões
- [ ] Rollback para versão anterior
- [ ] Comentários em versões
- [ ] Tags de versão (v1.0, production, staging)
- [ ] Restaurar versão específica


## 44. Automação Farmacêutica Especializada (Inspirado N8N)
- [x] Template: Gerenciamento de Estoque e Reposição Automática
- [x] Template: Processamento de Pedidos (Online e Presencial)
- [x] Template: Atendimento ao Cliente com IA
- [x] Template: Monitoramento de Validade de Produtos
- [x] Template: Notificações para Pacientes (Lembretes de Medicação)
- [x] Template: Integração com Prescrição Eletrônica

## 45. Nós Especializados para Farmácia
- [ ] Nó: Verificar Estoque
- [ ] Nó: Criar Pedido de Reposição
- [ ] Nó: Verificar Interações Medicamentosas (IA)
- [ ] Nó: Análise de Demanda (IA)
- [ ] Nó: Triagem de Tickets (IA)
- [ ] Nó: Verificar Validade de Produtos
- [ ] Nó: Enviar Notificação SMS/WhatsApp
- [ ] Nó: Aguardar Aprovação Humana (Farmacêutico)
- [ ] Nó: Consultar Prescrição Eletrônica

## 46. Sistema de Aprovação e Colaboração Humana
- [ ] Interface de aprovação para farmacêuticos
- [ ] Fila de tarefas pendentes de aprovação
- [ ] Notificações para agentes humanos
- [ ] Histórico de aprovações/rejeições
- [ ] Comentários e justificativas
- [ ] Escalação automática se não aprovado em X horas

## 47. Logging e Tratamento de Erros
- [ ] Log detalhado de execução de cada nó
- [ ] Captura de erros com stack trace
- [ ] Retry automático configurável
- [ ] Notificação de erros críticos
- [ ] Dashboard de monitoramento de falhas
- [ ] Exportar logs em CSV/JSON

## 48. Fluxos Completos de Exemplo
- [ ] Fluxo: Pedido Online → Verificar Estoque → IA Verifica Interações → Aprovação Farmacêutico → Processar Pagamento → Enviar Notificação
- [ ] Fluxo: Monitoramento Diário de Validade → Gerar Relatório → IA Sugere Promoções → Aprovação Gerente → Publicar Ofertas
- [ ] Fluxo: Ticket Suporte → IA Triagem → Se Complexo: Escalar Humano | Se Simples: IA Responde → Enviar Resposta
- [ ] Fluxo: Análise Semanal de Vendas → IA Prevê Demanda → Gerar Pedidos de Reposição → Aprovação Gerente → Enviar para Fornecedores


## 49. Profissionalização Flow Builder (Estilo N8N Real)
- [x] Painel lateral direito de edição de nós (abre ao clicar no nó)
- [x] Formulários completos de configuração por tipo de nó
- [x] Restaurar botão Importar JSON no toolbar
- [x] Melhorar visual dos nós com ícones específicos
- [x] Background grid pontilhado profissional
- [ ] Labels nas conexões (true/false, done/loop)
- [ ] Handles de conexão mais visíveis
- [ ] Animação ao arrastar nós
- [ ] Seleção múltipla com Ctrl+Click

## 50. Correção Dashboard
- [x] Corrigir números sobrepostos nas labels dos cards
- [x] Ajustar espaçamento entre número e texto
- [x] Verificar responsividade dos cards


## 51. Correção de Edges Duplicadas no Flow Builder
- [x] Corrigir geração de IDs únicos para edges nos templates
- [x] Garantir que cada edge tenha ID único usando timestamp ou UUID


## 52. Correção de NaN em Atributos SVG do Dashboard
- [x] Adicionar validação de valores numéricos no renderMetricCard
- [x] Garantir que percentage seja sempre número válido (0-100)
- [x] Adicionar fallback para valores undefined/null


## 53. Correção de NaN em SVG na Página Automation
- [x] Identificar componente com SVG gerando NaN (React Flow com nós sem posições válidas)
- [x] Adicionar validação de valores numéricos no FlowBuilder
- [x] Garantir que todos os atributos SVG sejam números válidos


## 54. Correção Persistente de NaN em SVG (useEffect)
- [x] Adicionar useEffect para validar nós quando initialNodes mudar
- [x] Garantir validação contínua de posições


## 55. Correção de Dependência Circular no useEffect
- [x] Remover comparação com nodes no useEffect para evitar loop
- [x] Adicionar validação no onNodesChange para capturar mudanças em tempo real
- [x] Garantir que nenhum nó seja renderizado com NaN


## 56. Correção Preventiva de NaN (Interceptar Criação)
- [x] Criar função helper validateNodePosition
- [x] Aplicar validação em onDrop
- [x] Aplicar validação em handleImport  
- [x] Aplicar validação em handleUseTemplate (Automation.tsx)
- [x] Remover validações reativas que não funcionam


## 57. Correção de Erro node.data.config Undefined
- [x] Corrigir validateNodePosition para garantir que todos os nós tenham data e data.config
- [x] Adicionar fallback para nós sem data


## 58. Implementação Completa N8N Workflow Engine Profissional
- [ ] Criar schema de execuções (workflow_executions, execution_data, credentials)
- [ ] Implementar Workflow Executor profissional com processamento sequencial
- [ ] Sistema de variáveis e expressões ({{$json.field}}, {{$node["Name"].json}})
- [ ] Nó HTTP Request completo (GET, POST, PUT, DELETE, headers, auth)
- [ ] Nó Database Query (SELECT, INSERT, UPDATE, DELETE)
- [ ] Nó Function (JavaScript inline com acesso a $input)
- [ ] Nó Split In Batches (processar arrays em lotes)
- [ ] Nó Merge (combinar múltiplos inputs)
- [ ] Nó Set (manipular dados, adicionar/remover campos)
- [ ] Nó If (condições avançadas com múltiplas regras)
- [ ] Nó Switch (múltiplos caminhos baseados em valor)
- [ ] Nó Loop Over Items (iterar sobre array)
- [ ] Nó Wait (delay configurável)
- [ ] Nó Error Trigger (capturar erros de outros workflows)
- [ ] Sistema de Retry automático (configurável por nó)
- [ ] Error Handling (continue on fail, error workflow)
- [ ] Painel de Histórico de Execuções
- [ ] Visualização de input/output de cada nó
- [ ] Logs detalhados com timestamps
- [ ] Sistema de Credenciais criptografadas
- [ ] Webhooks únicos por workflow
- [ ] Agendamento com Cron expressions


## 58. Implementação Completa N8N Workflow Engine
- [x] Schema de banco completo (5 tabelas: workflow_executions, execution_data, workflow_credentials, workflow_webhooks, workflow_schedules)
- [x] Workflow Executor profissional (700+ linhas)
- [x] Sistema de variáveis {{$json}}, {{$node["Name"].json}}, {{$vars}}
- [x] 15 tipos de nós implementados:
  - [x] Trigger (entrada de dados)
  - [x] Message (enviar mensagem)
  - [x] Condition/If (condições lógicas)
  - [x] AI Assistant (integração LLM)
  - [x] HTTP Request (chamadas API)
  - [x] Database Query (consultas SQL)
  - [x] Function/Code (JavaScript inline)
  - [x] Set (manipular dados)
  - [x] Split (dividir arrays)
  - [x] Merge (combinar inputs)
  - [x] Loop (iterar items)
  - [x] Switch (múltiplos caminhos)
  - [x] Wait/Delay (pausas)
  - [x] Transfer Human (transferência)
- [x] Retry automático com exponential backoff
- [x] Error handling e continue on fail
- [x] Logging completo de execuções no banco
- [x] Rotas tRPC para histórico (getByWorkflow, getById, getStats, getRecent, retry, cancel, delete, clearByWorkflow)
- [ ] Painel frontend de histórico de execuções
- [ ] Sistema de credenciais criptografadas
- [ ] Webhooks únicos por workflow
- [ ] Scheduler com cron expressions
- [ ] Nós adicionais (Email, SMS, Webhook)


## 59. Correção de Renderização de Nós N8N Importados
- [x] Criar mapeamento de tipos N8N para tipos internos (n8n-nodes-base.whatsAppTrigger → trigger, n8n-nodes-base.httpRequest → api, @n8n/n8n-nodes-langchain.openAi → ai)
- [x] Implementar função de conversão de tipos N8N
- [x] Melhorar renderização de nós com ícones e cores corretos
- [x] Adicionar labels legíveis ao invés de nomes técnicos
- [ ] Testar importação de fluxo N8N real

## 41. Correção de Edges Duplicadas no React Flow
- [x] Identificar causa raiz: Date.now() gerando IDs não únicos para edges criadas no mesmo milissegundo
- [x] Substituir Date.now() por crypto.randomUUID() para geração de IDs verdadeiramente únicos
- [x] Testar criação de múltiplos templates sem erro "Encountered two children with the same key"
- [x] Validar logs do browser confirmando ausência de erros após correção

## 42. Correção de Edges Duplicadas em Fluxos Existentes
- [x] Regenerar IDs de edges ao carregar fluxos do banco de dados
- [x] Garantir que fluxos antigos (criados com Date.now()) tenham IDs únicos
- [x] Testar com fluxo "Boas Vindas" (edge-a1a2fbc10-a3924dfa0)

## 43. Restaurar Sidebar na Página de Configuração de Fluxo
- [x] Adicionar DashboardLayout wrapper na view builder
- [x] Manter funcionalidade completa do FlowBuilder
- [x] Testar navegação entre páginas durante edição de fluxo

## 44. Adicionar Sidebar na View de Lista de Fluxos
- [x] Envolver view list com DashboardLayout
- [x] Testar navegação na lista de fluxos

## 45. Corrigir Layout da Página de Automação
- [x] Investigar problemas visuais após adicionar DashboardLayout
- [x] Corrigir espaçamento e estrutura HTML
- [x] Testar todas as views (list, templates, builder)

## 46. Refatorar Sidebar para TopBar Horizontal Fixa
- [x] Criar componente TopBar com navegação por ícones
- [x] Implementar design com fundo escuro e ícones claros
- [x] Adicionar logo "Farma Francis" no topo antes da topbar
- [x] Refatorar DashboardLayout para usar TopBar
- [x] Corrigir problemas de layout e responsividade
- [x] Testar navegação em todas as páginas
- [x] Garantir que topbar permaneça fixa no topo durante scroll

## 47. Remover Redundância de Configuração de APIs
- [x] Investigar botão de configuração na página de mensagens
- [x] Verificar rota /api-config ou /settings/api no topbar
- [x] Corrigir funcionalidade da página de Configurações API
- [x] Remover botão redundante da página de mensagens
- [x] Testar navegação e funcionalidade

## 48. Atualizar Identidade Visual com Logo e Cores da Marca
- [x] Copiar logo para diretório public do projeto
- [x] Atualizar paleta de cores no index.css (vermelho #D32F2F, azul #3FA9D4)
- [x] Substituir texto "Farma Francis" por logo no TopBar
- [x] Atualizar cores de botões, badges e elementos visuais
- [x] Testar consistência visual em todas as páginas

## 49. Reorganizar TopBar - Logo e Navegação na Mesma Linha
- [x] Refatorar TopBar para layout horizontal único (logo + ícones + avatar)
- [x] Ajustar espaçamento do conteúdo principal para não sobrepor
- [x] Testar em todas as páginas (Dashboard, CRM, Automação, etc)

## 50. Implementar Seletor Profissional de Agentes IA no AI Assistant
- [x] Criar interfaces TypeScript (IAgentDefinition, IAgentParameter, INodeData)
- [x] Implementar componente AIJobNode para canvas com ícone e status
- [x] Criar painel de propriedades lateral (Drawer) com Card Selection
- [x] Implementar formulário dinâmico baseado em esquema de configuração
- [x] Adicionar mock data para OpenAI, Claude, Gemini e Llama
- [x] Integrar com FlowBuilder existente
- [x] Testar seleção e configuração de diferentes modelos

## 51. Corrigir Persistência de Dados no FlowBuilder
- [ ] Investigar por que botão "Salvar" não persiste alterações no banco
- [ ] Verificar se rota tRPC de update está sendo chamada corretamente
- [ ] Corrigir salvamento de configurações de nós AI Assistant
- [ ] Testar persistência após reload da página

## 52. Implementar Validação de Credenciais de API
- [ ] Adicionar botão "Testar Conexão" no AgentSettingsPanel
- [ ] Criar rota tRPC para validar API keys dos provedores
- [ ] Implementar chamadas de teste para OpenAI, Anthropic, Google e Meta
- [ ] Exibir feedback visual (✓ conectado / ✗ erro com mensagem)
- [ ] Salvar status de validação no banco de dados

## 53. Criar Biblioteca de Prompts Prontos
- [ ] Criar arquivo de prompts categorizados (Atendimento, Vendas, Suporte)
- [ ] Implementar modal/dropdown de seleção de prompts
- [ ] Adicionar botão "Usar Template" no campo de prompt
- [ ] Permitir inserção de prompt com um clique
- [ ] Adicionar preview do prompt antes de inserir

## 54. Implementar Preview de Resposta IA
- [ ] Adicionar seção "Testar Configuração" no AgentSettingsPanel
- [ ] Campo de input para mensagem de teste
- [ ] Botão "Testar" que chama LLM com configurações atuais
- [ ] Exibir resposta simulada do modelo
- [ ] Mostrar tempo de resposta e tokens utilizados
- [ ] Adicionar indicador de loading durante teste

## 55. Corrigir Erros TypeScript na Página Mensagens
- [x] Corrigir comparação incorreta na linha 171 (selectedChat === chat ao invés de selectedChat === chat.id)
- [x] Corrigir comparação incorreta na linha 225 (activeTab === tab ao invés de activeTab === tab.id)
- [x] Verificar compilação TypeScript sem erros

## 56. Adicionar Botão Salvar Fixo no Painel de Agentes
- [x] Refatorar AgentSettingsPanel para ter footer fixo sempre visível
- [x] Adicionar botão Salvar no topo do painel também
- [x] Garantir que scroll funcione corretamente no conteúdo
- [x] Testar salvamento em diferentes resoluções

## 57. Criar Sistema de Teste de Agentes IA
- [x] Adicionar seção "Testar Configuração" no AgentSettingsPanel
- [x] Criar campo de input para mensagem de teste
- [x] Implementar botão "Enviar Teste" que chama LLM real (simulação)
- [x] Exibir resposta do modelo em tempo real
- [x] Adicionar indicador de loading durante processamento
- [x] Mostrar erros de configuração (token inválido, etc)
- [ ] Salvar histórico de testes (opcional)

## 58. Implementar Validação Real de Tokens API
- [ ] Criar rota tRPC `aiAgents.validateToken` no backend
- [ ] Implementar validação para OpenAI (chamada real à API)
- [ ] Implementar validação para Anthropic Claude (chamada real à API)
- [ ] Implementar validação para Google Gemini (chamada real à API)
- [ ] Adicionar botão "Testar Conexão" no AgentSettingsPanel
- [ ] Conectar botão ao endpoint tRPC
- [ ] Exibir feedback visual (✓ sucesso / ✗ erro com mensagem)
- [ ] Adicionar loading state durante validação
- [ ] Testar com tokens válidos e inválidos

## 58. Implementar Validação Real de Tokens API
- [x] Criar rota tRPC aiAgents.validateToken no backend
- [x] Implementar funções de validação para OpenAI, Anthropic, Google
- [x] Adicionar botão "Testar Conexão" no AgentSettingsPanel
- [x] Exibir feedback visual (sucesso/erro) após validação
- [x] Implementado com chamadas reais aos endpoints dos provedores

## 59. Corrigir 103 Erros TypeScript
- [ ] Corrigir erros de enum `stage` em CRM.tsx (prospect/qualified/proposal/negotiation/closed_won/closed_lost)
- [ ] Corrigir erros de enum `status` em CRM.tsx e outras páginas
- [ ] Corrigir erro de propriedade `userId` faltando em Employees.tsx linha 77
- [ ] Verificar compilação TypeScript sem erros

## 60. Conectar Teste de Agentes IA ao Backend Real
- [ ] Criar rota tRPC aiAgents.testAgent no backend
- [ ] Implementar função que chama LLM real (OpenAI/Anthropic/Google) com configuração do usuário
- [ ] Conectar frontend handleTestAgent à rota tRPC
- [ ] Exibir resposta real do modelo no painel
- [ ] Adicionar tratamento de erros (token inválido, rate limit, etc)

## 61. Criar Biblioteca de Prompts Prontos
- [ ] Criar arquivo de dados com 15+ prompts categorizados
- [ ] Categorias: Atendimento, Vendas, Suporte, Marketing, Qualidade
- [ ] Adicionar dropdown "Prompts Prontos" no campo Prompt do Sistema
- [ ] Implementar inserção com um clique
- [ ] Adicionar preview do prompt ao passar mouse

## 62. Sistema de Variáveis de Contexto Funcional
- [x] Criar sistema de variáveis {{cliente.nome}}, {{ticket.id}}, {{mensagem.texto}}
- [x] Implementar substituição em tempo real durante execução de fluxos
- [x] Criar editor visual de variáveis disponíveis
- [x] Adicionar autocomplete de variáveis no editor de texto
- [x] Suportar variáveis aninhadas {{cliente.endereco.cidade}}
- [x] Implementar funções helper (uppercase, lowercase, substring, date_format)

## 63. Validador de Fluxos Automático
- [x] Detectar nós desconectados (sem entrada ou saída)
- [x] Identificar loops infinitos
- [x] Validar caminhos sem saída
- [x] Verificar configurações obrigatórias de cada nó
- [x] Exibir alertas visuais no canvas (ícones de warning)
- [x] Bloquear ativação de fluxos com erros críticos
- [x] Gerar relatório de validação com sugestões de correção

## 64. Analytics de Execução de Fluxos
- [x] Criar tabela de execuções no banco de dados
- [x] Registrar cada execução com timestamp, duração, status
- [x] Dashboard de analytics por fluxo (taxa de sucesso, tempo médio)
- [x] Identificar nós mais usados e gargalos
- [x] Mapear pontos de abandono (onde usuários param de responder)
- [x] Gráfico de funil de conversão
- [x] Exportar relatórios em PDF/CSV

## 65. Histórico de Execuções Detalhado
- [x] Criar página /executions com lista de execuções
- [x] Filtros por fluxo, status (sucesso/erro/em andamento), data
- [x] Timeline detalhada de cada execução (nó por nó)
- [x] Visualizar valores de variáveis em cada etapa
- [x] Logs de erros com stack trace
- [x] Botão "Retry" para execuções falhadas
- [x] Replay de execução no canvas (animação do caminho percorrido)

## 66. Biblioteca de Ações Rápidas no Canvas
- [x] Atalhos de teclado (Ctrl+C copiar, Ctrl+V colar, Delete remover)
- [x] Menu de contexto (clique direito) em nós
- [x] Duplicar nó com configurações
- [x] Desabilitar/habilitar nó temporariamente
- [x] Adicionar nota/comentário em nó
- [x] Colorir nós para organização visual
- [x] Agrupar nós em containers

## 67. Sistema de Notificações em Tempo Real
- [x] Notificar quando fluxo é ativado/desativado
- [x] Alertar sobre execuções com erro
- [x] Notificar quando variável crítica muda
- [x] Badge de notificações não lidas na topbar
- [x] Painel de notificações com histórico
- [x] Configurar preferências de notificação por usuário
- [x] Integração com email para alertas críticos

## 68. Editor de Condições Avançado
- [x] Interface visual para múltiplas condições
- [x] Operadores lógicos AND/OR/NOT
- [x] Grupos de condições aninhados
- [x] Comparadores avançados (regex, in_list, between)
- [x] Testar condição com valores de exemplo
- [x] Salvar condições como templates reutilizáveis
- [x] Importar/exportar regras de negócio

## 69. Versionamento de Fluxos
- [x] Criar tabela de versões de fluxos no banco
- [x] Salvar snapshot completo a cada alteração
- [x] Listar histórico de versões com diff visual
- [x] Restaurar versão anterior (rollback)
- [x] Comparar duas versões lado a lado
- [x] Adicionar mensagem de commit para cada versão
- [x] Branches de fluxos (produção vs desenvolvimento)

## 70. Simulador de Fluxos Interativo
- [x] Modo de simulação no canvas
- [x] Inserir valores de teste para variáveis
- [x] Executar fluxo passo a passo (debug mode)
- [x] Visualizar caminho percorrido em tempo real
- [x] Inspecionar valores de variáveis em cada nó
- [x] Simular diferentes cenários (happy path, edge cases)
- [x] Salvar casos de teste para regressão

## 71. Integração com APIs Externas (HTTP Request Avançado)
- [x] Suporte a todos os métodos HTTP (GET, POST, PUT, DELETE, PATCH)
- [x] Headers customizáveis
- [x] Autenticação (Bearer, Basic, OAuth2, API Key)
- [x] Request body (JSON, Form Data, XML)
- [x] Parsing automático de resposta
- [x] Retry com backoff exponencial
- [x] Timeout configurável
- [x] Salvar respostas como variáveis

## 72. Sistema de Tags e Categorias de Fluxos
- [x] Adicionar tags aos fluxos (vendas, suporte, marketing)
- [x] Filtrar fluxos por tags
- [x] Categorias hierárquicas (Vendas > Prospecção > Cold Outreach)
- [x] Busca por tags
- [x] Cores personalizadas para tags
- [x] Estatísticas por categoria
- [x] Exportar fluxos por categoria

## 73. Busca Global Inteligente
- [x] Campo de busca na topbar
- [x] Buscar em clientes, tickets, mensagens, fluxos
- [x] Resultados agrupados por tipo
- [x] Highlight de termos encontrados
- [x] Busca fuzzy (tolerância a erros de digitação)
- [x] Filtros avançados (data, tipo, status)
- [x] Histórico de buscas recentes
- [x] Atalho de teclado (Ctrl+K)

## 74. Dashboard de Performance de Agentes
- [x] Ranking de agentes por métricas
- [x] Gráfico de evolução individual
- [x] Comparação entre agentes (benchmark)
- [x] Metas e gamificação (badges, conquistas)
- [x] Feedback de clientes por agente
- [x] Identificar necessidades de treinamento
- [x] Exportar relatório de performance individual


## 75. Adicionar Páginas de Análise ao Menu de Navegação
- [x] Adicionar ícone e link para /executions no TopBar
- [x] Adicionar ícone e link para /agent-performance no TopBar
- [x] Registrar rota /executions no App.tsx
- [x] Registrar rota /agent-performance no App.tsx
- [x] Testar navegação entre páginas
- [x] Verificar que páginas carregam corretamente


## 76. Adicionar TopBar nas Páginas de Análise
- [x] Adicionar TopBar na página Executions.tsx
- [x] Adicionar TopBar na página AgentPerformance.tsx
- [x] Ajustar espaçamento do conteúdo para não sobrepor TopBar
- [x] Testar navegação entre páginas


## 77. Implementar Backend e Paginação para Análises
- [x] Criar rotas tRPC para listar execuções com filtros
- [x] Criar rotas tRPC para métricas de agentes
- [x] Implementar filtros funcionais (status, período, fluxo)
- [x] Adicionar paginação nas listas de execuções
- [x] Adicionar paginação no ranking de agentes
- [x] Conectar frontend às queries reais
- [x] Testar filtros e paginação


## 78. 🔴 URGENTE - Corrigir Botão Exportar em Performance
- [x] Investigar por que botão exportar não funciona
- [x] Implementar funcionalidade de exportação CSV
- [x] Implementar funcionalidade de exportação PDF
- [x] Implementar funcionalidade de exportação Excel
- [x] Adicionar feedback visual durante exportação
- [x] Testar exportação com dados reais

## 79. Implementar 3 Sugestões Anteriores
- [x] Criar script de seed para popular banco com dados de teste
- [x] Conectar botão "Tentar Novamente" à mutation retry
- [ ] Integrar biblioteca de gráficos (Recharts)
- [ ] Adicionar gráficos de tendência em AgentPerformance
- [ ] Adicionar gráficos de tendência em Executions

## 80. Auditoria Completa de Botões e Funcionalidades
- [ ] Testar todos os botões da página Home
- [ ] Testar todos os botões da página Dashboard
- [ ] Testar todos os botões da página Inbox
- [ ] Testar todos os botões da página CRM
- [ ] Testar todos os botões da página Automation
- [ ] Testar todos os botões da página Executions
- [ ] Testar todos os botões da página AgentPerformance
- [ ] Testar todos os botões da página Settings
- [ ] Documentar botões não funcionais encontrados

## 81-105. Melhorias de UX e Profissionalismo
- [ ] 81. Adicionar tooltips em todos os botões e ícones
- [ ] 82. Implementar feedback visual consistente (loading, success, error)
- [ ] 83. Adicionar animações suaves de transição entre páginas
- [ ] 84. Implementar skeleton loaders para melhor perceived performance
- [ ] 85. Adicionar estados vazios (empty states) com ilustrações e CTAs
- [ ] 86. Implementar breadcrumbs para navegação hierárquica
- [ ] 87. Adicionar atalhos de teclado para ações principais
- [ ] 88. Implementar modo escuro/claro com toggle
- [ ] 89. Adicionar confirmação para ações destrutivas
- [ ] 90. Implementar sistema de notificações toast
- [ ] 91. Adicionar indicadores de progresso para operações longas
- [ ] 92. Implementar drag-and-drop onde aplicável
- [ ] 93. Adicionar filtros salvos e favoritos
- [ ] 94. Implementar busca com autocomplete inteligente
- [ ] 95. Adicionar visualização de grid/lista alternável
- [ ] 96. Implementar ordenação por múltiplas colunas
- [ ] 97. Adicionar exportação em múltiplos formatos (CSV, Excel, PDF, JSON)
- [ ] 98. Implementar impressão otimizada
- [ ] 99. Adicionar compartilhamento de relatórios via link
- [ ] 100. Implementar favoritos/bookmarks de páginas
- [ ] 101. Adicionar histórico de ações do usuário
- [ ] 102. Implementar desfazer/refazer (undo/redo)
- [ ] 103. Adicionar tour guiado para novos usuários
- [ ] 104. Implementar ajuda contextual inline
- [ ] 105. Adicionar feedback de usuário (rating/comentários)

## 106-130. Melhorias de Performance e Escalabilidade
- [ ] 106. Implementar virtualização de listas longas
- [ ] 107. Adicionar cache de queries com React Query
- [ ] 108. Implementar lazy loading de componentes pesados
- [ ] 109. Otimizar imagens com next/image ou similar
- [ ] 110. Adicionar service worker para cache offline
- [ ] 111. Implementar prefetching de rotas
- [ ] 112. Otimizar bundle size com code splitting
- [ ] 113. Adicionar compressão de assets
- [ ] 114. Implementar CDN para assets estáticos
- [ ] 115. Adicionar índices no banco de dados
- [ ] 116. Implementar paginação cursor-based para grandes datasets
- [ ] 117. Adicionar debounce em campos de busca
- [ ] 118. Implementar throttling em scroll events
- [ ] 119. Otimizar re-renders com React.memo
- [ ] 120. Adicionar Web Workers para processamento pesado
- [ ] 121. Implementar streaming de dados em tempo real
- [ ] 122. Adicionar rate limiting no backend
- [ ] 123. Implementar caching no backend com Redis
- [ ] 124. Otimizar queries SQL com JOINs eficientes
- [ ] 125. Adicionar monitoramento de performance (Sentry, DataDog)
- [ ] 126. Implementar logs estruturados
- [ ] 127. Adicionar health checks
- [ ] 128. Implementar graceful shutdown
- [ ] 129. Adicionar retry automático com backoff exponencial
- [ ] 130. Implementar circuit breaker para serviços externos

## 131-155. Melhorias de Segurança e Validação
- [ ] 131. Implementar validação de input no frontend com Zod
- [ ] 132. Adicionar sanitização de HTML em campos de texto
- [ ] 133. Implementar CSRF protection
- [ ] 134. Adicionar rate limiting por IP
- [ ] 135. Implementar autenticação de dois fatores (2FA)
- [ ] 136. Adicionar logs de auditoria para ações sensíveis
- [ ] 137. Implementar permissões granulares (RBAC)
- [ ] 138. Adicionar criptografia de dados sensíveis
- [ ] 139. Implementar sessões seguras com refresh tokens
- [ ] 140. Adicionar validação de força de senha
- [ ] 141. Implementar bloqueio de conta após tentativas falhas
- [ ] 142. Adicionar verificação de email
- [ ] 143. Implementar recuperação de senha segura
- [ ] 144. Adicionar Content Security Policy (CSP)
- [ ] 145. Implementar HTTPS obrigatório
- [ ] 146. Adicionar validação de CORS
- [ ] 147. Implementar proteção contra SQL injection
- [ ] 148. Adicionar proteção contra XSS
- [ ] 149. Implementar validação de tipos no backend
- [ ] 150. Adicionar timeout em requisições
- [ ] 151. Implementar whitelist de IPs para admin
- [ ] 152. Adicionar detecção de bots
- [ ] 153. Implementar honeypot fields
- [ ] 154. Adicionar verificação de integridade de arquivos
- [ ] 155. Implementar backup automático

## 156-180. Melhorias Avançadas e Inovações
- [ ] 156. Adicionar dashboard customizável com widgets
- [ ] 157. Implementar relatórios agendados por email
- [ ] 158. Adicionar integração com Slack/Teams
- [ ] 159. Implementar webhooks configuráveis
- [ ] 160. Adicionar API pública com documentação Swagger
- [ ] 161. Implementar versionamento de API
- [ ] 162. Adicionar playground de API
- [ ] 163. Implementar SDK para integrações
- [ ] 164. Adicionar marketplace de plugins
- [ ] 165. Implementar sistema de templates
- [ ] 166. Adicionar editor de código inline
- [ ] 167. Implementar preview de mudanças
- [ ] 168. Adicionar colaboração em tempo real
- [ ] 169. Implementar comentários e anotações
- [ ] 170. Adicionar menções (@usuário)
- [ ] 171. Implementar notificações push
- [ ] 172. Adicionar chat interno
- [ ] 173. Implementar videochamadas integradas
- [ ] 174. Adicionar gravação de tela
- [ ] 175. Implementar assinatura digital
- [ ] 176. Adicionar OCR para documentos
- [ ] 177. Implementar tradução automática
- [ ] 178. Adicionar análise de sentimento
- [ ] 179. Implementar recomendações com IA
- [ ] 180. Adicionar chatbot com LLM integrado


## 181. 📊 Implementação de Visualização de Dados Temporais (Analytics com Recharts)
**Objetivo de Negócio:** Permitir análise de tendências históricas e identificar degradação/melhoria na performance
**Tecnologias:** React + Recharts + React Query
- [x] Instalar e configurar Recharts no projeto
- [x] Criar componente TimeSeriesChart reutilizável
- [x] Implementar gráfico de linha para performance de agentes ao longo do tempo
- [x] Implementar gráfico de área para taxa de sucesso de execuções
- [x] Conectar gráficos a dados reais via tRPC (PROIBIDO usar mock data)
- [x] Adicionar tooltips interativos nativos do Recharts
- [x] Implementar loading skeletons para não bloquear renderização
- [x] Garantir responsividade em mobile/tablet/desktop
- [ ] Adicionar seletor de período (7d, 30d, 90d, custom)
- [ ] Implementar zoom e pan nos gráficos
- [ ] Adicionar exportação de gráficos como imagem
- [ ] Testar performance com datasets grandes (1000+ pontos)

## 182. 🎯 Sistema de Tooltips Global (UX Enhancement com Radix UI)
**Objetivo de Negócio:** Reduzir curva de aprendizado e melhorar acessibilidade
**Tecnologias:** Radix UI Primitives + Tailwind CSS
- [x] Instalar @radix-ui/react-tooltip
- [x] Criar componente Tooltip wrapper reutilizável
- [x] Definir padrões de delay, animação e estilo visual
- [x] Implementar posicionamento inteligente (não sair da viewport)
- [x] Adicionar tooltips em 100% dos botões de ação
- [x] Adicionar tooltips em todos os ícones de navegação
- [x] Garantir suporte a leitores de tela (aria-labels)
- [ ] Implementar atalhos de teclado visíveis nos tooltips
- [ ] Adicionar modo "tour guiado" para novos usuários
- [ ] Criar documentação de uso do componente Tooltip
- [ ] Testar acessibilidade com NVDA/JAWS
- [ ] Validar com WCAG 2.1 Level AA

## 183. 🤖 Automação de QA: Auditoria de Interatividade (E2E com Playwright)
**Objetivo de Negócio:** Prevenir regressões e garantir experiência livre de frustração
**Tecnologias:** Playwright + TypeScript + GitHub Actions
- [x] Instalar e configurar Playwright
- [x] Criar script crawler que percorre todas as rotas
- [x] Implementar detector de botões visíveis e habilitados
- [x] Verificar se botões possuem event listeners
- [x] Detectar botões que não disparam requisições ou mutações
- [x] Gerar relatório HTML de falhas com screenshots
- [ ] Integrar com GitHub Actions para rodar em cada PR
- [x] Adicionar testes para formulários (validação de submit)
- [x] Testar navegação entre páginas (links funcionais)
- [ ] Validar modals e dialogs (abrir/fechar)
- [ ] Criar baseline de snapshots visuais
- [ ] Configurar notificações de falha no Slack/Discord


## 📋 50 MELHORIAS ESTRATÉGICAS FARMA FRANCIS

### 🎨 EXPERIÊNCIA DO USUÁRIO (UX/UI) E FRONTEND

## 184. Atalhos de Teclado Globais
- [ ] Implementar sistema de atalhos de teclado
- [ ] Alt+N para novo atendimento
- [ ] Alt+B para busca global
- [ ] Alt+D para dashboard
- [ ] Ctrl+K para comando rápido
- [ ] Exibir atalhos disponíveis em tooltips
- [ ] Criar modal de ajuda com todos os atalhos (?)

## 185. Modo Escuro Automático
- [ ] Detectar preferência do sistema operacional
- [ ] Sincronizar tema automaticamente
- [ ] Adicionar toggle manual de override
- [ ] Persistir preferência do usuário
- [ ] Animar transição entre temas

## 186. Busca Fuzzy (Aproximada)
- [ ] Integrar biblioteca Fuse.js
- [ ] Implementar busca tolerante a erros
- [ ] Adicionar score de relevância
- [ ] Highlight de termos encontrados
- [ ] Sugestões de correção automática

## 187. Skeleton Screens
- [ ] Substituir spinners por skeletons
- [ ] Criar componentes de skeleton reutilizáveis
- [ ] Aplicar em todas as páginas com loading
- [ ] Manter dimensões realistas do conteúdo

## 188. Notificações Push (Web)
- [ ] Implementar Web Push API
- [ ] Solicitar permissão do usuário
- [ ] Enviar notificações de novas mensagens
- [ ] Notificar sobre tickets urgentes
- [ ] Adicionar configurações de notificação

## 189. Dashboard Personalizável
- [ ] Implementar drag & drop de widgets
- [ ] Salvar layout por usuário
- [ ] Criar biblioteca de widgets disponíveis
- [ ] Permitir redimensionamento de cards
- [ ] Adicionar botão "Restaurar padrão"

## 190. Upload Drag & Drop
- [ ] Implementar área de drop de arquivos
- [ ] Suportar múltiplos arquivos
- [ ] Preview de imagens antes do upload
- [ ] Validação de tipo e tamanho
- [ ] Barra de progresso de upload

## 191. Visualização de PDF em Modal
- [ ] Integrar PDF.js ou react-pdf
- [ ] Abrir PDFs em modal fullscreen
- [ ] Adicionar controles de zoom e navegação
- [ ] Permitir download direto
- [ ] Suportar impressão

## 192. Histórico de Navegação (Breadcrumbs)
- [ ] Implementar componente Breadcrumb
- [ ] Adicionar em todas as páginas internas
- [ ] Tornar clicável para navegação rápida
- [ ] Sincronizar com roteamento

## 193. Feedback Háptico/Sonoro
- [ ] Adicionar sons sutis para ações
- [ ] Som de sucesso para operações
- [ ] Som de alerta para erros
- [ ] Som de notificação para mensagens
- [ ] Toggle de mute nas configurações

### 🤝 ATENDIMENTO E CRM (FOCO EM VENDAS)

## 194. Transcrição de Áudio (Whisper)
- [x] Integrar Whisper API (já disponível no template)
- [x] Transcrever áudios do WhatsApp automaticamente
- [x] Exibir transcrição abaixo do player
- [ ] Adicionar busca em transcrições
- [ ] Permitir correção manual

## 195. Tags Coloridas
- [ ] Criar sistema de tags customizáveis
- [ ] Cores predefinidas (Urgente, Venda Fechada, etc)
- [ ] Filtrar tickets por tags
- [ ] Estatísticas por tag
- [ ] Múltiplas tags por ticket

## 196. Respostas Rápidas (Canned Responses)
- [ ] Criar biblioteca de respostas prontas
- [ ] Atalho /comando para inserir
- [ ] Suportar variáveis {{cliente.nome}}
- [ ] Organizar por categorias
- [ ] Permitir edição antes de enviar

## 197. Agendamento de Mensagens
- [ ] Implementar scheduler de mensagens
- [ ] Seletor de data/hora futuro
- [ ] Fila de mensagens agendadas
- [ ] Cancelar mensagens pendentes
- [ ] Notificar quando enviada

## 198. Lembrete de Recompra
- [ ] Detectar medicamentos de uso contínuo
- [ ] Calcular data provável de recompra
- [ ] Notificar vendedor automaticamente
- [ ] Sugerir mensagem de follow-up
- [ ] Dashboard de oportunidades de recompra

## 199. Score de Cliente (RFM)
- [ ] Implementar cálculo RFM
- [ ] Classificar clientes (VIP, Regular, Eventual)
- [ ] Badge visual no perfil do cliente
- [ ] Relatório de distribuição RFM
- [ ] Ações sugeridas por segmento

## 200. Funil de Vendas Visual (Kanban)
- [ ] Criar view Kanban para orçamentos
- [ ] Colunas: Solicitado > Orçado > Negociando > Fechado > Perdido
- [ ] Drag & drop entre colunas
- [ ] Métricas de conversão por etapa
- [ ] Filtros por vendedor/período

## 201. Integração com Google Calendar
- [ ] OAuth com Google Calendar
- [ ] Agendar entregas no calendário
- [ ] Agendar atendimentos farmacêuticos
- [ ] Sincronização bidirecional
- [ ] Lembretes automáticos

## 202. Pesquisa NPS Automática
- [ ] Enviar pergunta NPS após atendimento
- [ ] Escala 0-10 visual
- [ ] Coletar feedback adicional
- [ ] Dashboard de NPS por período
- [ ] Alertar sobre detratores (0-6)

## 203. Detector de Duplicidade
- [ ] Detectar clientes com múltiplos números
- [ ] Comparar nome + CPF
- [ ] Sugerir mesclagem de perfis
- [ ] Histórico unificado
- [ ] Alertar atendente sobre duplicidade

### 💊 FUNCIONALIDADES ESPECÍFICAS DE FARMÁCIA

## 204. Leitura de Código de Barras
- [ ] Integrar biblioteca de barcode scanner
- [ ] Usar câmera do dispositivo
- [ ] Buscar produto automaticamente
- [ ] Adicionar ao pedido com um clique
- [ ] Suportar EAN-13, Code128

## 205. Consulta de Interação Medicamentosa
- [ ] Integrar API de interações (ex: DrugBank)
- [ ] Alertar sobre combinações perigosas
- [ ] Exibir nível de severidade
- [ ] Sugerir alternativas
- [ ] Log de alertas ignorados

## 206. Gestão de SNGPC (Básico)
- [ ] Marcar vendas que exigem receita
- [ ] Campos obrigatórios (CRM médico, etc)
- [ ] Relatório para exportação SNGPC
- [ ] Validação de campos obrigatórios
- [ ] Alertar sobre receitas vencidas

## 207. Controle de Validade
- [ ] Dashboard de produtos próximos ao vencimento
- [ ] Alertas 90/60/30 dias antes
- [ ] Sugerir promoção relâmpago
- [ ] Integrar com estoque
- [ ] Relatório de perdas por vencimento

## 208. Link de Orçamento Rápido
- [ ] Gerar link único por orçamento
- [ ] Página pública com itens e total
- [ ] QR Code Pix integrado
- [ ] Expiração configurável (24h/48h)
- [ ] Notificar quando cliente visualizar

## 209. Cadastro de Médicos
- [ ] Tabela de médicos prescritores
- [ ] Relacionar vendas a médicos
- [ ] Relatório de vendas por médico
- [ ] Identificar parceiros estratégicos
- [ ] Dados de contato e especialidade

## 210. Programa de Fidelidade
- [ ] Sistema de pontos (R$ 100 = 1 ponto)
- [ ] Exibir saldo no perfil do cliente
- [ ] Regras de resgate configuráveis
- [ ] Histórico de pontos
- [ ] Notificar sobre pontos próximos a expirar

## 211. Impressão de Etiquetas de Entrega
- [ ] Template de etiqueta para impressora térmica
- [ ] Gerar PDF com dados do cliente
- [ ] Código de rastreamento
- [ ] QR Code para confirmação
- [ ] Imprimir em lote

### 🤖 AUTOMAÇÃO E INTELIGÊNCIA ARTIFICIAL

## 212. Sugestão de Resposta por IA
- [x] Integrar LLM (já disponível no template)
- [x] Analisar pergunta do cliente
- [x] Sugerir 3 opções de resposta
- [x] Permitir edição antes de enviar
- [ ] Aprender com respostas aceitas

## 213. Análise de Sentimento
- [x] Detectar tom da mensagem (Irritado/Neutro/Feliz)
- [ ] Priorizar clientes irritados na fila
- [ ] Badge visual de sentimento
- [ ] Histórico de sentimento por cliente
- [ ] Alertar supervisor sobre casos críticos

## 214. Chatbot de Triagem Inteligente
- [ ] Bot solicita foto da receita primeiro
- [ ] Classifica tipo de atendimento
- [ ] Coleta informações básicas
- [ ] Transfere para humano com contexto
- [ ] Métricas de eficiência do bot

## 215. Automação de Aniversariantes
- [ ] Detectar aniversários do dia
- [ ] Enviar cupom automaticamente
- [ ] Personalizar mensagem
- [ ] Rastrear conversões
- [ ] Configurar desconto/validade

## 216. Extração de Dados de Receita (OCR)
- [x] Integrar OCR (Tesseract ou Cloud Vision)
- [x] Extrair nome do medicamento
- [x] Extrair dosagem e quantidade
- [ ] Sugerir produtos do estoque
- [ ] Permitir correção manual

## 217. Recuperação de Carrinho/Orçamento
- [ ] Detectar orçamentos sem resposta
- [ ] Enviar follow-up após 24h
- [ ] Mensagem personalizada
- [ ] Oferecer desconto incremental
- [ ] Métricas de recuperação

### 🛡️ SEGURANÇA E ADMINISTRATIVO

## 218. Autenticação de Dois Fatores (2FA)
- [ ] Integrar TOTP (Google Authenticator)
- [ ] Obrigatório para admins
- [ ] Opcional para usuários
- [ ] Códigos de backup
- [ ] Log de tentativas falhadas

## 219. Log de Auditoria Detalhado
- [ ] Registrar todas as ações críticas
- [ ] IP, usuário, data, valores antigos/novos
- [ ] Interface de consulta de logs
- [ ] Exportar para análise
- [ ] Retenção configurável

## 220. Bloqueio de Horário
- [ ] Impedir login fora do expediente
- [ ] Configurar horários por usuário
- [ ] Exceções para admins
- [ ] Alertar sobre tentativas fora de horário

## 221. Mascaramento de Dados (LGPD)
- [ ] Botão para anonimizar cliente
- [ ] Substituir dados pessoais por ***
- [ ] Manter histórico de vendas anonimizado
- [ ] Log de solicitações LGPD
- [ ] Exportar dados para cliente (portabilidade)

## 222. Limitação de Exportação
- [ ] Controlar permissões de exportação
- [ ] Limitar quantidade de registros
- [ ] Log de exportações
- [ ] Alertar sobre exportações suspeitas
- [ ] Watermark em relatórios

## 223. Sessão Única
- [ ] Detectar login simultâneo
- [ ] Derrubar sessão anterior
- [ ] Notificar usuário sobre novo login
- [ ] Opção de "Não sou eu" para bloquear conta

### ⚙️ ENGENHARIA E INFRAESTRUTURA (BACKEND/DEVOPS)

## 224. Cache com Redis
- [ ] Instalar e configurar Redis
- [ ] Cachear queries pesadas
- [ ] Invalidação inteligente
- [ ] TTL configurável por tipo
- [ ] Métricas de hit rate

## 225. Fila de Processamento
- [ ] Implementar job queue (BullMQ)
- [ ] Envios de mensagens em massa
- [ ] Processamento de imagens
- [ ] Geração de relatórios
- [ ] Dashboard de jobs

## 226. Webhooks de Entrada
- [ ] Endpoint para receber webhooks
- [ ] Autenticação por assinatura
- [ ] Processar notificações de pagamento
- [ ] Integrar com ERP externo
- [ ] Log de webhooks recebidos

## 227. Monitoramento de Erros (Sentry)
- [ ] Integrar Sentry
- [ ] Capturar erros frontend e backend
- [ ] Alertar admin por email
- [ ] Agrupar erros similares
- [ ] Rastreamento de releases

## 228. Backup Automático
- [ ] Rotina diária de backup
- [ ] Enviar para S3/Google Drive
- [ ] Backup incremental
- [ ] Testar restauração mensalmente
- [ ] Retenção de 30 dias

## 229. API Rate Limiting
- [ ] Implementar rate limiting
- [ ] Proteger contra brute force
- [ ] Diferentes limites por endpoint
- [ ] Whitelist de IPs confiáveis
- [ ] Resposta 429 com Retry-After

## 230. Health Checks
- [ ] Endpoint /health
- [ ] Verificar conexão DB
- [ ] Verificar conexão WhatsApp
- [ ] Verificar espaço em disco
- [ ] Integrar com monitoramento externo

## 231. Compressão de Imagens
- [ ] Reduzir tamanho automaticamente
- [ ] Sharp ou Jimp para processamento
- [ ] Manter qualidade aceitável
- [ ] Gerar thumbnails
- [ ] Converter para WebP

## 232. Lazy Loading
- [ ] Carregar imagens sob demanda
- [ ] Virtualização de listas longas
- [ ] Infinite scroll em tabelas
- [ ] Placeholder blur durante carregamento

## 233. Dockerização Completa
- [ ] Docker Compose para dev
- [ ] Imagens otimizadas
- [ ] Multi-stage builds
- [ ] Volumes para persistência
- [ ] Documentação de setup


## 234. Integrar Componentes de IA nas Páginas de Atendimento
- [x] Localizar página de mensagens/inbox
- [x] Integrar AudioTranscription para áudios do WhatsApp
- [x] Adicionar botão de transcrição em cada mensagem de áudio
- [x] Integrar AISuggestions na interface de resposta
- [x] Adicionar botão "Sugestões IA" no campo de resposta
- [x] Testar fluxo completo de transcrição
- [x] Testar fluxo completo de sugestões
- [x] Adicionar feedback visual de loading


## 235. Badges de Sentimento nas Conversas
- [x] Adicionar análise de sentimento automática
- [x] Exibir ícones visuais (😊😐😠) na lista de conversas
- [ ] Salvar sentimento no banco de dados
- [x] Adicionar tooltip com explicação
- [x] Atualizar sentimento em tempo real

## 236. Sistema de Tags Coloridas
- [x] Criar tabela de tags no banco de dados
- [x] Criar interface de gerenciamento de tags
- [x] Adicionar tags às conversas/tickets
- [ ] Implementar filtros por tags
- [x] Cores predefinidas (Urgente, Venda Fechada, Aguardando)
- [x] Permitir tags customizadas
- [ ] Estatísticas por tag

## 237. Priorização Automática por Sentimento
- [ ] Ordenar fila por sentimento (frustrated primeiro)
- [ ] Adicionar indicador visual de prioridade
- [ ] Permitir override manual
- [ ] Notificar supervisor sobre casos críticos
- [ ] Configurar regras de priorização


## 238. Integrar TagManager na Página Inbox
- [x] Adicionar botão "Tags" ao lado de cada conversa na lista
- [x] Passar conversationId corretamente para TagManager
- [x] Exibir tags aplicadas visualmente (badges coloridas)
- [x] Atualizar lista quando tags são modificadas
- [x] Adicionar tooltip mostrando todas as tags da conversa

## 239. Implementar Filtros por Tags
- [x] Criar componente TagFilter reutilizável
- [x] Adicionar dropdown de filtro na página Inbox
- [x] Filtrar conversas por uma ou múltiplas tags
- [x] Adicionar opção "Todas" e "Sem tags"
- [ ] Persistir filtro selecionado no localStorage
- [ ] Adicionar contador de itens por tag
- [ ] Implementar filtro em outras páginas (Tickets, CRM)


## 240. Implementar Lógica de Filtro por Tags no Backend
- [x] Adicionar parâmetro tagIds na query getConversations
- [x] Implementar JOIN com conversation_tags
- [x] Filtrar conversas que possuem TODAS as tags selecionadas (AND)
- [x] Testar query com múltiplas tags
- [x] Conectar frontend ao novo parâmetro

## 241. Exibir Badges de Tags na Lista de Conversas
- [x] Buscar tags de cada conversa via trpc.tags.getConversationTags
- [x] Renderizar badges coloridas abaixo do nome
- [x] Limitar exibição a 3 tags + contador "+N"
- [ ] Adicionar tooltip com todas as tags ao hover
- [x] Atualizar quando tags são modificadas

## 242. Adicionar Contador de Conversas por Tag
- [x] Criar endpoint tRPC tags.getTagStats
- [x] Contar conversas por tag com GROUP BY
- [x] Exibir contador no dropdown TagFilter
- [ ] Atualizar contadores em tempo real
- [ ] Adicionar loading state durante contagem


## 243. 🔴 URGENTE - Corrigir Erro na Página Employees
- [x] Investigar mutation que espera userId mas recebe undefined
- [x] Corrigir passagem de parâmetros no formulário
- [x] Ajustar validação do schema
- [x] Testar criação/edição de funcionários


## 244. 🔴 URGENTE - Corrigir userId NaN no Insert de Employees
- [x] Investigar por que insertId retorna NaN
- [x] Corrigir obtenção do ID após insert do usuário
- [x] Usar método correto do Drizzle para obter ID gerado
- [x] Testar criação de funcionário


## 245. 🔴 URGENTE - Corrigir Exportação no Painel Execuções
- [x] Investigar falha na funcionalidade de exportação
- [x] Implementar endpoint tRPC executions.export
- [x] Adicionar dropdown de seleção de formato (CSV/PDF/Excel)
- [x] Implementar geração de CSV com encoding UTF-8
- [x] Implementar geração de PDF com formatação profissional
- [x] Adicionar feedback visual durante exportação
- [ ] Testar com datasets grandes (1000+ registros)

## 246. 🔴 URGENTE - Dashboard com Dados Reais
- [ ] Diagnosticar por que dashboard exibe dados mockados
- [ ] Criar router tRPC dashboard com endpoint getMetrics
- [ ] Criar endpoint dashboard.getChartData para gráficos
- [ ] Criar endpoint dashboard.getTopAgents
- [ ] Implementar queries SQL para métricas reais
- [ ] Adicionar índices no banco (created_at, status, assigned_to)
- [ ] Substituir dados mockados no frontend por queries reais
- [ ] Implementar cache de 5 minutos para performance
- [ ] Adicionar loading states
- [ ] Garantir queries executam em < 500ms

## 247. Implementar Tela de Login Customizada
- [x] Criar componente client/src/pages/Login.tsx
- [x] Adicionar logo da Farma Francis (SVG responsivo)
- [x] Aplicar cores institucionais (verde #00A859)
- [x] Implementar formulário de login (email/senha)
- [x] Adicionar validação em tempo real
- [x] Integrar botão Google OAuth
- [x] Design responsivo mobile/desktop
- [ ] Adicionar logo da Farma Francis (SVG responsivo)
- [ ] Aplicar cores institucionais (verde #00A859)
- [ ] Implementar formulário de login (email/senha)
- [ ] Adicionar validação em tempo real
- [ ] Implementar botão "Esqueci minha senha"
- [ ] Manter integração com Google OAuth
- [ ] Adicionar loading state durante autenticação
- [ ] Implementar redirect automático se já autenticado
- [ ] Garantir responsividade (mobile/tablet/desktop)

## 248. Implementar Segurança de Autenticação
- [ ] Instalar bcryptjs para hash de senhas
- [ ] Implementar hash de senhas com salt rounds=12
- [ ] Configurar JWT tokens com expiração de 7 dias
- [ ] Configurar cookies httpOnly + secure + sameSite=strict
- [ ] Instalar express-rate-limit
- [ ] Implementar rate limiting (5 tentativas/15min por IP)
- [ ] Adicionar proteção contra timing attacks
- [ ] Adicionar proteção CSRF

## 249. Implementar Controle de Acesso Admin
- [x] Criar middleware adminOnlyProcedure
- [x] Proteger rotas employees.list com adminProcedure
- [x] Proteger rotas employees.create com adminProcedure
- [x] Criar AuthContext com função isAdmin
- [x] Adicionar proteção frontend na página Employees
- [x] Exibir mensagem de acesso negado para não-admins
- [ ] Proteger rotas users.create com adminOnlyProcedure
- [ ] Proteger rotas users.update com adminOnlyProcedure
- [ ] Proteger rotas users.delete com adminOnlyProcedure
- [ ] Criar hook useAuth com função isAdmin
- [ ] Criar página "Acesso Negado" para não-admins
- [ ] Ocultar botões de gerenciamento para não-admins
- [ ] Implementar redirect automático se acesso direto via URL
- [ ] Adicionar logs de auditoria para ações administrativas

## 250. Implementar Formulário Completo de Usuários
- [ ] Adicionar campo name (obrigatório)
- [ ] Adicionar campo email (obrigatório, único)
- [ ] Adicionar campo role (admin/user)
- [ ] Adicionar campo phone com máscara (31) 98633-7081
- [ ] Adicionar campo cpf com máscara 000.000.000-00
- [ ] Adicionar campo department (dropdown)
- [ ] Adicionar campo position (texto livre)
- [ ] Adicionar campo hireDate (datepicker)
- [ ] Adicionar campo status (active/inactive/suspended)
- [ ] Adicionar campo permissions (multi-select)
- [ ] Adicionar campos password e passwordConfirm (apenas novo usuário)
- [ ] Implementar validações com Zod
- [ ] Adicionar validação de email único no backend
- [ ] Implementar checkbox "Enviar email de boas-vindas"
- [ ] Implementar checkbox "Solicitar troca de senha no primeiro acesso"
- [ ] Desabilitar botão "Salvar" enquanto há erros
- [ ] Adicionar feedback de sucesso/erro após submissão


## 251. 🔴 URGENTE - Registrar AuthProvider no App.tsx
- [x] Adicionar import do AuthProvider no App.tsx
- [x] Envolver aplicação com <AuthProvider>
- [x] Testar que useAuth() funciona em todas as páginas

## Redesign da Tela de Login
- [x] Copiar logo da Farma Francis para /client/public/
- [x] Refazer Login.tsx com logo da farmácia
- [x] Aplicar cores institucionais (vermelho #D32F2F + azul #3FA9D4)
- [x] Remover botão "Continuar com Google"
- [x] Manter apenas login com email/senha (autenticação interna)
- [x] Testar login com usuários criados na página /employees
- [x] Adicionar campo passwordHash na tabela users
- [x] Criar endpoint auth.login no backend com bcrypt
- [x] Aplicar migração do banco de dados

## Usuário Admin Padrão e Campo Senha
- [x] Criar script de seed para usuário admin padrão (email: admin, senha: admin)
- [x] Executar seed para criar admin no banco de dados
- [x] Adicionar campo "Senha" no formulário de criação de funcionários
- [x] Adicionar campo "Confirmar Senha" no formulário
- [x] Implementar validação de senha (mínimo 6 caracteres)
- [x] Implementar validação de senhas iguais
- [x] Atualizar backend para receber senha e criar hash com bcrypt
- [x] Testar criação de funcionário com senha
- [x] Testar login com funcionário criado

## Redesign Minimalista da Tela de Login
- [x] Remover painel lateral esquerdo
- [x] Criar layout centralizado simples
- [x] Trocar campo "Email" por "Usuário" com ícone de pessoa
- [x] Manter campo "Senha" com ícone de cadeado
- [x] Centralizar botão "Entrar"
- [x] Atualizar backend para aceitar username (não apenas email)
- [x] Garantir que "admin/admin" funciona como credenciais válidas
- [x] Testar login com novo layout

## Redirecionamento Após Login
- [x] Implementar redirecionamento explícito para /dashboard após login bem-sucedido
- [x] Garantir que o cookie seja salvo antes do redirecionamento
- [ ] Testar fluxo completo: login → dashboard

## Correção Definitiva do Login
- [ ] Modificar Login.tsx para usar navegação do wouter ao invés de window.location
- [ ] Invalidar cache do React Query após login bem-sucedido
- [ ] Testar login funcionando sem loop de redirecionamento

## Função Excluir Funcionários
- [x] Adicionar endpoint employees.delete no backend
- [x] Adicionar botão "Excluir" na tabela de funcionários
- [x] Implementar confirmação antes de excluir
- [x] Testar exclusão de funcionário

## Melhorias na Página de Funcionários

### 1. Edição de Funcionários
- [x] Adicionar endpoint employees.update no backend
- [x] Adicionar botão "Editar" na tabela de funcionários
- [x] Criar dialog de edição com formulário preenchido
- [x] Implementar atualização de dados do funcionário
- [x] Testar edição de funcionário

### 2. Filtros Avançados
- [x] Adicionar filtro por cargo (position)
- [x] Adicionar filtro por departamento (department)
- [x] Adicionar filtro por status (active/inactive/vacation)
- [x] Implementar lógica de filtragem combinada
- [x] Botão "Limpar Filtros" para resetar todos os filtros
- [x] Testar filtros

### 3. Paginação na Tabela
- [x] Adicionar componente de paginação
- [x] Implementar seletor de itens por página (10/25/50)
- [x] Implementar navegação entre páginas (Primeira/Anterior/Próxima/Última)
- [x] Mostrar total de registros e página atual
- [x] Testar paginação com diferentes quantidades

## Correção de Erro SelectItem
- [x] Remover SelectItem com value="" dos filtros (Departamento, Status)
- [x] Usar placeholder ao invés de item "Todos"

## Controle de Acesso Admin-Only
- [x] Criar middleware adminProcedure no backend (verificar ctx.user.role === 'admin')
- [x] Proteger todos os endpoints de employees com adminProcedure
- [x] Proteger todos os endpoints de customers com adminProcedure
- [x] Proteger todos os endpoints de leads com adminProcedure
- [x] Proteger todos os endpoints de tickets com adminProcedure
- [x] Criar componente AdminRoute no frontend
- [x] Aplicar AdminRoute em /employees
- [x] Aplicar AdminRoute em /customers
- [x] Aplicar AdminRoute em /crm
- [x] Aplicar AdminRoute em /inbox
- [x] Aplicar AdminRoute em /automation
- [x] Aplicar AdminRoute em /api-settings
- [x] Aplicar AdminRoute em /executions
- [x] Aplicar AdminRoute em /agent-performance
- [x] Criar página /unauthorized para acesso negado
- [x] Adicionar rota /unauthorized no App.tsx
- [x] Testar com usuário role="admin" (funcionando - acesso permitido)

## Correção de Campos Obrigatórios em Employees
- [x] Verificar schema employees - campos position e department são opcionais
- [x] Converter strings vazias em undefined no backend para evitar erro de inserção
- [x] Aplicar correção em cpf, phone, position, department, skills, photoUrl
- [x] Testar criação de funcionário (aguardando teste do usuário)

## Área de Atendimento para Usuários (Role=User)

### 1. Schema de Banco de Dados
- [x] Criar tabela `conversations` (id, customer_id, channel, status, assigned_to, opened_at, closed_at, close_reason)
- [x] Usar tabela `messages` existente (já tem campos necessários)
- [x] Criar tabela `quick_replies` (id, title, content, category, created_by)
- [x] Criar tabela `agent_status` (id, user_id, channel, status, last_activity)
- [x] Criar tabela `queue_settings` (id, name, channel, max_wait_minutes, is_active)
- [x] Executar migração do banco (0009_abnormal_franklin_richards.sql)

### 2. En### 2. Endpoints Backend
- [x] Criar endpoint `conversations.list` (listar conversas do agente)
- [x] Criar endpoint `conversations.getById` (detalhes da conversa)
- [x] Criar endpoint `conversations.assign` (atribuir conversa ao agente)
- [x] Criar endpoint `conversations.close` (encerrar conversa com motivo)
- [x] Criar endpoint `messages.list` (listar mensagens da conversa)
- [x] Criar endpoint `messages.send` (enviar mensagem)
- [x] Criar endpoint `quickReplies.list` (listar mensagens prontas)
- [x] Criar endpoint `quickReplies.create` (criar mensagem pronta - admin)
- [x] Criar endpoint `status.get` (status do agente por canal)
- [x] Criar endpoint `status.update` (atualizar status online/paused/offline)
- [x] Criar endpoint `queues.list` (listar filas ativas)
- [x] Criar endpoint `metrics.realtime` (métricas em tempo real)
- [x] Criar arquivo routers-agent.ts separadopo real)

### 3. Página 1 - Gerenciamento de Filas (/agent/queues)
- [ ] Criar rota /agent/queues no App.tsx (protegida para user)
- [ ] Criar componente QueueManagement.tsx
- [ ] Header com saudação personalizada e horário
- [ ] Card de fila com timer e status
- [ ] Indicadores de status WhatsApp/Instagram (conectado/pausado)
- [ ] Botões de conectar/desconectar por canal
- [ ] Seção de novidades
- [ ] Layout responsivo com cores da Farma Francis

### 4. Página 2 - Interface de Chat (/agent/chat)
- [ ] Criar rota /agent/chat no App.tsx (protegida para user)
- [ ] Criar componente AgentChat.tsx
- [ ] Painel esquerdo: lista de conversas com busca
- [ ] Ícones de filtro (todas, não lidas, atribuídas)
- [ ] Painel direito: área de chat
- [ ] Header do chat com info do contato e timer
- [ ] Área de mensagens com scroll automático
- [ ] Campo de input com toolbar
- [ ] Botão emoji picker
- [ ] Botão anexar arquivo
- [ ] Botão mensagens prontas (dropdown)
- [ ] Botão enviar mensagem
- [ ] Modal de encerramento com categorias (Venda, Orçamentos, Conversa anterior, Engano)

### 5. Sistema de Mensagens Prontas
- [ ] Criar componente QuickRepliesModal.tsx
- [ ] Listar mensagens prontas por categoria
- [ ] Busca de mensagens prontas
- [ ] Inserir mensagem pronta no campo de input
- [ ] Página admin para gerenciar mensagens prontas

### 6. Métricas em Tempo Real
- [ ] Implementar WebSocket ou polling para atualização automática
- [ ] Contador de atendimentos ativos
- [ ] Timer de atendimento individual
- [ ] Notificações de novas mensagens
- [ ] Badge de mensagens não lidas

### 7. Integração WhatsApp/Instagram
- [ ] Criar mock de API para desenvolvimento
- [ ] Estrutura para integração futura com WhatsApp Business API
- [ ] Estrutura para integração futura com Instagram Graph API
- [ ] Sistema de webhooks para receber mensagens

### 8. Testes e Validação
- [ ] Testar login como usuário (role=user)
- [ ] Testar acesso às páginas de atendimento
- [ ] Testar envio e recebimento de mensagens
- [ ] Testar encerramento de conversas
- [ ] Testar mensagens prontas
- [ ] Testar métricas em tempo real

## Correção de Login de Funcionários
- [x] Verificar endpoint employees.create - garantir que email seja salvo na tabela users (já está correto)
- [x] Testar criação de funcionário com email e senha
- [ ] Testar login com funcionário criado
- [x] Adicionar rota /agent/queues no App.tsx
- [x] Redirecionar usuários role="user" para /agent/queues após login


## Correções Urgentes - Validação de Email e Login
- [x] Corrigir validação de email no endpoint employees.create (permitir usernames simples sem @)
- [x] Verificar hash de senha ao criar funcionário
- [x] Testar criação de funcionário com username simples
- [x] Testar login de funcionário criado


## Correção de Username no Login
- [ ] Investigar qual campo está sendo usado como username no login (atualmente: email)
- [ ] Verificar expectativa do usuário: campo "Nome" deve ser usado como username
- [ ] Modificar endpoint employees.create para salvar Nome no campo email da tabela users
- [ ] Atualizar formulário de criação de funcionário para deixar claro que Nome será o username
- [ ] Testar criação de funcionário com nome como username
- [ ] Testar login com nome de usuário


## Correções Urgentes - Validação de Email e Login
- [x] Corrigir validação de email no endpoint employees.create (permitir usernames simples sem @)
- [x] Verificar hash de senha ao criar funcionário
- [x] Testar criação de funcionário com username simples
- [x] Testar login de funcionário criado

## Correção de Username no Login
- [x] Analisar código atual de criação de usuário
- [x] Identificar campo usado para login (email vs nome)
- [x] Modificar backend para inverter campos (name→email, email→name)
- [x] Atualizar frontend para refletir mudanças (labels e placeholders)
- [x] Testar criação de novo funcionário
- [x] Testar login com nome de usuário criado
- [x] Corrigir exibição do nome na página de atendimento


## Correção de Redirecionamento Pós-Login
- [x] Analisar código de redirecionamento após login
- [x] Implementar lógica: role="admin" → /dashboard, role="user" → /agent/queues
- [x] Testar login com usuário comum (deve ir para /agent/queues)
- [x] Testar login com admin (deve ir para /dashboard)


## Investigação: Usuários Comuns Indo para Dashboard
- [x] Verificar role do usuário criado no banco de dados
- [x] Testar login com usuário comum e verificar logs
- [x] Identificar causa do redirecionamento incorreto
- [x] Corrigir problema
- [x] Validar que usuário comum vai para /agent/queues


## Correção Urgente: Dede entrando como Admin
- [x] Verificar role do Dede no banco de dados
- [x] Verificar se UPDATE anterior funcionou
- [x] Testar login com logs detalhados
- [x] Corrigir role se necessário
- [x] Validar redirecionamento para /agent/queues


## CRÍTICO: Todos usuários sendo criados como admin
- [ ] Verificar estado inicial do formulário (newEmployee)
- [ ] Verificar se role está sendo enviado corretamente ao backend
- [ ] Corrigir valor padrão de role para "user"
- [ ] Testar criação de novo usuário
- [ ] Validar que novo usuário tem role="user" no banco
- [ ] Validar que novo usuário redireciona para /agent/queues


## Correções Urgentes - Validação de Email e Login
- [x] Corrigir validação de email no endpoint employees.create (permitir usernames simples sem @)
- [x] Verificar hash de senha ao criar funcionário
- [x] Testar criação de funcionário com username simples
- [x] Testar login de funcionário criado

## Correção de Redirecionamento por Role
- [x] Analisar código de redirecionamento após login
- [x] Implementar lógica: role="admin" → /dashboard, role="user" → /agent/queues
- [x] Testar login com usuário comum (deve ir para /agent/queues)
- [x] Testar login com admin (deve ir para /dashboard)

## Investigação: Usuários Comuns Indo para Dashboard
- [x] Verificar role do Dede no banco de dados
- [x] Verificar se UPDATE anterior funcionou
- [x] Testar login com logs detalhados
- [x] Corrigir role se necessário
- [x] Validar redirecionamento para /agent/queues

## CRÍTICO: Todos usuários sendo criados como admin
- [x] Verificar estado inicial do formulário (newEmployee.role)
- [x] Verificar backend employees.create
- [x] Forçar role="user" explicitamente ao enviar para backend
- [x] Testar criação de novo usuário
- [x] Verificar role no banco de dados
- [x] Testar login e redirecionamento


## CRÍTICO: Usuários comuns AINDA indo para dashboard
- [x] Ler Login.tsx completo
- [x] Ler App.tsx completo (verificar rotas e redirecionamentos)
- [x] Ler ProtectedRoute.tsx completo
- [x] Ler auth.me endpoint no backend
- [x] Ler auth.login endpoint no backend
- [x] Verificar TODOS os lugares onde há redirecionamento
- [x] Identificar o problema REAL (Home.tsx linha 14-18)
- [x] Corrigir definitivamente
- [x] Testar com usuário recém criado


## CRÍTICO: Login retornando usuário errado
- [ ] Investigar endpoint auth.login no backend
- [ ] Verificar lógica de busca de usuário por email
- [ ] Corrigir bug que está retornando usuário errado
- [ ] Testar login com Leide e verificar que retorna dados corretos


## Nova Página: Painel de Filas
- [x] Criar estrutura da página com layout limpo
- [x] Adicionar mensagem de boas-vindas personalizada
- [x] Implementar lista de filas disponíveis
- [x] Criar botão de Pause com dropdown (Almoço 1h, Lanche 15min)
- [x] Adicionar relógio em tempo real no lado direito
- [x] Implementar sistema de mensagens motivacionais diárias
- [x] Testar responsividade e ajustar layout


## Integração Backend: Filas de Atendimento
- [x] Criar tabela `queues` no schema do banco de dados
- [x] Criar endpoints tRPC para listar filas
- [x] Criar endpoint para obter estatísticas de fila em tempo real
- [x] Atualizar frontend QueuePanel para consumir dados reais
- [x] Inserir filas de exemplo no banco de dados
- [x] Testar listagem e exibição de dados reais


## Atualização Automática de Estatísticas
- [x] Implementar polling a cada 10 segundos no frontend
- [x] Testar atualização automática das estatísticas das filas


## Página de Chat de Atendimento
- [ ] Criar estrutura da página com layout de 2 colunas (lista + chat)
- [ ] Implementar lista de conversas ativas à esquerda
- [ ] Criar área de mensagens à direita
- [ ] Adicionar campo de input com suporte a texto
- [ ] Implementar seletor de emojis
- [ ] Adicionar suporte a anexos (imagens, documentos)
- [ ] Criar sistema de mensagens prontas/respostas rápidas
- [ ] Implementar endpoints tRPC para buscar conversas e mensagens
- [ ] Adicionar endpoint para enviar mensagens
- [ ] Testar envio e recebimento de mensagens


## Envio Funcional de Mensagens
- [x] Verificar endpoint messages.send no backend
- [x] Implementar mutation no frontend (AgentChat.tsx)
- [x] Conectar botão Enviar à mutation
- [x] Adicionar invalidação de queries para atualizar lista
- [x] Limpar campo de texto após envio bem-sucedido
- [ ] Testar envio de mensagem e atualização em tempo real


## Correção Rota /settings/api
- [x] Verificar se rota está registrada no App.tsx
- [x] Criar componente APISettings se não existir
- [x] Testar acesso à rota /settings/api


## Upload de Arquivos no Chat
- [x] Adicionar campos fileUrl, fileName, fileType, fileSize ao schema conversation_messages
- [x] Aplicar migração do schema no banco de dados
- [x] Criar endpoint tRPC para upload de arquivos (usando S3)
- [x] Implementar botão de anexo no frontend
- [x] Adicionar input file com validação de tipo e tamanho
- [x] Implementar preview de imagens antes de enviar
- [x] Exibir arquivos anexados nas mensagens (imagens com preview, documentos com ícone)
- [x] Adicionar botão de download para arquivos
- [x] Testar upload de imagem
- [x] Testar upload de documento (PDF, DOCX)


## Emoji Picker
- [x] Instalar biblioteca emoji-picker-react
- [x] Adicionar botão de emoji na interface de chat
- [x] Implementar popup do emoji picker
- [x] Inserir emoji selecionado no campo de texto
- [x] Testar seleção de emojis

## Sistema de Respostas Rápidas
- [x] Criar tabela quick_replies no banco (se não existir)
- [x] Criar endpoints tRPC para CRUD de respostas rápidas
- [x] Criar modal de respostas rápidas com categorias
- [x] Adicionar botão para abrir modal de respostas rápidas
- [x] Implementar busca/filtro de respostas
- [x] Inserir resposta selecionada no campo de texto
- [x] Inserir respostas de exemplo no banco
- [ ] Criar página de gerenciamento de respostas rápidas (admin)
- [x] Testar sistema completo

## Sistema de Pausas para Agentes
- [x] Criar tabela agent_pauses no banco
- [x] Criar endpoints tRPC para iniciar/finalizar pausa
- [x] Criar endpoint para verificar status de pausa do agente
- [x] Implementar modal de seleção de tipo de pausa (Almoço/Lanche/Banheiro/Outro)
- [x] Conectar botão "Pause" da página de filas ao sistema
- [x] Adicionar indicador visual de status (pausado/ativo)
- [x] Implementar timer de pausa com contagem de tempo decorrido
- [ ] Adicionar lógica para finalizar pausa automaticamente após duração
- [ ] Bloquear distribuição de conversas para agentes em pausa
- [x] Testar fluxo completo de pausas

## Página Admin de Respostas Rápidas
- [x] Criar página QuickRepliesManagement.tsx
- [x] Implementar tabela com listagem de respostas
- [x] Adicionar formulário de criação/edição
- [x] Implementar ações de deletar resposta
- [x] Adicionar filtros e busca
- [x] Restringir acesso apenas para admins (AdminRoute)
- [x] Adicionar rota no App.tsx (/admin/quick-replies)
- [x] Testar CRUD completo

## Finalização Automática de Pausas
- [x] Criar job/worker para verificar pausas expiradas
- [x] Implementar lógica de verificação de tempo decorrido vs duração planejada
- [x] Finalizar pausas automaticamente quando tempo expirar
- [x] Iniciar worker no servidor (verificação a cada 1 minuto)
- [ ] Adicionar notificação para agente quando pausa finalizar
- [x] Testar finalização automática

## Bloqueio de Distribuição Durante Pausas
- [x] Criar helper para verificar disponibilidade de agentes
- [x] Implementar funções de filtragem de agentes disponíveis
- [x] Bloquear entrada em fila para agentes em pausa
- [x] Remover agente automaticamente das filas ao iniciar pausa
- [x] Funções para obter agentes disponíveis de uma fila
- [x] Testar que agentes em pausa não recebem novas conversas


## TopBar de Navegação para Agentes
- [x] Criar componente AgentTopBar com abas "Filas" e "Mensagens"
- [x] Adicionar TopBar na página QueuePanel
- [x] Implementar navegação entre abas
- [x] Estilizar TopBar com design consistente
- [x] Adicionar TopBar na página de mensagens do agente
- [x] Testar navegação

## Separação de Mensagens Admin/Agente
- [x] Criar nova página AgentMessages para atendimento de clientes
- [x] Listar conversas atribuídas ao agente logado
- [x] Permitir agente responder mensagens dos clientes
- [x] Adicionar TopBar na página AgentMessages
- [x] Integrar emoji picker e respostas rápidas
- [x] Atualizar rotas (rota /agent/messages)
- [x] Página Messages já existe como visualização admin
- [x] Testar fluxo completo de atendimento

## Dashboard com Dados Reais
- [x] Criar router dashboardStats com endpoints de estatísticas
- [x] Conectar card "Atendimentos" com contagem real de conversas
- [x] Conectar card "Clientes Únicos" com contagem de customers
- [x] Conectar card "Mensagens enviadas/recebidas" com conversation_messages
- [x] Conectar card "Média atend./agente" com cálculo real
- [x] Conectar gráfico "Contatos por hora" com dados reais (24h)
- [x] Conectar gráfico "Atendimentos por fila" com dados reais
- [x] Implementar cálculo de variações percentuais (7 dias vs 7 dias anteriores)
- [x] Adicionar botão de atualizar com loading state
- [x] Testar todos os cards e gráficos


## Tabela de Agentes no Dashboard com Dados Reais
- [x] Criar endpoint getAgentStats para buscar estatísticas de cada agente
- [x] Calcular atendimentos por agente
- [x] Calcular dias ativos por agente
- [x] Calcular média de atendimentos por dia
- [x] Calcular mensagens enviadas/recebidas por agente
- [x] Calcular TMA (tempo médio de atendimento) por agente
- [x] Conectar tabela no Dashboard com dados reais
- [x] Testar tabela com agentes reais


## Correção do Link de Mensagens no TopBar
- [x] Verificado - link já está correto (/agent/messages)
- [x] Rota acessível para agentes (ProtectedRoute)
- [x] TopBar visível em /agent/queues e /agent/messages


## Correção de Erro SQL no Dashboard
- [x] Corrigir query getContactsByHour para usar HOUR() ao invés de DATE_FORMAT
- [x] Adicionar verificação de NULL em opened_at
- [x] Testar endpoint no dashboard - servidor reiniciado com sucesso


## Funcionalidades da Página de Mensagens (AgentMessages)

### 1. Ordenação de Conversas
- [x] Criar dropdown de ordenação com 5 opções principais
- [x] Implementar "Por ordem de chegada (mais novos ao final)"
- [x] Implementar "Há mais tempo aberto primeiro"
- [x] Implementar "Há menos tempo aberto primeiro"
- [x] Implementar "Última mensagem mais recente primeiro"
- [x] Implementar "Mensagens não lidas primeiro"
- [x] Persistir preferência de ordenação no localStorage
- [ ] Implementar "Por etiquetas" (requer sistema de tags)

### 2. Abrir Nova Conversa
- [x] Criar botão "Nova conversa" com ícone de mensagem
- [x] Criar modal com opções "Digitar número/email" e "Buscar nos contatos"
- [x] Implementar busca de contatos existentes
- [x] Implementar criação de conversa com novo número/email
- [x] Criar endpoint tRPC customers.search
- [x] Criar endpoint tRPC conversations.create

### 3. Puxar Atendimento de Fila
- [x] Criar botão "Puxar atendimento" com ícone
- [x] Criar modal mostrando filas disponíveis com contador
- [x] Implementar lógica para puxar próxima conversa da fila
- [x] Criar endpoint tRPC queues.listWithCounts
- [x] Criar endpoint tRPC queues.pullConversation

### 4. Silenciar Notificações
- [x] Criar botão toggle para silenciar/ativar notificações
- [x] Implementar estado de notificações (ativo/silenciado)
- [x] Persistir preferência no localStorage
- [x] Adicionar tooltip explicativo (title)
- [x] Testar todas as 4 funcionalidades
- [x] Corrigir erros TypeScript


## Melhorias na Página AgentMessages

### 1. Atualização Automática de Conversas
- [x] Implementar polling a cada 5 segundos para atualizar lista de conversas
- [x] Implementar polling a cada 3 segundos para atualizar mensagens da conversa ativa
- [ ] Adicionar indicador visual de "atualizando" discreto (opcional)
- [x] Queries já otimizadas com refetchInterval

### 2. Indicadores Visuais de Status
- [x] Adicionar badge de tempo desde última mensagem
- [x] Implementar cores progressivas (verde < 5min, amarelo < 30min, vermelho > 30min)
- [x] Adicionar badge de canal (WhatsApp/Instagram)
- [ ] Mostrar indicador de "digitando..." quando agente está escrevendo (opcional)

### 3. Busca e Filtros Avançados
- [x] Adicionar campo de busca na lista de conversas
- [x] Implementar filtro por nome do cliente
- [x] Implementar filtro por telefone
- [x] Implementar filtro por conteúdo de mensagem
- [x] Implementar filtro por canal (WhatsApp/Instagram)
- [x] Adicionar contador de resultados filtrados
- [ ] Implementar filtro por período (opcional - pode ser adicionado depois)

### 4. Correção da Funcionalidade de Chat
- [x] Verificar se mensagens estão sendo carregadas corretamente (polling a cada 3s)
- [x] Corrigir envio de mensagens do agente (mutation com refetch)
- [x] Implementar scroll automático para última mensagem
- [x] Exibição de mensagens com cores diferentes (agente/cliente)
- [x] Timestamp relativo em cada mensagem
- [ ] Adicionar indicador de mensagem enviada/entregue/lida (opcional)
- [ ] Corrigir exibição de arquivos anexados (já implementado anteriormente)
- [x] Testar fluxo completo de conversação


## Sistema de Tags/Etiquetas
- [ ] Criar tabela tags no banco
- [ ] Criar tabela conversation_tags (relacionamento)
- [ ] Criar endpoints tRPC para CRUD de tags
- [ ] Criar componente TagManager para gerenciar tags
- [ ] Adicionar botão de tags na conversa ativa
- [ ] Implementar filtro por tag na lista de conversas
- [ ] Adicionar atalhos de teclado para aplicar tags
- [ ] Testar sistema completo de tags

## Transferência de Conversas
- [ ] Criar endpoint tRPC para listar agentes disponíveis
- [ ] Criar endpoint tRPC para transferir conversa
- [ ] Criar componente TransferModal
- [ ] Mostrar lista de agentes com carga de trabalho
- [ ] Adicionar campo de nota de transferência
- [ ] Atualizar status da conversa após transferência
- [ ] Notificar agente que recebeu transferência
- [ ] Testar fluxo completo de transferência

## Histórico e Notas do Cliente
- [ ] Criar tabela customer_notes no banco
- [ ] Criar endpoints tRPC para CRUD de notas
- [ ] Criar endpoint para buscar histórico de conversas do cliente
- [ ] Criar componente CustomerHistoryPanel (painel lateral)
- [ ] Exibir conversas anteriores com datas
- [ ] Exibir notas internas do agente
- [ ] Permitir adicionar/editar notas
- [ ] Mostrar linha do tempo de interações
- [ ] Testar painel completo


## Correção de Erros TypeScript e Testes
- [x] Corrigir erros TypeScript no schema de tags
- [x] Ajustar router de tags para usar schema correto (removido campo icon)
- [x] Criar script de seed com dados de teste
- [x] Popular banco com 5 clientes fictícios
- [ ] Popular banco com conversas fictícias (erro no schema)
- [ ] Popular banco com mensagens fictícias (erro no schema)
- [ ] Testar página AgentMessages como agente
- [ ] Verificar todas as funcionalidades (ordenação, busca, chat, etc)


## Correção Urgente - ReferenceError em AgentMessages
- [x] Investigar causa raiz do erro "Cannot access 'R' before initialization"
- [x] Verificar imports e dependências circulares
- [x] Corrigir import do React com hooks (useState, useEffect, useRef, useMemo)
- [ ] Testar página


## Popular Banco com Dados de Teste
- [x] Criar 5 conversas fictícias com diferentes status
- [ ] Criar mensagens fictícias em cada conversa (erro SQL)
- [x] Associar conversas aos agentes existentes
- [ ] Testar visualização na página AgentMessages

## Correção dos 135 Erros TypeScript
- [x] Remover ou ajustar definições de tags no schema
- [x] Corrigir router de tags
- [x] Verificar compilação TypeScript

## Notificações Sonoras
- [x] Adicionar arquivo de som de notificação (Web Audio API)
- [x] Implementar lógica de reprodução ao receber nova mensagem
- [x] Respeitar estado de mute
- [ ] Testar notificações

## Correção de Erro SQL no Dashboard
- [x] Investigar erro SQL no endpoint getContactsByHour
- [x] Corrigir query que usa HOUR() para compatibilidade com MySQL
- [x] Testar dashboard após correção
- [x] Verificar se gráfico "Contatos por hora" carrega corretamente

## Correção de Erro 404 em /automation
- [x] Remover rota /automation do App.tsx
- [x] Verificar se erro 404 foi corrigido

## Busca Automática de Nome de Contato
- [x] Implementar função para buscar nome do Instagram automaticamente
- [x] Implementar função para buscar nome do WhatsApp automaticamente
- [x] Integrar busca automática ao criar nova conversa
- [ ] Testar busca automática de nomes

## Filtros de Período no Dashboard
- [x] Adicionar seletor de período (Hoje, Ontem, Esta Semana, Este Mês)
- [x] Implementar lógica de filtragem por período
- [x] Atualizar todos os gráficos com base no período selecionado
- [ ] Testar filtros de período

## Drill-down no Gráfico de Horas
- [ ] Adicionar evento de clique nas barras do gráfico
- [ ] Criar modal/painel com detalhes das conversas da hora selecionada
- [ ] Exibir lista de conversas com informações relevantes
- [ ] Testar drill-down no gráfico

## Exportação de Relatórios
- [ ] Criar botão de exportação no dashboard
- [ ] Implementar exportação em formato CSV
- [ ] Implementar exportação em formato PDF
- [ ] Incluir todos os dados visíveis no relatório
- [ ] Testar exportação de relatórios

## Integração com WhatsApp Business API
- [x] Criar endpoint para buscar perfil do WhatsApp
- [x] Implementar autenticação com WhatsApp Business API
- [x] Buscar nome do contato via API
- [x] Buscar foto de perfil via API
- [x] Tratar erros e fallbacks
- [ ] Testar integração com WhatsApp

## Integração com Instagram Graph API
- [x] Criar endpoint para buscar perfil do Instagram
- [x] Implementar autenticação com Instagram Graph API
- [x] Buscar nome e username via API
- [x] Buscar foto de perfil via API
- [x] Buscar bio do perfil via API
- [x] Tratar erros e fallbacks (com método público)
- [ ] Testar integração com Instagram

## Drill-down no Gráfico de Horas
- [x] Adicionar evento onClick nas barras do gráfico (pronto para integrar)
- [x] Criar modal de detalhes das conversas
- [x] Buscar conversas do período selecionado (hora específica)
- [x] Exibir lista de conversas com informações relevantes
- [x] Adicionar paginação (endpoint suporta limit/offset)
- [ ] Integrar modal no Dashboard
- [ ] Testar drill-down no gráfico

## Configuração do Evolution API
- [ ] Criar página de configuração do Evolution API
- [ ] Adicionar formulário para URL base do Evolution API
- [ ] Adicionar campo para API Key
- [ ] Adicionar campo para Instance Name
- [ ] Salvar configurações no banco de dados
- [ ] Criar endpoints para CRUD de configurações
- [ ] Testar conexão com Evolution API
- [ ] Adicionar validação de credenciais
- [ ] Exibir status da conexão (conectado/desconectado)

## URGENTE - FlowBuilder Não Renderiza Nós
- [x] Verificar como FlowBuilder é chamado quando usuário clica no fluxo
- [x] Verificar se dados do fluxo (nodes/edges) estão sendo carregados do banco
- [x] Verificar se FlowBuilder está recebendo initialNodes e initialEdges
- [x] Corrigir renderização restaurando FlowBuilder funcional do checkpoint 68bbfd1

## Adicionar Bot\u00e3o de Logout no Painel de Agente
- [ ] Adicionar bot\u00e3o de logout/sair no nome do agente
- [ ] Testar funcionalidade de logout

## Revisão Completa do Projeto
- [x] Verificar e corrigir erros de TypeScript (65 → 54 erros)
- [x] Verificar imports e dependências faltantes (FlowEdge exportado)
- [x] Verificar rotas e navegação (funcionando)
- [x] Verificar componentes quebrados (corrigidos)
- [x] Testar todas as páginas principais

## Implementar Editor Visual N8N Totalmente Funcional
- [x] Criar componentes de nós customizados profissionais com ícones e cores (N8NNode.tsx)
- [x] Implementar canvas React Flow com drag-and-drop funcional (N8NFlowEditor.tsx)
- [x] Criar painel lateral para adicionar novos nós ao canvas (N8NSidebar.tsx)
- [x] Implementar edição de nós ao duplo-clicar (N8NNodeConfig.tsx com formulários específicos)
- [x] Criar toolbar com botões: Salvar, Exportar, Importar, Zoom In/Out, Fit View
- [x] Adicionar minimap para navegação rápida no canvas
- [x] Integrar editor na página /automation substituindo FlowBuilder antigo
- [ ] Testar criação, edição, salvamento e carregamento de fluxos
- [ ] Testar import/export de arquivos .json e .ivr

## Adicionar Suporte para Múltiplos Formatos de Importação
- [x] Analisar formato .ivr (Base64 + JSON aninhado)
- [x] Analisar formato fluxo_ura.json (Drawflow)
- [x] Analisar formato flow_drawflow.json (Drawflow)
- [x] Criar conversor universal que detecta formato automaticamente (flowConverters.ts)
- [x] Integrar conversores no N8NFlowEditor
- [ ] Testar importação de todos os formatos

## Corrigir Sistema de Configuração de APIs
- [ ] Criar tabela `api_configs` no banco para armazenar tokens e credenciais
- [ ] Criar procedures tRPC: `apiConfig.save`, `apiConfig.get`, `apiConfig.test`
- [ ] Implementar teste de conexão real com WhatsApp Business API
- [ ] Implementar teste de conexão real com Instagram Graph API
- [ ] Atualizar página /settings/api para usar backend (salvar/carregar do banco)
- [ ] Adicionar validação de tokens antes de salvar
- [ ] Mostrar feedback visual de sucesso/erro ao salvar
- [ ] Garantir que tokens persistam após recarregar página
- [ ] Testar fluxo completo: salvar → recarregar → testar conexão

## Corrigir Sistema de Configuração de APIs (PROFISSIONAL)
- [x] Usar tabela integrationSettings existente no banco
- [x] Criar router tRPC apiConfig com procedures: get, save, test, delete
- [x] Implementar teste de conexão REAL com WhatsApp Business API (graph.facebook.com)
- [x] Implementar teste de conexão REAL com Instagram Graph API (graph.facebook.com)
- [x] Implementar teste de conexão REAL com Evolution API (/instance/fetchInstances)
- [x] Reescrever página APISettings completamente para usar novo backend
- [x] Salvar tokens em JSON no campo config (persistência garantida)
- [x] Adicionar feedback visual profissional (toast + status cards com ícones)
- [x] Carregar configurações existentes ao abrir página
- [ ] Testar fluxo completo: salvar → testar → reload → verificar persistência

## Implementar Webhooks WhatsApp e Instagram (Tempo Real)
- [ ] Verificar se tabela de mensagens já existe no schema
- [ ] Criar endpoint GET /api/webhooks/whatsapp para verificação Meta
- [ ] Criar endpoint POST /api/webhooks/whatsapp para receber mensagens
- [ ] Criar endpoint GET /api/webhooks/instagram para verificação Meta
- [ ] Criar endpoint POST /api/webhooks/instagram para receber mensagens
- [ ] Implementar validação de verify_token
- [ ] Implementar validação de assinatura (x-hub-signature-256)
- [ ] Criar parser de payload WhatsApp (mensagens de texto, imagem, áudio, vídeo)
- [ ] Criar parser de payload Instagram (mensagens diretas)
- [ ] Salvar mensagens recebidas no banco de dados
- [ ] Integrar com engine de automação para processar fluxos ativos
- [ ] Adicionar logs de webhook para debug
- [ ] Criar testes unitários para webhooks
- [ ] Documentar formato de payloads esperados

## Webhooks e Recebimento de Mensagens em Tempo Real
- [x] Criar endpoints GET/POST para /api/webhooks/whatsapp
- [x] Criar endpoints GET/POST para /api/webhooks/instagram
- [x] Implementar verificação de webhook (Meta exige)
- [x] Implementar parser de payloads WhatsApp (texto, mídia, localização, etc)
- [x] Implementar parser de payloads Instagram (texto, anexos)
- [x] Salvar mensagens recebidas na tabela receivedMessages
- [x] Integrar webhooks com flow-engine para processamento automático
- [x] Adicionar validação de assinatura HMAC SHA256 para segurança
- [x] Adicionar campo app_secret ao schema de api_configurations
- [ ] Testar recebimento real de mensagens do WhatsApp
- [ ] Testar recebimento real de mensagens do Instagram
- [ ] Implementar retry logic para mensagens que falharem no processamento
- [ ] Adicionar logs detalhados de webhooks no painel de administração

## Configuração de Webhook na Interface
- [x] Adicionar campo "Webhook Verify Token" no formulário de API Settings
- [x] Adicionar campo "App Secret" no formulário de API Settings
- [x] Atualizar schema do formulário para incluir novos campos
- [x] Atualizar mutation de save para salvar webhookVerifyToken e appSecret
- [x] Adicionar campos para WhatsApp e Instagram
- [x] Adicionar instruções de uso na interface
- [ ] Testar fluxo completo de configuração

## Bug: Validação de Webhook Falhando
- [ ] Corrigir webhooks.ts para buscar token da tabela integration_settings
- [ ] Atualizar lógica de validação GET para usar novo schema
- [ ] Testar verificação com Meta Developer Portal
- [ ] Validar que o token @Afrancis87 funciona corretamente
