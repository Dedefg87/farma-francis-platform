import React from "react";

/**
 * Helper para renderizar URLs como links clicáveis no texto
 * Converte URLs http/https em elementos <a> com formatação azul e underline
 * Mantém quebras de linha normais do texto
 */
export function renderContentWithLinks(text: string | null | undefined) {
  if (!text) return null;
  
  // Regex para detectar URLs http e https
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-700 break-all"
        >
          {part}
        </a>
      );
    }
    // Mantém as quebras de linha normais do texto
    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
  });
}
