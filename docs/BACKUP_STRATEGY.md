# 📦 Estratégia de Backup - SISTEMA FARMA FRANCIS PRO

**Versão:** 1.0
**Data:** 25/03/2026
**Autor:** Jorge (Assistente OpenClaw)
**Cliente:** Anderson (Farma Francis)

---

## 🎯 Visão Geral

A estratégia de backup protege três componentes críticos:

1. **Banco de Dados MySQL** — dados transacionais
2. **Cloudflare R2** — mídias (imagens, áudios, documentos)
3. **Logs** — auditoria e debugging

Todos os backups são **automáticos**, **criptografados em trânsito** e **armazenados em múltiplas camadas**.

---

## 📊 Matriz de Backup

| Componente | Frequência | Retenção | Destino Primário | Destino Secundário | tipo |
|------------|------------|----------|------------------|--------------------|------|
| MySQL | Diário (02:00 UTC) | 30 dias | AWS S3 Standard-IA | Cloudflare R2 | Full dump |
| R2 | Semanal (Domingo 02:00 UTC) | 90 dias | AWS S3 Standard-IA | Local /backups/r2 | Snapshot |
| Logs | Mensal (Dia 1, 03:00 UTC) | 365 dias | AWS S3 Glacier-IR | Local /backups/logs | Archive |
| Configurações | Contínuo | ∞ | Git (GitHub) | — | Versionamento |

---

## 🔧 Implementação

### 1. Backup MySQL

**Script:** `server/scripts/backup-mysql.sh`

**Método:**
- Usa `mysqldump` com opções `--single-transaction`, `--routines`, `--triggers`, `--events`
- Comprime com gzip
- Envia para S3 (se credenciais configuradas)
- Limpa automaticamente backups > 30 dias

**Cron (exemplo Railway):**
```bash
0 2 * * * /data/.openclaw/workspace/farma-francis-platform/server/scripts/backup-mysql.sh >> /var/log/backup-mysql.log 2>&1
```

**Variáveis requeridas:**
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`
- Ou `MYSQL_URL` (formato: `mysql://user:pass@host:port/db`)
- `S3_BUCKET`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

---

### 2. Backup R2 (Cloudflare)

**Script:** `server/scripts/backup-r2.sh`

**Método:**
- Sincroniza bucket R2 para diretório local com `aws s3 sync`
- Comprime em tar.gz
- Envia para S3 (backup do backup)
- Remove diretório temporário
- Limpa backups > 90 dias

**Cron (semanal):**
```bash
0 2 * * 0 /path/to/backup-r2.sh >> /var/log/backup-r2.log 2>&1
```

**Variáveis requeridas:**
- `R2_BUCKET`, `R2_ENDPOINT`
- `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

---

### 3. Backup de Logs

**Script:** `server/scripts/backup-logs.sh`

**Método:**
- Coleta arquivos `.log` de `/var/log/farma-francis/` (ou diretório configurável)
- Comprime em tar.gz
- Envia para S3 com storage class `GLACIER_IR` (barato, recuperação 12h)
- Limpa backups > 365 dias

**Cron (mensal):**
```bash
0 3 1 * * /path/to/backup-logs.sh >> /var/log/backup-logs.log 2>&1
```

---

### 4. Monitoramento de Backups

**Script:** `server/scripts/check-backups.sh`

**Função:**
- Verifica se backup MySQL de hoje existe
- Verifica idade do backup R2 (não deve passar 7 dias)
- Verifica espaço em disco (< 90% usado)
- Envia alertas por email se falhas

**Cron (diário, 6h após backup MySQL):**
```bash
0 6 * * * /path/to/check-backups.sh >> /var/log/check-backups.log 2>&1
```

---

## 🗄️ Destinos de Armazenamento

### AWS S3 (Primário)
- **Região:** us-east-1 (ou mais próxima)
- **Buckets:**
  - `backups-mysql-farma-francis` (Standard-IA, 30 dias)
  - `backups-r2-farma-francis` (Standard-IA, 90 dias)
  - `backups-logs-farma-francis` (Glacier-IR, 365 dias)
- **Versionamento:** Ativado em todos os buckets
- **Criptografia:** SSE-S3 ou SSE-KMS

### Cloudflare R2 (Secundário)
- **Bucket:** `farmafranciswhatsappmedia` (já existe para mídias)
- **Uso:** Backup do bucket R2 (snapshots semanais)
- **Retention:** 90 dias

### Local (Terceiro)
- **Caminho:** `/backups/` no servidor/Docker
- **Uso:** staging antes de upload, cache para restore rápido
- **TTL:** Limitado (50GB máximo)

---

## 🔄 Políticas de Retenção

| Tipo | Retenção | Justificativa |
|------|----------|---------------|
| MySQL | 30 dias | Restore point recente; dados críticos |
| R2 | 90 dias | Mídias grandes, custo de storage alto |
| Logs | 365 dias | Requisitos de auditoria (1 ano) |
| Git | ∞ | Configurações código (versionamento) |

---

## 🧪 Testes e Validação

### Teste Mensal (Automático)
- Restaurar backup MySQL em banco de staging
- Executar `SELECT COUNT(*)` em tabelas principais
- Comparar com produção (tolância ±1%)
- Logar resultados em `/var/log/backup-tests.log`

### Teste Trimestral (Manual)
- Restaurar backup completo em ambiente isolado
- Testar upload/download de imagens R2
- Simular falha e executar plano de DR
- Documentar RTO/RPO

---

## 🚨 Alertas

### Canais
- Email: `andersonfg23@gmail.com`
- (Opcional) Slack/Telegram via webhook

### Triggers
- Falha no backup MySQL (arquivo não criado)
- Backup R2 com idade > 7 dias
- Disco de backup > 90% cheio
- Erro de upload S3 (falha de credencial)
- Checksum inválido (se implementado)

---

## 🔐 Segurança

### Credenciais
- **NÃO** commitar senhas no Git
- Usar variáveis de ambiente Railway ou `.env` (gitignorado)
- Rotacionar chaves AWS a cada 90 dias

### Criptografia
- Em trânsito: TLS 1.3 (AWS S3, R2)
- Em repouso: SSE-S3 ou SSE-KMS (S3); R2 tem criptografia nativa

### Acesso
- Apenas usuário `root` ou `backup` pode acessar `/backups/`
- Logs de acesso ao S3 auditados via CloudTrail

---

## 📈 Custo Estimado (Mensal)

| Serviço | Volume | Custo/mês |
|---------|--------|-----------|
| S3 Standard-IA (MySQL) | ~500MB/dia × 30 = 15GB | ~$0.23/GB × 15 = $3.45 |
| S3 Glacier-IR (Logs) | ~2GB/mês | ~$0.005/GB × 2 = $0.01 |
| S3 Standard-IA (R2 backup) | ~10GB/semana × 4 = 40GB | ~$0.23/GB × 40 = $9.20 |
| Requests | PUT/GET | ~$0.40 |
| **Total estimado** | | **~$13/mês** |

*Nota: Custos podem variar conforme uso real.*

---

## 📝 Próximos Passos (Sprint 2)

1. ✅ Configurar AWS S3 buckets (criar, versionamento, políticas)
2. ✅ Instalar AWS CLI no servidor (`apt-get install awscli`)
3. ✅ Testar scripts em ambiente de desenvolvimento
4. ⬜ Agendar cron jobs no Railway (ou VPS)
5. ⬜ Implementar checksum/sha256 para validação de integridade
6. ⬜ Adicionar métricas Prometheus para monitoramento
7. ⬜ Documentar procedimento de restore em 5 minutos (cheat sheet)

---

## 📚 Referências

- [AWS S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [MySQL Backup Best Practices](https://dev.mysql.com/doc/refman/8.0/en/backup-and-recovery.html)
- [Railway Cron Jobs](https://railway.app/docs/projects/cron-jobs)

---

**Última atualização:** 25/03/2026  
**Próxima revisão:** 25/06/2026
