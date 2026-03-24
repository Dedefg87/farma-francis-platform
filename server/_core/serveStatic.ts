import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Determinar o caminho da build: em produção, o Vite gera em ../../dist/public
  const distPath = path.resolve(import.meta.dirname, "..", "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Servir arquivos estáticos
  app.use(express.static(distPath));

  // Fallback para SPA: se o arquivo não existir, retorna index.html
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`[serveStatic] index.html não encontrado em ${indexPath}`);
      res.status(404).json({ error: "Not found" });
    }
  });
}
