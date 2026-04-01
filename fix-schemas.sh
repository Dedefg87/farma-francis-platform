#!/bin/bash

# Encontrar todas as linhas com "period: z.string()" e adicionar startDate/endDate após elas
sed -i '/period: z\.string()\.optional()\.default("\([^"]*\)")/{
  N
  s/period: z\.string()\.optional()\.default("\([^"]*\)")\n/period: z.string().optional().default("\1"),\n          startDate: z.string().optional(),\n          endDate: z.string().optional(),\n/
}' server/routers-dashboard-stats.ts

echo "✅ Schemas atualizados!"
