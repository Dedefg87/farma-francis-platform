#!/bin/bash
set -e

# Verificação de Backups - Farma Francis Platform
# Checa se backups recentes existem e envia alertas

BACKUP_DIR="${BACKUP_DIR:-/backups}"
ALERT_EMAIL="${ALERT_EMAIL:-andersonfg23@gmail.com}"
TODAY=$(date +%Y%m%d)

echo "🔍 Verificando backs em $BACKUP_DIR..."

# 1. Verificar backup MySQL de hoje
MYSQL_BACKUP=$(ls "$BACKUP_DIR/mysql/backup_${TODAY}"*.sql.gz 2>/dev/null | head -1)
if [ -z "$MYSQL_BACKUP" ]; then
  echo "❌ ERRO: Backup MySQL de hoje não encontrado!" >&2
  echo "   Esperado: backup_${TODAY}*.sql.gz"
  echo "   Pasta: $BACKUP_DIR/mysql/"
  send_alert "Backup MySQL FAILED" "Backup MySQL de $(date +%Y-%m-%d) não foi encontrado."
  EXIT_CODE=1
else
  SIZE=$(du -h "$MYSQL_BACKUP" | cut -f1)
  echo "✅ MySQL backup OK: $(basename $MYSQL_BACKUP) ($SIZE)"
  EXIT_CODE=0
fi

# 2. Verificar backup R2 (semanal - verificar se existe nos últimos 7 dias)
R2_BACKUP=$(ls "$BACKUP_DIR/r2/r2_*.tar.gz" 2>/dev/null | sort -r | head -1)
if [ -z "$R2_BACKUP" ]; then
  echo "⚠️  AVISO: Backup R2 não encontrado (últimos 7 dias)" >&2
  send_alert "Backup R2 WARNING" "Nenhum backup R2 encontrado nos últimos 7 dias."
else
  R2_AGE=$(( ( $(date +%s) - $(stat -c %Y "$R2_BACKUP") ) / 86400 ))
  if [ $R2_AGE -gt 7 ]; then
    echo "⚠️  AVISO: Backup R2 tem $R2_AGE dias (limite: 7)" >&2
  else
    SIZE=$(du -h "$R2_BACKUP" | cut -f1)
    echo "✅ R2 backup OK: $(basename $R2_BACKUP) (idade: $R2_AGE dias, tamanho: $SIZE)"
  fi
fi

# 3. Verificar logs (último mês)
LOG_BACKUP=$(ls "$BACKUP_DIR/logs/logs_*.tar.gz" 2>/dev/null | sort -r | head -1)
if [ -z "$LOG_BACKUP" ]; then
  echo "⚠️  AVISO: Backup de logs não encontrado (últimos 30 dias)" >&2
else
  LOG_AGE=$(( ( $(date +%s) - $(stat -c %Y "$LOG_BACKUP") ) / 86400 ))
  echo "✅ Logs backup OK: $(basename $LOG_BACKUP) (idade: $LOG_AGE dias)"
fi

# 4. Verificar espaço em disco
DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "❌ ERRO: Disco de backup quase cheio! ($DISK_USAGE% usado)" >&2
  send_alert "Disco de Backup CRITICAL" "Uso de disco: $DISK_USAGE%"
  EXIT_CODE=1
else
  echo "✅ Espaço em disco OK: $DISK_USAGE% usado"
fi

# Função para enviar alerta
send_alert() {
  local subject="$1"
  local body="$2"
  echo "📧 Alerta: $subject"
  echo "   $body"
  # Se mail está disponível, envia email
  if command -v mail &> /dev/null && [ -n "$ALERT_EMAIL" ]; then
    echo "$body" | mail -s "[Farma Francis Backup] $subject" "$ALERT_EMAIL"
  fi
  # Também loga no syslog
  logger -t backup-check "$subject: $body"
}

if [ $EXIT_CODE -eq 0 ]; then
  echo "🎉 Todos os checks passaram!"
else
  echo "❌ Alguns checks falharam. Verifique os logs."
fi

exit $EXIT_CODE
