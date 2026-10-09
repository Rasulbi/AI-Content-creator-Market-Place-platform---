import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractJSON } from "../../lib/ai/json-parser";

describe("Unit Tests: Robust JSON Parser (extractJSON)", () => {
  it("should extract raw JSON objects directly", () => {
    const raw = '{"skills": ["3D Animation", "VFX"], "confidence": 0.95}';
    const parsed = extractJSON<{ skills: string[]; confidence: number }>(raw);
    assert.deepEqual(parsed.skills, ["3D Animation", "VFX"]);
    assert.equal(parsed.confidence, 0.95);
  });

  it("should parse JSON enclosed in standard markdown code fences (```json ... ```)", () => {
    const markdown = "```json\n{\n  \"status\": \"verified\",\n  \"score\": 98\n}\n```";
    const parsed = extractJSON<{ status: string; score: number }>(markdown);
    assert.equal(parsed.status, "verified");
    assert.equal(parsed.score, 98);
  });

  it("should parse JSON enclosed in generic markdown code fences without language tag", () => {
    const markdown = "```\n{\n  \"category\": \"Beauty & Skincare\"\n}\n```";
    const parsed = extractJSON<{ category: string }>(markdown);
    assert.equal(parsed.category, "Beauty & Skincare");
  });

  it("should extract JSON embedded between conversational LLM preamble and postamble", () => {
    const messy = `Sure! Here is the campaign breakdown you requested:
    {
      "deliverables": ["3 Reels", "1 Story"],
      "budget": 25000
    }
    Let me know if you need any adjustments or further clarification!`;
    const parsed = extractJSON<{ deliverables: string[]; budget: number }>(messy);
    assert.deepEqual(parsed.deliverables, ["3 Reels", "1 Story"]);
    assert.equal(parsed.budget, 25000);
  });

  it("should extract JSON arrays correctly", () => {
    const arrayStr = '["Midjourney", "Runway Gen-2", "CapCut Pro"]';
    const parsed = extractJSON<string[]>(arrayStr);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[1], "Runway Gen-2");
  });

  it("should throw a clear syntax error when text contains completely invalid JSON", () => {
    assert.throws(
      () => extractJSON("Sorry, I could not generate JSON for this prompt."),
      /did not contain a valid JSON/i
    );
  });
});
