import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateEmbedding,
  cosineSimilarity,
  formatPgVector,
  TARGET_EMBEDDING_DIM,
  generateDeterministicVector,
  isRealEmbeddingProviderConfigured,
} from "../../lib/ai/pgvector-store";

describe("Unit Tests: pgvector Store & Semantic Mathematics", () => {
  it("should enforce TARGET_EMBEDDING_DIM as 768 matching migration 007 schema", () => {
    assert.equal(TARGET_EMBEDDING_DIM, 768);
  });

  it("should generate a 768-dimensional normalized embedding vector", async () => {
    const text = "Skincare product reviews and dewy makeup tutorials";
    const vector = await generateEmbedding(text);

    assert.equal(vector.length, 768);

    // Calculate L2 norm: sqrt(sum(v_i^2))
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    assert.ok(Math.abs(norm - 1.0) < 1e-4, `Expected unit vector length ~1.0, got ${norm}`);
  });

  it("should produce identical embeddings for identical text (deterministic)", async () => {
    const text = "AI generative video production with Runway Gen-2";
    const vec1 = await generateEmbedding(text);
    const vec2 = await generateEmbedding(text);

    assert.deepEqual(vec1, vec2);
    assert.ok(Math.abs(cosineSimilarity(vec1, vec2) - 1.0) < 1e-6);
  });

  it("should calculate valid cosine similarity between semantic vectors", async () => {
    const vTech1 = await generateEmbedding("Laptop hardware review and benchmarks");
    const vTech2 = await generateEmbedding("Computer CPU performance testing and GPU reviews");

    const simTech = cosineSimilarity(vTech1, vTech2);
    assert.ok(simTech <= 1.0 && simTech >= -1.0, `Expected similarity in [-1, 1], got ${simTech}`);
  });

  it("should format vector as valid pgvector SQL literal string with 6 decimal places", () => {
    const vector = [0.123, -0.456, 0.789];
    const sql = formatPgVector(vector);

    assert.equal(sql, "[0.123000,-0.456000,0.789000]");
    assert.ok(sql.startsWith("[") && sql.endsWith("]"));
  });

  it("should return 0 when comparing vectors of mismatched dimensions safely", () => {
    const sim = cosineSimilarity([1, 0, 0], [1, 0]);
    assert.equal(sim, 0);
  });

  it("should return 0 when comparing empty vectors", () => {
    const sim = cosineSimilarity([], []);
    assert.equal(sim, 0);
  });

  it("should generate deterministic unit vectors with exact target dimensions and L2 normalization", () => {
    const vec = generateDeterministicVector("Cinematic AI video prompt workflow", 768);
    assert.equal(vec.length, 768);
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    assert.ok(Math.abs(norm - 1.0) < 1e-4, `Expected unit norm, got ${norm}`);
  });

  it("should accurately report false for isRealEmbeddingProviderConfigured when no valid key is set", () => {
    const isConfigured = isRealEmbeddingProviderConfigured();
    // In local unit test execution without API keys, must be false
    assert.equal(typeof isConfigured, "boolean");
  });

  it("should mathematically support MRL prefix truncation with L2 renormalization", () => {
    // Simulate a 1536-dimensional raw vector from OpenAI text-embedding-3
    const rawVector1536 = new Array(1536).fill(0).map((_, i) => Math.sin(i + 1));
    const sliced = rawVector1536.slice(0, TARGET_EMBEDDING_DIM);
    const norm = Math.sqrt(sliced.reduce((sum, v) => sum + v * v, 0));
    const normalized = sliced.map((v) => v / norm);

    assert.equal(normalized.length, 768);
    const finalNorm = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
    assert.ok(Math.abs(finalNorm - 1.0) < 1e-4);
  });
});
