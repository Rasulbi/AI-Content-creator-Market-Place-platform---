/**
 * Rapid-fire rate limit verification
 */
async function testRateLimit() {
  const baseUrl = "http://localhost:3000";
  console.log("⚡ Testing rate limiter with rapid requests...");

  let rateLimitHit = false;
  for (let i = 1; i <= 35; i++) {
    const res = await fetch(`${baseUrl}/api/ai-advisor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `Quick query ${i}` }],
        sessionId: "rate_limit_test",
      }),
    });

    if (res.status === 429) {
      const data = await res.json();
      console.log(`✅ Rate limit correctly triggered at request #${i}: HTTP 429 - ${data.error} (Code: ${data.code})`);
      rateLimitHit = true;
      break;
    }
  }

  if (!rateLimitHit) {
    console.log("ℹ️ Rate limit threshold is greater than 35 requests (or window reset).");
  }
}

testRateLimit().catch(console.error);
