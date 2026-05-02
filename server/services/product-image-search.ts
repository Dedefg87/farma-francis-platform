/**
 * Serviço de busca automática de imagens de produtos
 * Usa Serper API (Google Images) + Pexels API como alternativa
 */

const SERPER_API_KEY = process.env.SERPER_API_KEY ;
const SERPER_API_URL = "https://google.serper.dev/images";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY ;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";
const PEXELS_VIDEO_URL = "https://api.pexels.com/videos/search";

interface ImageResult {
  url: string;
  title: string;
  source: string;
  photographer?: string;
}

interface VideoResult {
  url: string;
  title: string;
  source: string;
  thumbnail: string;
  duration: number;
}

/**
 * Busca imagens no Pexels (stock photos de alta qualidade)
 */
export async function searchPexelsImages(query: string, perPage: number = 10): Promise<ImageResult[]> {
  if (!PEXELS_API_KEY) {
    console.log("[Pexels] API key not configured");
    return [];
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}&locale=pt-BR`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("[Pexels] API error:", response.status);
      return [];
    }

    const data = await response.json();
    const photos = data.photos || [];

    return photos.map((photo: any) => ({
      url: photo.src.large || photo.src.original,
      title: photo.alt || query,
      source: "pexels",
      photographer: photo.photographer,
    }));
  } catch (error) {
    console.error("[Pexels] Error:", error);
    return [];
  }
}

/**
 * Busca vídeos no Pexels
 */
export async function searchPexelsVideos(query: string, perPage: number = 10): Promise<VideoResult[]> {
  if (!PEXELS_API_KEY) {
    console.log("[Pexels] API key not configured");
    return [];
  }

  try {
    const response = await fetch(
      `${PEXELS_VIDEO_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("[Pexels Videos] API error:", response.status);
      return [];
    }

    const data = await response.json();
    const videos = data.videos || [];

    return videos.map((video: any) => ({
      url: video.video_files?.[0]?.link ,
      title: video.alt || query,
      source: "pexels",
      thumbnail: video.image,
      duration: video.duration,
    }));
  } catch (error) {
    console.error("[Pexels Videos] Error:", error);
    return [];
  }
}

/**
 * Busca imagens de um produto no Google Images via Serper
 */
export async function searchProductImages(query: string): Promise<ImageResult[]> {
  try {
    const response = await fetch(SERPER_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query + " produto imagem oficial",
        gl: "br",
        hl: "pt-br",
      }),
    });

    if (!response.ok) {
      console.error("[ImageSearch] Serper API error:", response.status);
      return [];
    }

    const data = await response.json();
    const images = data.images || [];

    return images.slice(0, 5).map((img: any) => ({
      url: img.imageUrl || img.link,
      title: img.title,
      source: img.source,
    }));
  } catch (error) {
    console.error("[ImageSearch] Error:", error);
    return [];
  }
}

/**
 * Busca a melhor imagem para um produto
 * Prioriza: Serper (produtos reais) > Pexels (stock photos)
 */
export async function findBestProductImage(productName: string): Promise<string | null> {
  // Lista de sites confiáveis para produtos farmacêuticos
  const trustedSources = [
    "personal.com.br",
    "drogaraia",
    "drogasil",
    "pague menos",
    "farmadelivery",
    "magazineluiza",
    "americanas",
    "mercado livre",
  ];

  // Primeiro, tentar Serper (Google Images)
  const serperImages = await searchProductImages(productName);

  if (serperImages.length > 0) {
    // Tentar encontrar de site oficial ou confiável
    for (const img of serperImages) {
      const sourceLower = img.source.toLowerCase();
      for (const trusted of trustedSources) {
        if (sourceLower.includes(trusted)) {
          console.log(`[ImageSearch] Found trusted image for "${productName}" from ${img.source}`);
          return img.url;
        }
      }
    }

    // Se não encontrou de fonte confiável, retornar a primeira
    console.log(`[ImageSearch] Using first image for "${productName}" from ${serperImages[0].source}`);
    return serperImages[0].url;
  }

  // Fallback: tentar Pexels
  console.log(`[ImageSearch] Serper empty, trying Pexels for "${productName}"`);
  const pexelsImages = await searchPexelsImages(productName, 5);

  if (pexelsImages.length > 0) {
    console.log(`[ImageSearch] Using Pexels image for "${productName}" by ${pexelsImages[0].photographer}`);
    return pexelsImages[0].url;
  }

  return null;
}

/**
 * Busca e atualiza imagem de um produto do Chá do Bebê
 */
export async function fetchAndUpdateProductImage(
  packageId: number,
  productName: string
): Promise<{ success: boolean; imageUrl: string | null }> {
  const imageUrl = await findBestProductImage(productName);

  if (!imageUrl) {
    return { success: false, imageUrl: null };
  }

  // Atualizar no banco
  try {
    const { getDb } = await import("../db");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();

    if (!db) {
      return { success: false, imageUrl: null };
    }

    await db.execute(sql`
      UPDATE baby_shower_gift_packages 
      SET image_url = ${imageUrl}
      WHERE id = ${packageId}
    `);

    console.log(`[ImageSearch] Updated image for package ${packageId}`);
    return { success: true, imageUrl };
  } catch (error) {
    console.error("[ImageSearch] Error updating database:", error);
    return { success: false, imageUrl: null };
  }
}
