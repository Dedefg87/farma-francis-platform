#!/bin/bash
set -e

# Backup Cloudflare R2 - Farma Francis Platform
# Sincroniza R2 para backup local e envia para S3 (backup do backup)

BACKUP_DIR="${BACKUP_DIR:-/backups/r2}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOCAL_DIR="$BACKUP_DIR/r2_$TIMESTAMP"
TAR_FILE="$BACKUP_DIR/r2_$TIMESTAMP.tar.gz"

# Criar diretórios
mkdir -p "$BACKUP_DIR"

# Carregar variáveis de ambiente
if [ -f "/data/.openclaw/workspace/farma-francis-platform/.env" ]; then
  export $(grep -v '^#' /data/.openclaw/workspace/farma-francis-platform/.env | xargs)
fi

# Verificar configuração R2
R2_BUCKET="${R2_BUCKET:-farmafranciswhatsappmedia}"
R2_PUBLIC_URL="${R2_PUBLIC_URL:-https://pub-33c481f0a9e94adb8870472308f49471.r2.dev}"
R2_ENDPOINT="https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com"

echo "🔧 Configuração R2:"
echo "   Bucket: $R2_BUCKET"
echo "   Endpoint: $R2_ENDPOINT"
echo "   Backup local: $LOCAL_DIR"
echo ""

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
  echo "❌ AWS CLI não encontrado. Instalando..." >&2
  apt-get update && apt-get install -y awscli || {
    echo "❌ Falha ao instalar awscli" >&2
    exit 1
  }
fi

# Sincronizar R2 para diretório local
echo "📦 Sincronizando R2 para backup local..."
mkdir -p "$LOCAL_DIR"

aws s3 sync "s3://$R2_BUCKET/" "$LOCAL_DIR/" \
  --endpoint-url="$R2_ENDPOINT" \
  --no-progress || {
    echo "❌ Falha ao sincronizar R2" >&2
    rm -rf "$LOCAL_DIR"
    exit 1
  }

# Comprimir
echo "🗜️  Comprimindo..."
tar -czf "$TAR_FILE" -C "$BACKUP_DIR" "r2_$TIMESTAMP" || {
  echo "❌ Falha ao comprimir" >&2
  rm -rf "$LOCAL_DIR"
  exit 1
  }

# Remover diretório temporário
rm -rf "$LOCAL_DIR"

SIZE=$(du -h "$TAR_FILE" | cut -f1)
echo "✅ Backup R2 criado: $TAR_FILE (tamanho: $SIZE)"

# Enviar para S3 de backup (se configurado)
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
  echo "☁️  Enviando backup R2 para S3..."
  aws s3 cp "$TAR_FILE" "s3://$S3_BUCKET/backups/r2/" \
    --storage-class="STANDARD_IA" \
    --no-progress
  echo "✅ Upload para S3 concluído"
fi

# Limpar backups antigos (>90 dias)
echo "🧹 Limpando backups R2 antigos (>90 dias)..."
find "$BACKUP_DIR" -name "r2_*.tar.gz" -mtime +90 -delete 2>/dev/null || true
echo "✅ Limpeza concluída"

echo "🎉 Backup R2 finalizado!"
