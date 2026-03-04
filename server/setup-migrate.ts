import { Router } from "express";
import { getDb } from "./db.js";

const router = Router();

router.get("/criar-tabelas-eventos", async (req: any, res: any) => {
  const db = await getDb();
  try {
    // Tabela eventos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS eventos (
        id VARCHAR(36) PRIMARY KEY,
        contato_id INT NOT NULL,
        nome_evento VARCHAR(255) NOT NULL,
        descricao TEXT,
        status ENUM('ativo','encerrado','cancelado') DEFAULT 'ativo',
        meta_valor DECIMAL(10,2),
        data_fim DATE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_status (status),
        KEY idx_contato (contato_id)
      )
    `);

    // Tabela evento_sessoes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS evento_sessoes (
        tracking_id VARCHAR(64) PRIMARY KEY,
        evento_id VARCHAR(36) NOT NULL,
        ip_ou_fingerprint VARCHAR(255),
        user_agent TEXT,
        acessado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        compra_realizada INT DEFAULT 0,
        KEY idx_tracking (evento_id, tracking_id)
      )
    `);

    // Tabela evento_compras
    await db.execute(`
      CREATE TABLE IF NOT EXISTS evento_compras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        evento_id VARCHAR(36) NOT NULL,
        tracking_id VARCHAR(64) NOT NULL,
        produto VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        status_pagamento ENUM('pendente','pago','rejeitado','estornado') DEFAULT 'pendente',
        nome_comprador VARCHAR(255) NOT NULL,
        email_comprador VARCHAR(255),
        telefone_comprador VARCHAR(50),
        mensagem TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_compra (evento_id, tracking_id)
      )
    `);

    // Resposta HTML amigável
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Setup - Chá de Fraldas</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background: #f0fdf4; }
          .box { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
          h1 { color: #16a34a; }
          .success { color: #16a34a; font-size: 18px; margin: 20px 0; }
          .btn { display: inline-block; margin-top: 20px; padding: 15px 30px; background: #ec4899; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .btn:hover { background: #db2777; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>✅ Tabelas Criadas com Sucesso!</h1>
          <div class="success">As 3 tabelas foram criadas no banco de dados:</div>
          <ul style="text-align: left; display: inline-block; color: #374151;">
            <li>eventos</li>
            <li>evento_sessoes</li>
            <li>evento_compras</li>
          </ul>
          <br>
          <a href="/baby-shower" class="btn">Ir para Chá de Fraldas</a>
        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Erro</title></head>
      <body style="padding: 40px; font-family: Arial; color: #dc2626;">
        <h1>❌ Erro ao Criar Tabelas</h1>
        <p>${e.message}</p>
      </body>
      </html>
    `);
  }
});

export default router;
