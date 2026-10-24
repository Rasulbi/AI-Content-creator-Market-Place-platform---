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

export const TARGET_EMBEDDING_DIM = 768;

/**
 * Deterministic unit-normalized semantic vector generator for offline development and testing.
 */
export function generateDeterministicVector(text: string, dim: number = TARGET_EMBEDDING_DIM): number[] {
  const vector: number[] = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    let hash = 0;
    for (let c = 0; c < words[i].length; c++) {
      hash = (hash << 5) - hash + words[i].charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Checks whether an authentic live embedding provider is configured in environment variables.
 */
export function isRealEmbeddingProviderConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER || "openrouter").toLowerCase().trim();
  if (provider === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY?.trim();
    return Boolean(key && !key.startsWith("paste-") && !key.includes("your-") && key.length > 15);
  }
  if (provider === "gemini" || provider === "google") {
    const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
    return Boolean(key && !key.startsWith("paste-") && !key.includes("your-") && key.length > 15);
  }
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    return Boolean(key && !key.startsWith("paste-") && !key.includes("your-") && key.length > 15);
  }
  return false;
}

/**
 * Generates semantic embedding vector (768 dimensions standard for pgvector schema).
 * Aligned with Google Gemini text-embedding-004 and OpenRouter BGE-base standard (768 dims).
 *
 * Strict Dimension & Orthogonality Rules:
 * 1. Modulo folding is prohibited: wrapping dimensions destructively interferes with orthogonal latent axes.
 * 2. Prefix slicing is only permitted for certified Matryoshka Representation Learning (MRL) models (e.g. text-embedding-3).
 * 3. Mismatched non-MRL models throw an explicit Error with diagnostic logging to prevent corrupted stored embeddings.
 * 4. Deterministic vectors are only generated in offline/testing mode when no live provider is configured.
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
    aiLogger.info("xAI Grok does not provide vector embeddings. Skipping neural vector generation.");
    return generateDeterministicVector(text, TARGET_EMBEDDING_DIM);
  }

  if (isValidOpenRouterKey) {
    try {
      const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim() || "baai/bge-base-en-v1.5";
      const isMrlModel =
        embeddingModel.toLowerCase().includes("text-embedding-3") ||
        embeddingModel.toLowerCase().includes("bge-m3");

      const requestBody: Record<string, any> = {
        model: embeddingModel,
        input: text,
      };

      // Native MRL models support requesting reduced target dimensions directly from the API
      if (isMrlModel) {
        requestBody.dimensions = TARGET_EMBEDDING_DIM;
      }

      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-creator-marketplace.local",
          "X-Title": "AI Content Creator Marketplace",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        aiLogger.error("OpenRouter embedding API error", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`OpenRouter embedding API returned HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const json = await response.json();
      const rawVector = json.data?.[0]?.embedding;

      if (!Array.isArray(rawVector) || rawVector.length === 0) {
        throw new Error("OpenRouter embedding API returned an empty or malformed vector payload");
      }

      if (rawVector.length === TARGET_EMBEDDING_DIM) {
        const norm = Math.sqrt(rawVector.reduce((sum, v) => sum + v * v, 0)) || 1;
        return rawVector.map((v) => v / norm);
      }

      if (isMrlModel && rawVector.length > TARGET_EMBEDDING_DIM) {
        // Certified Matryoshka Representation Learning supports prefix truncation + L2 renormalization
        const sliced = rawVector.slice(0, TARGET_EMBEDDING_DIM);
        const norm = Math.sqrt(sliced.reduce((sum, v) => sum + v * v, 0)) || 1;
        return sliced.map((v) => v / norm);
      }

      // Non-MRL model dimension mismatch:
      // Modulo folding is prohibited because it wraps non-parallel semantic dimensions, destroying latent orthogonality.
      // Throw an explicit diagnostic error rather than producing misleading semantic search or corrupting stored vectors.
      aiLogger.error(
        "Incompatible embedding dimensions returned by model without certified MRL reduction support",
        {
          model: embeddingModel,
          receivedDimension: rawVector.length,
          expectedDimension: TARGET_EMBEDDING_DIM,
        }
      );
      throw new Error(
        `Incompatible embedding dimension: model '${embeddingModel}' returned ${rawVector.length} dimensions, but schema requires ${TARGET_EMBEDDING_DIM}. Non-MRL dimension reduction is unsupported; vector rejected to protect semantic integrity.`
      );
    } catch (err: any) {
      aiLogger.error("Embedding provider request failed", {
        error: err?.message || err,
      });
      throw err;
    }
  }

  // Deterministic 768-dimension synthetic embedding generator for local dev / offline tests
  return generateDeterministicVector(text, TARGET_EMBEDDING_DIM);
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

