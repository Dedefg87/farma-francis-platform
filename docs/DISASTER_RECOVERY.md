# 🚨 Plano de Recuperação de Desastres - Farma Francis Platform

**Versão:** 1.0
**Data:** 25/03/2026
**Responsável:** Anderson (andersonfg23@gmail.com)

---

## 📋 Sumário

Este documento descreve os procedimentos de recuperação para cenários de falha crítica no sistema Farma Francis Platform.

---

## 🔄 Cenário 1: Banco de Dados MySQL Corrompido ou Perdido

### Sintomas
- Conexões ao MySQL falham
- Erros "Table doesn't exist" ou "Cannot connect to database"
- Railway logs mostram `ECONNREFUSED` ou `ER_PARSE_ERROR`

### Procedimento de Recuperação

#### 1.1 Parar a Aplicação
```bash
# No Railway, faça deploy de uma manutenção ou pare o serviço
# Se tiver acesso SSH ao VPS:
systemctl stop farma-francis || true
# OU
pm2 stop all
```

#### 1.2 Identificar Último Backup Válido
```bash
ls -lht /backups/mysql/ | head -5
# Escolher o arquivo mais recente que não contenha erro
```

#### 1.3 Restaurar Backup
```bash
# Descompactar
gunzip -c /backups/mysql/backup_20260325_0200.sql.gz > /tmp/restore.sql

# Restaurar (criar banco se necessário)
mysql -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importar
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /tmp/restore.sql

# Verificar integridade
mysql -u $DB_USER -p$DB_PASSWORD -e "SHOW TABLES;" $DB_NAME | wc -l
# Deve retornar >= 40 tabelas
```

#### 1.4 Validar Dados
```sql
-- Conectar ao MySQL e executar:
SELECT COUNT(*) FROM broadcast_messages;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM conversation_messages;
-- Comparar com backup anterior se disponível
```

#### 1.5 Reiniciar Aplicação
```bash
systemctl start farma-francis || pm2 restart all
# ou acionar deploy no Railway
```

#### 1.6 Verificar Funcionamento
- ✅ API responde (HTTP 200)
- ✅ Login funciona
- ✅ Mensagens recebidas
- ✅ Broadcast envia

---

## 🖼️ Cenário 2: Perda de Imagens e Mídias (R2)

### Sintomas
- Imagens não carregam no frontend (erro 403/404)
- Links do R2 quebrados

### Procedimento de Recuperação

#### 2.1 Identificar Bucket R2 Original
- Bucket: `farmafranciswhatsappmedia`
- Endpoint: `https://pub-33c481f0a9e94adb8870472308f49471.r2.dev`

#### 2.2 Restaurar a partir do Backup S3
```bash
# Listar backups disponíveis
aws s3 ls s3://seu-bucket-backup/backups/r2/ --recursive | tail -10

# Baixar backup mais recente
aws s3 cp s3://seu-bucket-backup/backups/r2/r2_20260325_0200.tar.gz /tmp/

# Extrair
tar -xzf /tmp/r2_20260325_0200.tar.gz -C /tmp/

# Sincronizar de volta para R2 (CUIDADO: sobrescreve!)
aws s3 sync /tmp/r2_20260325_0200/ s3://farmafranciswhatsappmedia/ \
  --endpoint-url=https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com
```

#### 2.3 Validar Restauração
- ✅ Acessar algumas imagens via URL pública
- ✅ Fazer upload de nova imagem e verificar se aparece
- ✅ Testar broadcast com imagem

---

## 💥 Cenário 3: Perda Total do Sistema (Infraestrutura)

### Sintomas
- Servidor/VPS inacessível
- Railway projeto deletado
- Containers não iniciam

### Procedimento de Recuperação

#### 3.1 Reconstruir Infraestrutura
- ✅ Criar novo VPS (Hostinger) com Docker
- ✅ Criar novo projeto no Railway
- ✅ Configurar domínios e SSL

#### 3.2 Restaurar Banco de Dados
- Seguir **Cenário 1** (restaurar MySQL de backup S3)

#### 3.3 Restaurar Imagens R2
- Seguir **Cenário 2** (sync R2 a partir de backup S3)

#### 3.4 Reimplantar Código
```bash
git clone https://github.com/Dedefg87/farma-francis-platform.git
cd farma-francis-platform
npm install
npm run build
# Configurar variáveis de ambiente (Railway ou .env)
npm start
```

#### 3.5 Validar Todos os Módulos
- [ ] API responde
- [ ] Login funciona
- [ ] Mensagens WhatsApp recebidas
- [ ] Broadcast envia
- [ ] Baby Shower funciona
- [ ] CRM operacional
- [ ] Imagens carregam

---

## 📊 Cenário 4: Corrupção de Dados Específicos

### Sintomas
- Registros específicos com dados errados
- Contatos duplicados
- Histórico de mensagens faltando

### Procedimento
1. Identificar dados corrompidos
2. Restaurar apenas tabelas afetadas de backup:
```bash
# Extrair tabela específica do backup
mysqldump -u user -p db nome_tabela < backup.sql
# OU
mysql -u user -p db -e "DROP TABLE nome_tabela;"
mysql -u user -p db < backup.sql
```

---

## 🧪 Testes de Recuperação

### Frequência
- **Mensal:** Restaurar backup em ambiente de staging
- **Trimestral:** Teste completo de disaster recovery

### procedimento de Teste
1. Criar banco de teste: `farma_francis_test`
2. Restaurar backup
3. Executar queries de validação
4. Comparar contagens com produção
5. Documentar tempo de recuperação

### Métricas
- **RTO (Recovery Time Objective):** < 2 horas
- **RPO (Recovery Point Objective):** < 24 horas (backup diário)

---

## 📞 Contatos de Emergência

| Role | Nome | Email | Telefone |
|------|------|-------|----------|
| Responsável | Anderson | andersonfg23@gmail.com | (31) 99565-7081 |
| Suporte | Farma Francis | suporte@farmafrancis.com | - |

---

## 📁 Localização dos Backups

| Tipo | Local Primário | Local Secundário | Retenção |
|------|----------------|------------------|----------|
| MySQL | S3 Standard-IA | R2 (copiado) | 30 dias |
| R2 | S3 Glacier-IR | Local /backups/r2 | 90 dias |
| Logs | S3 Glacier | Local /backups/logs | 365 dias |

---

## ✅ Checklist de Recuperação

- [ ] Backup mais recente identificado
- [ ] Banco restaurado em ambiente de teste
- [ ] Integridade verificada (contagem de linhas)
- [ ] Aplicação conectada ao banco restaurado
- [ ] Imagens R2 validadas
- [ ] Testes manuais realizados
- [ ] Tempo de recuperação documentado
- [ ] Lições aprendidas anotadas

---

## 🔄 Revisão

Este plano deve ser revisado **trimestralmente** ou após qualquer incidente de recuperação.

**Próxima revisão:** 25/06/2026
