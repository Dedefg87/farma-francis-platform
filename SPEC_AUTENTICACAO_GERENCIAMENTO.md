# Especificação Técnica - Correções e Módulo de Autenticação

**Projeto:** Farma Francis - Plataforma de Gestão e Atendimento  
**Data:** 31/01/2026  
**Autor:** Arquiteto de Sistemas  
**Versão:** 1.0

---

## 1. CORREÇÕES DE BUGS URGENTES

### 1.1 Painel Histórico de Execuções - Falha na Exportação

**Problema Identificado:**
- Botão "Exportar" na página `/executions` não possui handler funcional
- Usuários não conseguem exportar relatórios de execuções de fluxos

**Análise Técnica:**
- Componente: `client/src/pages/Executions.tsx`
- Causa raiz: Botão implementado apenas com UI, sem lógica de negócio
- Impacto: Alta - funcionalidade crítica para relatórios gerenciais

**Solução Proposta:**

```typescript
// Implementar sistema de exportação multi-formato
interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  filters: {
    status?: string;
    flowId?: number;
    dateRange?: { start: Date; end: Date };
  };
}

// Endpoint tRPC
executions.export.mutation({
  input: ExportOptions,
  output: { url: string; filename: string }
})
```

**Arquitetura:**
1. **Frontend:** Adicionar dropdown de seleção de formato (CSV/PDF/Excel)
2. **Backend:** Criar endpoint `executions.export` que:
   - Busca dados filtrados do banco
   - Formata dados conforme formato selecionado
   - Gera arquivo temporário
   - Retorna URL para download
3. **Utilidades:** Reutilizar `exportUtils.ts` já existente

**Critérios de Aceitação:**
- [ ] Usuário seleciona formato de exportação
- [ ] Filtros aplicados são respeitados na exportação
- [ ] Arquivo é gerado e baixado automaticamente
- [ ] Feedback visual durante processamento (loading)
- [ ] Mensagem de sucesso/erro exibida via toast

---

### 1.2 Dashboard - Dados Mockados ao Invés de Reais

**Problema Identificado:**
- Dashboard (`/`) exibe dados estáticos/mockados
- Métricas não refletem estado real do sistema

**Análise Técnica:**
- Componente: `client/src/pages/Home.tsx`
- Causa raiz: Queries tRPC não implementadas ou retornando dados fixos
- Impacto: Crítico - decisões gerenciais baseadas em dados incorretos

**Solução Proposta:**

```typescript
// Endpoints tRPC necessários
dashboard.getMetrics.query() → {
  totalTickets: number;
  openTickets: number;
  avgResponseTime: number;
  customerSatisfaction: number;
  ticketsToday: number;
  ticketsTrend: number; // % change
}

dashboard.getChartData.query({
  metric: 'tickets' | 'messages' | 'agents',
  period: '7d' | '30d' | '90d'
}) → {
  labels: string[];
  data: number[];
}

dashboard.getTopAgents.query({ limit: 5 }) → Agent[]
```

**Queries SQL Necessárias:**

```sql
-- Total de tickets
SELECT COUNT(*) FROM tickets WHERE status != 'closed';

-- Tempo médio de resposta
SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, first_response_at)) 
FROM tickets 
WHERE first_response_at IS NOT NULL;

-- Satisfação do cliente
SELECT AVG(rating) FROM ticket_ratings WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Tickets por hora (gráfico)
SELECT HOUR(created_at) as hour, COUNT(*) as count
FROM tickets
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY HOUR(created_at);
```

**Arquitetura:**
1. **Backend:** Criar router `dashboard` com 3 endpoints principais
2. **Banco de Dados:** Adicionar índices em `created_at`, `status`, `assigned_to`
3. **Frontend:** Substituir dados mockados por `trpc.dashboard.*` queries
4. **Cache:** Implementar cache de 5 minutos para métricas agregadas

**Critérios de Aceitação:**
- [ ] Todas as métricas exibem dados reais do banco
- [ ] Gráficos refletem dados históricos corretos
- [ ] Dashboard atualiza automaticamente (polling ou websocket)
- [ ] Loading states implementados
- [ ] Performance: queries executam em < 500ms

---

## 2. MÓDULO DE AUTENTICAÇÃO E GERENCIAMENTO

### 2.1 Tela de Login Customizada

**Requisitos Funcionais:**
- Substituir tela de login padrão por versão customizada
- Exibir logo da Farma Francis
- Aplicar cores institucionais (verde/branco)
- Suportar login via email/senha e Google OAuth

**Especificação Visual:**

```
┌─────────────────────────────────────────┐
│                                         │
│           [LOGO FARMA FRANCIS]          │
│                                         │
│     Plataforma de Gestão e Atendimento  │
│                                         │
│     ┌─────────────────────────────┐    │
│     │ Email                       │    │
│     └─────────────────────────────┘    │
│                                         │
│     ┌─────────────────────────────┐    │
│     │ Senha              [👁]     │    │
│     └─────────────────────────────┘    │
│                                         │
│     [ Esqueci minha senha ]             │
│                                         │
│     ┌─────────────────────────────┐    │
│     │      Entrar                 │    │
│     └─────────────────────────────┘    │
│                                         │
│     ──────── ou ────────                │
│                                         │
│     ┌─────────────────────────────┐    │
│     │  [G] Entrar com Google      │    │
│     └─────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**Cores Institucionais:**
- Primary: `#00A859` (Verde Farma Francis)
- Secondary: `#FFFFFF` (Branco)
- Accent: `#0D8B4F` (Verde escuro)
- Background: `#F5F5F5` (Cinza claro)
- Text: `#2D2D2D` (Cinza escuro)

**Arquitetura:**

```typescript
// Novo componente
client/src/pages/Login.tsx

interface LoginFormData {
  email: string;
  password: string;
}

// Fluxo de autenticação
1. Usuário preenche credenciais
2. Frontend valida formato (email válido, senha >= 8 chars)
3. POST /api/auth/login com { email, password }
4. Backend valida credenciais contra tabela `users`
5. Se válido: gera JWT token e seta cookie httpOnly
6. Redirect para /dashboard
7. Se inválido: exibe erro "Credenciais inválidas"
```

**Segurança:**
- Senhas armazenadas com bcrypt (salt rounds: 12)
- JWT tokens com expiração de 7 dias
- Cookie httpOnly + secure + sameSite=strict
- Rate limiting: 5 tentativas por 15 minutos por IP
- Proteção contra timing attacks

**Critérios de Aceitação:**
- [ ] Logo exibido corretamente (SVG responsivo)
- [ ] Cores institucionais aplicadas
- [ ] Validação de formulário em tempo real
- [ ] Mensagens de erro claras e amigáveis
- [ ] Loading state durante autenticação
- [ ] Redirect automático se já autenticado
- [ ] Funciona em mobile/tablet/desktop

---

### 2.2 Gerenciamento de Usuários - Controle de Acesso Admin

**Requisitos Funcionais:**
- Apenas administradores podem criar/editar/excluir usuários
- Implementar middleware de autorização
- Exibir mensagem de "Acesso negado" para não-admins

**Modelo de Dados:**

```typescript
// Tabela users (já existe)
interface User {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: 'admin' | 'user'; // ← Campo crítico
  loginMethod: 'email' | 'google';
  passwordHash?: string; // Apenas para loginMethod='email'
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

// Novos campos para gerenciamento
interface UserManagement extends User {
  cpf?: string;
  phone?: string;
  department?: string;
  position?: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[]; // ['tickets.view', 'tickets.edit', 'users.manage']
}
```

**Middleware de Autorização:**

```typescript
// server/_core/middleware.ts
export const adminOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Acesso restrito a administradores'
    });
  }
  return next({ ctx });
});

// Uso nos routers
users: router({
  list: protectedProcedure.query(...), // Qualquer usuário autenticado
  create: adminOnlyProcedure.mutation(...), // Apenas admin
  update: adminOnlyProcedure.mutation(...), // Apenas admin
  delete: adminOnlyProcedure.mutation(...), // Apenas admin
})
```

**Frontend - Controle de Acesso:**

```typescript
// Hook de autorização
function useAuth() {
  const { data: user } = trpc.auth.me.useQuery();
  
  return {
    user,
    isAdmin: user?.role === 'admin',
    can: (permission: string) => user?.permissions?.includes(permission) ?? false
  };
}

// Uso no componente
function UsersPage() {
  const { isAdmin } = useAuth();
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardHeader>
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você não tem permissão para acessar esta página.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Apenas administradores podem gerenciar usuários.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')}>
              Voltar ao Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return <UsersManagementUI />;
}
```

**Critérios de Aceitação:**
- [ ] Middleware `adminOnlyProcedure` implementado
- [ ] Rotas de gerenciamento protegidas no backend
- [ ] Frontend exibe "Acesso Negado" para não-admins
- [ ] Botões de criar/editar/excluir ocultos para não-admins
- [ ] Tentativa de acesso direto via URL redireciona
- [ ] Logs de auditoria para ações administrativas

---

### 2.3 Campos Essenciais no Gerenciamento de Usuários

**Requisitos:**
- Formulário completo para criação/edição de usuários
- Validação de dados em tempo real
- Campos obrigatórios e opcionais claramente marcados

**Campos do Formulário:**

```typescript
interface UserFormData {
  // Informações Básicas (obrigatórias)
  name: string; // Nome completo
  email: string; // Email único
  role: 'admin' | 'user'; // Perfil de acesso
  
  // Informações de Contato (opcionais)
  phone?: string; // Telefone com máscara (31) 98633-7081
  cpf?: string; // CPF com máscara 000.000.000-00
  
  // Informações Profissionais (opcionais)
  department?: string; // Departamento (Atendimento, Vendas, Farmácia)
  position?: string; // Cargo (Atendente, Gerente, Farmacêutico)
  hireDate?: Date; // Data de contratação
  
  // Configurações de Acesso
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[]; // Permissões granulares
  
  // Senha (apenas para novo usuário com loginMethod='email')
  password?: string; // Mínimo 8 caracteres
  passwordConfirm?: string; // Confirmação de senha
}
```

**Validações:**

```typescript
const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'user']),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/).optional(),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  password: z.string().min(8).optional(),
  passwordConfirm: z.string().optional(),
}).refine(data => {
  if (data.password) {
    return data.password === data.passwordConfirm;
  }
  return true;
}, {
  message: 'Senhas não coincidem',
  path: ['passwordConfirm']
});
```

**UI/UX:**

```
┌─────────────────────────────────────────────────┐
│ Novo Usuário                              [X]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Informações Básicas                             │
│ ┌─────────────────────────────────────────┐    │
│ │ Nome Completo *                         │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ Email *                                 │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ Perfil de Acesso *      [▼ Usuário]    │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ Informações de Contato                          │
│ ┌──────────────────────┐ ┌─────────────────┐  │
│ │ Telefone             │ │ CPF             │  │
│ └──────────────────────┘ └─────────────────┘  │
│                                                 │
│ Informações Profissionais                       │
│ ┌──────────────────────┐ ┌─────────────────┐  │
│ │ Departamento [▼]     │ │ Cargo           │  │
│ └──────────────────────┘ └─────────────────┘  │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ Data de Contratação  [📅]               │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ Configurações de Acesso                         │
│ ┌─────────────────────────────────────────┐    │
│ │ Status               [▼ Ativo]          │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ☐ Enviar email de boas-vindas                  │
│ ☐ Solicitar troca de senha no primeiro acesso  │
│                                                 │
├─────────────────────────────────────────────────┤
│                    [Cancelar] [Salvar Usuário] │
└─────────────────────────────────────────────────┘
```

**Critérios de Aceitação:**
- [ ] Formulário com todos os campos especificados
- [ ] Validação em tempo real com mensagens claras
- [ ] Máscaras aplicadas em telefone e CPF
- [ ] Dropdown de departamento com opções predefinidas
- [ ] Seletor de data para hireDate
- [ ] Checkbox de "Enviar email de boas-vindas" funcional
- [ ] Botão "Salvar" desabilitado enquanto há erros de validação
- [ ] Feedback de sucesso/erro após submissão

---

## 3. PLANO DE IMPLEMENTAÇÃO

### Fase 1: Correções de Bugs (Prioridade Alta)
**Tempo estimado:** 4-6 horas

1. **Exportação de Execuções** (2h)
   - Implementar endpoint `executions.export`
   - Adicionar dropdown de formato no frontend
   - Testar com datasets grandes (1000+ registros)

2. **Dashboard com Dados Reais** (3h)
   - Criar router `dashboard` com 3 endpoints
   - Adicionar índices no banco de dados
   - Substituir dados mockados no frontend
   - Implementar cache de 5 minutos

### Fase 2: Autenticação (Prioridade Média)
**Tempo estimado:** 6-8 horas

1. **Tela de Login** (4h)
   - Criar componente `Login.tsx`
   - Implementar validação de formulário
   - Integrar com OAuth existente
   - Aplicar cores institucionais

2. **Segurança** (2h)
   - Implementar bcrypt para senhas
   - Configurar rate limiting
   - Adicionar proteção CSRF

### Fase 3: Gerenciamento de Usuários (Prioridade Média)
**Tempo estimado:** 8-10 horas

1. **Controle de Acesso** (3h)
   - Criar middleware `adminOnlyProcedure`
   - Proteger rotas no backend
   - Implementar página "Acesso Negado"

2. **Formulário Completo** (5h)
   - Adicionar todos os campos especificados
   - Implementar validações com Zod
   - Adicionar máscaras e datepickers
   - Testar fluxo completo

### Fase 4: Testes e Documentação (Prioridade Baixa)
**Tempo estimado:** 4 horas

1. **Testes Automatizados**
   - Unit tests para validações
   - Integration tests para endpoints
   - E2E tests com Playwright

2. **Documentação**
   - Atualizar README com novas funcionalidades
   - Documentar endpoints da API
   - Criar guia de permissões

---

## 4. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Performance do Dashboard com muitos dados | Média | Alto | Implementar paginação e cache agressivo |
| Conflito com OAuth existente | Baixa | Alto | Manter compatibilidade com sistema atual |
| Usuários perderem acesso após mudança de auth | Baixa | Crítico | Migração gradual com fallback |
| Exportação travar com datasets grandes | Média | Médio | Processar em background com fila |

---

## 5. MÉTRICAS DE SUCESSO

- **Performance:**
  - Dashboard carrega em < 2s
  - Exportação de 1000 registros em < 5s
  - Login completa em < 1s

- **Usabilidade:**
  - Taxa de erro de login < 5%
  - 100% dos admins conseguem criar usuários
  - 0 reclamações sobre acesso negado indevido

- **Segurança:**
  - 0 vulnerabilidades críticas no Snyk
  - 100% das senhas hasheadas com bcrypt
  - Rate limiting efetivo (0 brute force bem-sucedidos)

---

## 6. DEPENDÊNCIAS TÉCNICAS

**Bibliotecas Necessárias:**
```json
{
  "bcryptjs": "^2.4.3",
  "express-rate-limit": "^7.1.5",
  "zod": "^3.22.4", // já instalado
  "react-hook-form": "^7.49.3",
  "date-fns": "^3.0.6"
}
```

**Variáveis de Ambiente:**
```env
JWT_SECRET=<already_set>
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000 # 15 minutos
RATE_LIMIT_MAX_REQUESTS=5
```

---

## 7. CHECKLIST DE ENTREGA

### Correções de Bugs
- [ ] Exportação de execuções funcional (CSV/PDF)
- [ ] Dashboard exibe dados reais do banco
- [ ] Gráficos refletem histórico correto
- [ ] Performance otimizada (< 500ms)

### Autenticação
- [ ] Tela de login customizada
- [ ] Logo e cores institucionais aplicadas
- [ ] Login via email/senha funcional
- [ ] OAuth Google mantido
- [ ] Rate limiting implementado

### Gerenciamento de Usuários
- [ ] Middleware admin implementado
- [ ] Página "Acesso Negado" funcional
- [ ] Formulário completo com todos os campos
- [ ] Validações em tempo real
- [ ] Máscaras aplicadas (CPF, telefone)
- [ ] Email de boas-vindas funcional

### Testes
- [ ] Unit tests para validações
- [ ] Integration tests para endpoints críticos
- [ ] E2E test para fluxo de login
- [ ] E2E test para criação de usuário

### Documentação
- [ ] README atualizado
- [ ] API endpoints documentados
- [ ] Guia de permissões criado
- [ ] Changelog atualizado

---

**Aprovação:**

- [ ] Arquiteto de Sistemas: _______________________
- [ ] Product Owner: _______________________
- [ ] Tech Lead: _______________________

**Data de Aprovação:** ___/___/______
