#!/bin/bash
set -e

# Backup de Logs - Farma Francis Platform
# Compacta logs do sistema e envia para S3

LOGS_DIR="${LOGS_DIR:-/var/log/farma-francis}"
BACKUP_DIR="${BACKUP_DIR:-/backups/logs}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TAR_FILE="$BACKUP_DIR/logs_$TIMESTAMP.tar.gz"

# Criar diretórios
mkdir -p "$BACKUP_DIR"

echo "🔧 Configuração Logs:"
echo "   Logs源: $LOGS_DIR"
echo "   Backup: $TAR_FILE"
echo ""

# Verificar se diretório de logs existe
if [ ! -d "$LOGS_DIR" ]; then
  echo "⚠️  Diretório de logs não encontrado: $LOGS_DIR"
  echo "   Criando diretório vazio..."
  mkdir -p "$LOGS_DIR"
fi

# Coletar logs (últimos 30 dias por padrão)
echo "📦 Coletando logs..."
find "$LOGS_DIR" -name "*.log" -o -name "*.log.*" | head -1000 > /tmp/logs-list.txt 2>/dev/null || true

if [ ! -s /tmp/logs-list.txt ]; then
  echo "⚠️  Nenhum log encontrado para backup"
  # Criar arquivo vazio para manter estrutura
  touch empty.log
  tar -czf "$TAR_FILE" -C "$LOGS_DIR" empty.log 2>/dev/null || true
  rm -f empty.log
else
  # Compactar logs encontrados
  tar -czf "$TAR_FILE" -T /tmp/logs-list.txt 2>/dev/null || {
    echo "❌ Falha ao compactar logs" >&2
    exit 1
  }
fi

SIZE=$(du -h "$TAR_FILE" | cut -f1)
echo "✅ Backup de logs criado: $TAR_FILE (tamanho: $SIZE)"

# Enviar para S3
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
  echo "☁️  Enviando logs para S3..."
  aws s3 cp "$TAR_FILE" "s3://$S3_BUCKET/backups/logs/" \
    --storage-class="GLACIER_IR" \
    --no-progress
  echo "✅ Upload de logs concluído"
fi

# Limpar backups antigos (manter 12 meses = 365 dias)
echo "🧹 Limpando backups de logs antigos (>365 dias)..."
find "$BACKUP_DIR" -name "logs_*.tar.gz" -mtime +365 -delete 2>/dev/null || true
echo "✅ Limpeza concluída"

echo "🎉 Backup de logs finalizado!"
