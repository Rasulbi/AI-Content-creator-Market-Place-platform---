/**
 * Robust JSON Extractor for LLM responses
 * Handles markdown code fences (```json ... ```), raw strings, and surrounding explanatory text.
 */
export function extractJSON<T>(rawText: string): T {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Cannot parse empty response as JSON");
  }

  let text = rawText.trim();

  // 1. Remove outer markdown code fence if wrapped
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  } else {
    // Check if there is an embedded fenced block
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      text = fenceMatch[1].trim();
    }
  }

  // 2. Try direct JSON.parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // 3. Fallback: Find outermost JSON boundary { ... } or [ ... ]
    const firstBrace = text.indexOf("{");
    const firstBracket = text.indexOf("[");

    let startIndex = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex !== -1) {
      const lastBrace = text.lastIndexOf("}");
      const lastBracket = text.lastIndexOf("]");
      const endIndex = Math.max(lastBrace, lastBracket);

      if (endIndex > startIndex) {
        const sliced = text.substring(startIndex, endIndex + 1);
        try {
          return JSON.parse(sliced) as T;
        } catch (innerErr) {
          throw new Error(
            `Malformed JSON response from AI model: ${
              innerErr instanceof Error ? innerErr.message : String(innerErr)
            }`
          );
        }
      }
    }

    throw new Error("Model response did not contain a valid JSON object or array.");
  }
}
