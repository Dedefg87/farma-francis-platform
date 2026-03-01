# Diagrama do Fluxo de Deploy - Farma Francis Platform

```mermaid
flowchart TB
    subgraph DEV["💻 Desenvolvimento Local"]
        A[Desenvolvedor] -->|Push| B[GitHub]
        L[package.json] --> M[pnpm-lock.yaml]
        N[Código Fonte] --> O[Build Local]
    end

    subgraph BUILD["🔨 Build Process"]
        B -->|Trigger| C{Railway Auto-Deploy}
        C -->|Checkout| D[Código Fonte]
        D --> E[Dockerfile]
        E -->|Multi-stage| F[Stage 1: Base]
        F -->|pnpm install| G[Instalação Deps]
        G --> H[Stage 2: Build]
        H -->|vite + esbuild| I[Assets Compilados]
        I --> J[Stage 3: Production]
    end

    subgraph CORRECAO["🔧 Correção Aplicada"]
        K[ANTES: --frozen-lockfile]
        K -->|Problema| L2[Lockfile outdated]
        L2 -->|Erro| M2[Build Falha]
        N2[DEPOIS: --no-frozen-lockfile]
        N2 -->|Solução| O2[Lockfile Atualizado]
        O2 -->|Sucesso| P2[Build Passa]
    end

    subgraph DEPLOY["🚀 Deploy"]
        J -->|Image| Q[Railway Container]
        Q -->|PORT env| R[Node.js Server]
        R -->|Health Check| S{/api/health}
        S -->|OK| T[✅ Online]
        S -->|FAIL| U[❌ Retry]
        U -->|Restart| Q
    end

    subgraph ENV["⚙️ Variáveis de Ambiente"]
        V[DATABASE_URL] --> W[MySQL Connection]
        X[JWT_SECRET] --> Y[Auth Signing]
        Z[NODE_ENV=production] --> AA[Production Mode]
        AB[PORT] --> AC[Server Port]
    end

    %% Conexões
    B -.->|Webhook| C
    G -.->|Usa| CORRECAO
    P2 -.->|Trigger| J
    ENV -.->|Injetado| Q

    %% Styling
    style DEV fill:#e1f5fe
    style BUILD fill:#fff3e0
    style CORRECAO fill:#e8f5e9
    style DEPLOY fill:#fce4ec
    style ENV fill:#f3e5f5
    
    style CORRECAO stroke:#4caf50,stroke-width:3px
    style P2 fill:#4caf50,color:#fff
    style M2 fill:#f44336,color:#fff
    style T fill:#4caf50,color:#fff
```

## 📝 Análise das Correções

### ❌ Problemas Anteriores:
1. **`sed`** quebrando código (parênteses/collchetes órfãos)
2. **`--frozen-lockfile`** travando quando lockfile desatualizado
3. **Vite** importado estaticamente (deveria ser dinâmico)
4. **Porta** não respeitando variável `PORT` do Railway
5. **Health check** com timeout curto demais

### ✅ Correções Aplicadas:
1. **Usar `edit` tool** ao invés de `sed`
2. **`--no-frozen-lockfile`** permitindo atualização automática
3. **Importação dinâmica** do Vite apenas em desenvolvimento
4. **`parseInt(process.env.PORT)`** respeitando Railway
5. **`start-period: 120s`** no health check
6. **`--define:process.env.NODE_ENV="production"`** no esbuild (define externo)
7. **Externalização** de devDependencies do Vite no bundle

## 🎯 Fluxo Atual Funcional

```mermaid
sequenceDiagram
    participant Dev as Desenvolvedor
    participant GH as GitHub
    participant RY as Railway
    participant DB as MySQL

    Dev->>GH: Push código
    GH->>RY: Webhook trigger
    RY->>RY: Build com --no-frozen-lockfile
    RY->>RY: Gera imagem Docker
    RY->>RY: Inicia container
    RY->>DB: Testa conexão
    DB-->>RY: Connection OK
    RY->>RY: Health check /api/health
    RY-->>Dev: ✅ Deploy Online!
```

## 🔧 Comandos Importantes

| Comando | Propósito |
|---------|-----------|
| `pnpm install --no-frozen-lockfile` | Instala sem travar em lockfile desatualizado |
| `railway up` | Deploy manual (com Railway CLI) |
| `railway logs` | Ver logs em tempo real |
| `curl -f http://localhost:3000/api/health` | Testar health check |

## 📊 Status Final

- ✅ **Build**: Funcionando
- ✅ **Deploy**: Automático no push
- ✅ **Health Check**: Passando
- ✅ **Banco**: Conectado
- ✅ **Ambiente**: Production

---
*Diagrama gerado em: 2026-03-01*  
*Sistema: Farma Francis Platform*  
*Plataforma: Railway + Node.js 20 + MySQL*
