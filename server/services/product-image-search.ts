/**
 * Serviço de busca automática de imagens de produtos
 * Usa Serper API + análise para encontrar a melhor imagem
 */

const SERPER_API_KEY = process.env.SERPER_API_KEY || "6abb2781d7edf99aa211c064912283e3c804e8c0";
const SERPER_API_URL = "https://google.serper.dev/images";

interface ImageResult {
  url: string;
  title: string;
  source: string;
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
 * Prioriza: site oficial > e-commerce conhecido > outros
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

  const images = await searchProductImages(productName);

  if (images.length === 0) {
    return null;
  }

  // Primeiro, tentar encontrar de site oficial ou confiável
  for (const img of images) {
    const sourceLower = img.source.toLowerCase();
    for (const trusted of trustedSources) {
      if (sourceLower.includes(trusted)) {
        console.log(`[ImageSearch] Found trusted image for "${productName}" from ${img.source}`);
        return img.url;
      }
    }
  }

  // Se não encontrou de fonte confiável, retornar a primeira
  console.log(`[ImageSearch] Using first image for "${productName}" from ${images[0].source}`);
  return images[0].url;
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
