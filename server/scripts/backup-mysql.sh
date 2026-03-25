#!/bin/bash
set -e

# Backup MySQL - Farma Francis Platform
# Usa variáveis de ambiente do Railway ou arquivo .env

BACKUP_DIR="${BACKUP_DIR:-/backups/mysql}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Carregar variáveis de banco
# Prioridade: 1) Variáveis de ambiente Railway, 2) Arquivo .env na raiz
if [ -f "/data/.openclaw/workspace/farma-francis-platform/.env" ]; then
  export $(grep -v '^#' /data/.openclaw/workspace/farma-francis-platform/.env | xargs)
fi

# Determinar conexão MySQL
# Railway usa DATABASE_URL (PostgreSQL) ou MYSQL_URL
if [ -n "$DATABASE_URL" ]; then
  # PostgreSQL (não é o caso, mas por segurança)
  echo "Erro: Este script é para MySQL. DATABASE_URL detectada (PostgreSQL)." >&2
  exit 1
elif [ -n "$MYSQL_URL" ]; then
  # Formato: mysql://user:password@host:port/database
  MYSQL_USER=$(echo $MYSQL_URL | sed -n 's|mysql://\([^:]*\):.*|\1|p')
  MYSQL_PASSWORD=$(echo $MYSQL_URL | sed -n 's|mysql://[^:]*:\([^@]*\).*|\1|p')
  MYSQL_HOST=$(echo $MYSQL_URL | sed -n 's|mysql://[^@]*@\([^:]*\).*|\1|p')
  MYSQL_PORT=$(echo $MYSQL_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  MYSQL_DB=$(echo $MYSQL_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
else
  # Usar variáveis separadas
  MYSQL_HOST="${MYSQL_HOST:-localhost}"
  MYSQL_PORT="${MYSQL_PORT:-3306}"
  MYSQL_USER="${MYSQL_USER:-root}"
  MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
  MYSQL_DB="${MYSQL_DB:-farma_francis}"
fi

echo "🔧 Configuração MySQL:"
echo "   Host: $MYSQL_HOST"
echo "   Porta: $MYSQL_PORT"
echo "   Banco: $MYSQL_DB"
echo "   Usuário: $MYSQL_USER"
echo ""

# Verificar se mysqldump está disponível
if ! command -v mysqldump &> /dev/null; then
  echo "❌ mysqldump não encontrado. Instalando..." >&2
  apt-get update && apt-get install -y mysql-client || {
    echo "❌ Falha ao instalar mysql-client" >&2
    exit 1
  }
fi

# Executar backup
echo "📦 Iniciando backup..."
echo "   Arquivo: $BACKUP_FILE"

mysqldump \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --user="$MYSQL_USER" \
  --password="$MYSQL_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$MYSQL_DB" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup concluído com sucesso!"
  echo "   Tamanho: $SIZE"
  echo "   Arquivo: $BACKUP_FILE"
else
  echo "❌ Falha no backup" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Manter apenas últimos 30 dias
echo "🧹 Limpando backups antigos (>30 dias)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
echo "✅ Limpeza concluída"

# Opcional: Enviar para S3/R2 se AWS CLI configurado
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
  echo "☁️ Enviando para S3 (bucket: $S3_BUCKET)..."
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/mysql/" \
    --endpoint-url="${S3_ENDPOINT:-}" \
    --storage-class="STANDARD_IA"
  echo "✅ Upload para S3 concluído"
fi

echo "🎉 Backup MySQL finalizado!"
