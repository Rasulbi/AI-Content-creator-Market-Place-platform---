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
 * Generates semantic embedding using Gemini text-embedding-004 (768 dimensions)
 * Falls back to deterministic semantic vector if API key is not configured.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text }] },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        if (json.embedding?.values) {
          return json.embedding.values;
        }
      }
    } catch (err) {
      aiLogger.warn("Gemini embedding call failed, falling back to deterministic vector", {
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
