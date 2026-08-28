import { prisma } from "@/src/lib/prisma";
import type { SafeImagePayload } from "@/src/lib/server-image-guard";
import crypto from "node:crypto";

export interface VisualSearchResult {
  success: boolean;
  traceId: string;
  detectedInfo?: {
    category: string;
    dominantColor: string;
    style: string;
    material?: string;
    itemDescription: string;
    searchKeywords: string[];
    aiModelUsed?: string;
  };
  matchedProducts: Array<{
    id: string;
    title: string;
    category: string;
    color: string | null;
    primaryImage: string;
    rentalPrice: number;
    salePrice: number;
    matchScore: number;
    matchReason: string;
    ownerName: string;
  }>;
  error?: string;
  isFallback?: boolean;
}

export const VISUAL_EMBEDDING_MODEL = "multimodal-embedding-001";
export const VISUAL_EMBEDDING_VERSION = "v1";
export const VISUAL_EMBEDDING_DIMENSION = 1408;
const EMBEDDING_TIMEOUT_MS = 6000;

export async function searchByOutfitImage(imageBase64: string): Promise<VisualSearchResult> {
  return searchByValidatedOutfitImage({
    buffer: Buffer.from(imageBase64, "base64"),
    base64: imageBase64,
    mimeType: "image/jpeg",
  });
}

export async function createImageEmbedding(image: SafeImagePayload): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_DEV || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VISUAL_EMBEDDING_API_KEY_MISSING");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${VISUAL_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
      body: JSON.stringify({
        content: {
          parts: [
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64,
              },
            },
          ],
        },
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "VISUAL_EMBEDDING_PROVIDER_FAILED");
  }

  const vector = payload?.embedding?.values;
  if (
    !Array.isArray(vector) ||
    vector.length !== VISUAL_EMBEDDING_DIMENSION ||
    vector.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error("VISUAL_EMBEDDING_INVALID_RESPONSE");
  }

  return vector;
}

export async function indexProductImageEmbedding(productId: string, imageId: string, imageUrl: string): Promise<void> {
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(6000) });
    if (!imgRes.ok) return;
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = (imgRes.headers.get("content-type") || "image/jpeg") as SafeImagePayload["mimeType"];

    const vector = await createImageEmbedding({
      buffer,
      base64: buffer.toString("base64"),
      mimeType: mimeType === "image/png" || mimeType === "image/webp" ? mimeType : "image/jpeg",
    });

    const vectorLiteral = toPgVectorLiteral(vector);

    await prisma.$executeRawUnsafe(`
      INSERT INTO product_image_embeddings (
        id, product_id, image_id, embedding_model, embedding_version, dimension, embedding, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, NOW(), NOW()
      )
      ON CONFLICT (product_id, image_id, embedding_model, embedding_version)
      DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW();
    `, productId, imageId, VISUAL_EMBEDDING_MODEL, VISUAL_EMBEDDING_VERSION, VISUAL_EMBEDDING_DIMENSION, vectorLiteral);
  } catch (error: any) {
    console.warn(`[Async Embedding Indexing Warning][Product:${productId}]:`, error?.message || error);
  }
}

function toPgVectorLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function searchAvailableProductsByVector(vector: number[]) {
  const vectorLiteral = toPgVectorLiteral(vector);

  return prisma.$queryRawUnsafe<Array<{
    id: string;
    title: string;
    category: string;
    color: string | null;
    primaryImage: string | null;
    rentalPrice: number | null;
    salePrice: number | null;
    ownerName: string | null;
    vectorScore: number;
  }>>(`
    WITH candidates AS (
      SELECT
        product_id,
        image_id,
        1 - (embedding <=> $1::vector) AS vector_score
      FROM product_image_embeddings
      WHERE embedding_model = $2
        AND embedding_version = $3
        AND dimension = $4
      ORDER BY embedding <=> $1::vector
      LIMIT 50
    )
    SELECT
      p.id,
      p.title,
      p.category,
      p.color,
      COALESCE(pi.url, primary_pi.url) AS "primaryImage",
      rent_listing."basePrice" AS "rentalPrice",
      sell_listing."basePrice" AS "salePrice",
      u.name AS "ownerName",
      MAX(c.vector_score)::float AS "vectorScore"
    FROM candidates c
    JOIN products p ON p.id = c.product_id
    LEFT JOIN "Listing" rent_listing
      ON rent_listing."productId" = p.id
      AND rent_listing.status = 'AVAILABLE'
      AND rent_listing."isDeleted" = false
      AND rent_listing."listingType" = 'RENT'
    LEFT JOIN "Listing" sell_listing
      ON sell_listing."productId" = p.id
      AND sell_listing.status = 'AVAILABLE'
      AND sell_listing."isDeleted" = false
      AND sell_listing."listingType" = 'SELL'
    LEFT JOIN "ProductImage" pi ON pi.id = c.image_id
    LEFT JOIN LATERAL (
      SELECT url
      FROM "ProductImage"
      WHERE "productId" = p.id
      ORDER BY "isPrimary" DESC, "sortOrder" ASC, "createdAt" ASC
      LIMIT 1
    ) primary_pi ON true
    LEFT JOIN "User" u ON u.id = p."userId"
    WHERE p."isDeleted" = false
      AND p.status = 'ON_MARKET'
      AND (rent_listing.id IS NOT NULL OR sell_listing.id IS NOT NULL)
    GROUP BY p.id, p.title, p.category, p.color, pi.url, primary_pi.url, rent_listing."basePrice", sell_listing."basePrice", u.name
    ORDER BY MAX(c.vector_score) DESC
    LIMIT 6
  `, vectorLiteral, VISUAL_EMBEDDING_MODEL, VISUAL_EMBEDDING_VERSION, VISUAL_EMBEDDING_DIMENSION);
}

export async function searchByValidatedOutfitImage(image: SafeImagePayload): Promise<VisualSearchResult> {
  const traceId = `vsearch_${crypto.randomUUID()}`;

  try {
    const embedding = await createImageEmbedding(image);
    const products = await searchAvailableProductsByVector(embedding);

    return {
      success: true,
      traceId,
      detectedInfo: {
        category: "Visual similarity",
        dominantColor: "AI vector match",
        style: "Hybrid vector retrieval",
        itemDescription: "CLOOP Lens matched this image against available closet items.",
        searchKeywords: ["visual-search", "pgvector", VISUAL_EMBEDDING_MODEL],
        aiModelUsed: VISUAL_EMBEDDING_MODEL,
      },
      matchedProducts: products.map((product) => {
        const score = Math.max(0, Math.min(99, Math.round(product.vectorScore * 100)));
        return {
          id: product.id,
          title: product.title,
          category: product.category,
          color: product.color,
          primaryImage: product.primaryImage || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
          rentalPrice: product.rentalPrice || 0,
          salePrice: product.salePrice || 0,
          matchScore: score,
          matchReason: `Khớp ${score}% theo vector hình ảnh`,
          ownerName: product.ownerName || "Chu Tu CLOOP",
        };
      }),
    };
  } catch (error: any) {
    // TODO: integrate Sentry/LogRocket tracking for production visual-search failures.
    console.error(`[Visual Search Error][${traceId}]:`, error?.message || error);
    return {
      success: false,
      traceId,
      error: error?.message || "VISUAL_SEARCH_FAILED",
      matchedProducts: [],
    };
  }
}
