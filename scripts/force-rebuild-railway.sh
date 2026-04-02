#!/usr/bin/env bash

# Railway Force Rebuild Helper
# Atualiza FORCE_REBUILD com timestamp atual e limpa arquivos de rebuild antigos

set -e

PROJECT_DIR="/data/.openclaw/workspace/farma-francis-platform"
cd "$PROJECT_DIR"

echo "🔧 Railway Force Rebuild Helper"
echo "================================"
echo ""

# 1. Atualizar FORCE_REBUILD
CURRENT_TIMESTAMP=$(date +%s)
echo "1️⃣ Atualizando .env.build com FORCE_REBUILD=$CURRENT_TIMESTAMP"
echo "FORCE_REBUILD=$CURRENT_TIMESTAMP" > .env.build
echo "✅ .env.build atualizado"
echo ""

# 2. Limpar arquivos de rebuild antigos
echo "2️⃣ Limpando arquivos de rebuild antigos..."
OLD_FILES=(
  "FORCE_REBUILD_*.txt"
  "REBUILD.txt"
  "force-rebuild.txt"
  "REBUILD.md"
  "PUSH_FIX.txt"
  "FINAL_FIX.txt"
  "DEPLOY_NOW.txt"
  "DEPLOY_TRIGGER.txt"
)

for pattern in "${OLD_FILES[@]}"; do
  matches=$(ls $pattern 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "   Removendo: $matches"
    rm -f $pattern
  fi
done

echo "✅ Limpeza concluída"
echo ""

# 3. Commit e push
echo "3️⃣ Commitando mudanças..."
git add .env.build
git rm -f --cached FORCE_REBUILD_*.txt REBUILD.txt force-rebuild.txt REBUILD.md PUSH_FIX.txt FINAL_FIX.txt DEPLOY_NOW.txt DEPLOY_TRIGGER.txt 2>/dev/null || true
git commit -m "chore: force rebuild - $(date '+%Y-%m-%d %H:%M:%S')" || echo "   Nada para commitar"
git push origin main

echo "✅ Changes pushed to origin/main"
echo ""

# 4. Instruções
echo "📋 PRÓXIMOS PASSOS:"
echo "---------------------"
echo "1. Acesse https://railway.app/dashboard"
echo "2. Abra o projeto 'farma-francis-platform'"
echo "3. Verifique se Auto Deploy está ATIVADO (Settings → Auto Deploy)"
echo "4. Aguarde 2-5 minutos para o build iniciar automaticamente"
echo "   OU clique em 'Deploy' → 'Trigger Deploy' manualmente"
echo "5. Monitore o status em Deployments"
echo ""
echo "🔍 Se o deploy não disparar automaticamente:"
echo "   - Vá em Deployments → Trigger Deploy (botão superior)"
echo "   - Marque 'Clean Cache' se disponível"
echo ""
echo "✅ Script concluído!"
