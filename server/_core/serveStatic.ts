import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Usar process.cwd() como base (raiz do projeto)
  const distPath = path.join(process.cwd(), "dist", "public");

  console.log(`[serveStatic] Serving static files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Servir arquivos estáticos
  app.use(express.static(distPath));

  // Fallback para SPA: se o arquivo não existir, retorna index.html
  app.use("*", (_req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`[serveStatic] index.html não encontrado em ${indexPath}`);
      res.status(404).json({ error: "Not found" });
    }
  });
}
