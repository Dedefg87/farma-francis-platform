import React from "react";

/**
 * Helper para renderizar URLs como links clicáveis no texto
 * Converte URLs http/https em elementos <a> com formatação azul e underline
 * Para URLs do Google Maps, renderiza um mini-mapa interativo embed
 * Mantém quebras de linha normais do texto
 */
export function renderContentWithLinks(text: string | null | undefined) {
  if (!text) return null;

  // Regex para detectar URLs http e https
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      // Detecta se é o link de localização gerado pelo backend
      const isGoogleMaps = part.includes('maps.google.com/?q=');

      if (isGoogleMaps) {
        // Extrai a latitude e longitude (ex: -19.123,-43.123)
        try {
          const coords = part.split('?q=')[1]?.split('&')[0] || '';

          return (
            <div key={index} className="flex flex-col gap-2 mt-2 mb-1 w-full max-w-[300px]">
              <a
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline hover:text-blue-700 break-all text-sm font-medium flex items-center gap-1"
              >
                🗺️ Abrir Rota no Maps
              </a>
              {/* Renderiza o mini-mapa interativo sem necessidade de API Key */}
              <iframe
                width="100%"
                height="150"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(coords)}&z=15&output=embed`}
                className="rounded-lg border border-gray-200 shadow-sm"
                title="Mapa da localização"
              />
            </div>
          );
        } catch (e) {
          // Se falhar ao extrair coordenadas, cai para link normal
          console.error("Error parsing Google Maps coordinates:", e);
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
      }

      // Comportamento padrão para links normais
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
    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
  });
}
