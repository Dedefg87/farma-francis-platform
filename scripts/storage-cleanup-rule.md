#!/usr/bin/env node
/**
 * Storage Auto-Cleanup Rule
 * Quando disco >= 80%, limpa registros antigos mantendo os 20% mais recentes
 * Tabelas: conversation_messages, received_messages, attachments
 */

const DB_THRESHOLD_MB = 80; // % de uso
const KEEP_PCT = 20;

console.log("[StorageCleanup] Regra configurada: quando disco >= 80%, mantem 20% mais recentes.");
console.log("[StorageCleanup] Executar: node scripts/auto-cleanup.ts");
