import { Router } from "express";
import { getDb } from "./db.js";
const router = Router();

router.get("/criar-tabelas", async (req: any, res: any) => {
  const db = await getDb();
  const results: string[] = [];
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS eventos (id VARCHAR(36) PRIMARY KEY, contato_id INT NOT NULL, nome_evento VARCHAR(255) NOT NULL, descricao TEXT, status ENUM('ativo','encerrado','cancelado') DEFAULT 'ativo', meta_valor DECIMAL(10,2), data_fim DATE, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, KEY idx_status (status), KEY idx_contato (contato_id))`);
    results.push("eventos OK");
    await db.execute(`CREATE TABLE IF NOT EXISTS evento_sessoes (tracking_id VARCHAR(64) PRIMARY KEY, evento_id VARCHAR(36) NOT NULL, ip_ou_fingerprint VARCHAR(255), user_agent TEXT, acessado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expira_em TIMESTAMP, compra_realizada INT DEFAULT 0, KEY idx_evento_tracking (evento_id, tracking_id))`);
    results.push("evento_sessoes OK");
    await db.execute(`CREATE TABLE IF NOT EXISTS evento_compras (id INT AUTO_INCREMENT PRIMARY KEY, evento_id VARCHAR(36) NOT NULL, tracking_id VARCHAR(64) NOT NULL, produto VARCHAR(255) NOT NULL, descricao TEXT, valor DECIMAL(10,2) NOT NULL, status_pagamento ENUM('pendente','pago','rejeitado','estornado') DEFAULT 'pendente', nome_comprador VARCHAR(255) NOT NULL, email_comprador VARCHAR(255), telefone_comprador VARCHAR(50), mensagem TEXT, notificacao_enviada INT DEFAULT 0, pago_em TIMESTAMP, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY idx_compra_tracking (evento_id, tracking_id), KEY idx_status (status_pagamento))`);
    results.push("evento_compras OK");
    res.json({ success: true, tables: results });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/verificar", async (req: any, res: any) => {
  const db = await getDb();
  try {
    const rows = await db.execute(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('eventos','evento_sessoes','evento_compras')`);
    res.json({ success: true, tables: (rows as any[]).map(r => r.TABLE_NAME) });
  } catch (e: any) {
    res.json({ success: false, error: e.message });
  }
});

export default router;
