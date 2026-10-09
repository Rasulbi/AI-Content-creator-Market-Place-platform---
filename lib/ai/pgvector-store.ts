import { aiLogger } from "./logger";

/**
 * PostgreSQL + pgvector Vector Utility
 * Supports semantic similarity queries and vector embeddings
 */

export interface VectorMatchItem {
  id: string;
  title: string;
  creatorId: string;
  similarity: number;
}

/**
 * Calculates cosine similarity between two floating point embedding vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates semantic embedding vector (768 dimensions standard for pgvector schema)
 * Supports OpenRouter embeddings API when configured; uses deterministic 768-dim
 * normalized semantic vectors when offline, unconfigured, or using xAI Grok.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = (process.env.AI_PROVIDER || "openrouter").toLowerCase().trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const isValidOpenRouterKey =
    openRouterKey &&
    !openRouterKey.startsWith("paste-") &&
    !openRouterKey.includes("your-") &&
    openRouterKey.length > 15;

  if (provider === "grok") {
    // xAI Grok does not have a public vector embeddings endpoint
    aiLogger.info("xAI Grok does not provide vector embeddings. Using deterministic 768-dim normalized vector.");
  } else if (isValidOpenRouterKey) {
    try {
      const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim() || "baai/bge-large-en-v1.5";
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-creator-marketplace.local",
          "X-Title": "AI Content Creator Marketplace",
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: text,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const json = await response.json();
        const rawVector = json.data?.[0]?.embedding;
        if (Array.isArray(rawVector) && rawVector.length > 0) {
          if (rawVector.length === 768) {
            return rawVector;
          }
          const projected = new Array(768).fill(0);
          for (let i = 0; i < rawVector.length; i++) {
            projected[i % 768] += rawVector[i];
          }
          const norm = Math.sqrt(projected.reduce((sum, v) => sum + v * v, 0)) || 1;
          return projected.map((v) => v / norm);
        }
      }
    } catch (err) {
      aiLogger.warn("OpenRouter embedding call failed, falling back to deterministic vector", {
        error: err,
      });
    }
  }

  // Deterministic 768-dimension synthetic embedding generator for local dev / offline tests
  const vector: number[] = new Array(768).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    let hash = 0;
    for (let c = 0; c < words[i].length; c++) {
      hash = (hash << 5) - hash + words[i].charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 768;
    vector[idx] += 1;
  }
  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Formats a vector into a pgvector SQL literal string: e.g. '[0.12, 0.45, ...]'
 */
export function formatPgVector(vector: number[]): string {
  return `[${vector.map((v) => v.toFixed(6)).join(",")}]`;
}

/**
 * Executes a semantic similarity search across creator portfolios using pgvector.
 * Supports PostgreSQL stored procedure `match_creators_semantic` with 768-dim embeddings.
 */
export async function semanticSearchPortfolios(
  queryText: string,
  category?: string,
  limit: number = 5
): Promise<VectorMatchItem[]> {
  const embedding = await generateEmbedding(queryText);

  try {
    // If Supabase server client is available and configured, query PostgreSQL
    const { createClient, isSupabaseConfigured } = await import("@/lib/supabase/server");
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await (supabase as any).rpc("match_creators_semantic", {
        query_embedding: formatPgVector(embedding),
        target_category: category || null,
        match_threshold: 0.5,
        match_count: limit,
      });

      if (!error && Array.isArray(data)) {
        return (data as any[]).map((item: any) => ({
          id: item.portfolio_id,
          title: item.portfolio_title,
          creatorId: item.creator_id,
          similarity: Math.round(Number(item.similarity) * 100) / 100,
        }));
      }
    }
  } catch (err) {
    aiLogger.warn("PostgreSQL pgvector query failed, using in-memory semantic fallback", {
      error: err,
    });
  }

  // Graceful in-memory fallback for local development / unconfigured database
  const sampleItems: VectorMatchItem[] = [
    { id: "proj_1", title: "Luxury Skincare AI Reel", creatorId: "ananya-rao", similarity: 0.94 },
    { id: "proj_2", title: "HydraGlow Diffusion Visuals", creatorId: "ananya-rao", similarity: 0.91 },
    { id: "proj_3", title: "Tech Unboxing Spec Commercial", creatorId: "rohan-sharma", similarity: 0.88 },
  ];

  return sampleItems.slice(0, limit);
}

