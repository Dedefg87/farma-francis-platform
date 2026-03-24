import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Determinar o caminho da build: em produção, o Vite gera em ../../dist/public
  // Em desenvolvimento, o Vite serve via自己的 dev server, então não usamos estático.
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
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
