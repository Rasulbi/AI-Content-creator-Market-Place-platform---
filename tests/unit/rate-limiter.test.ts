import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aiRateLimiter } from "../../lib/ai/rate-limiter";

describe("Unit Tests: Server-Side Rate Limiter (aiRateLimiter)", () => {
  it("should allow initial requests and properly decrement remaining count", () => {
    const testKey = `test_client_${Date.now()}_1`;
    const check1 = aiRateLimiter.check(testKey);

    assert.equal(check1.allowed, true);
    assert.ok(check1.remaining >= 0);
    assert.ok(check1.limit > 0);

    const check2 = aiRateLimiter.check(testKey);
    assert.equal(check2.allowed, true);
    assert.equal(check2.remaining, check1.remaining - 1);
  });

  it("should reject requests once the threshold limit is exceeded", () => {
    const testKey = `test_client_burst_${Date.now()}`;
    const limit = aiRateLimiter.check(testKey).limit;

    // Consume all allowed slots
    for (let i = 1; i < limit; i++) {
      const res = aiRateLimiter.check(testKey);
      assert.equal(res.allowed, true);
    }

    // Next request must be rejected
    const blocked = aiRateLimiter.check(testKey);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.resetMs > 0, "Expected resetMs to be greater than 0");
  });

  it("should extract client IP from x-forwarded-for header", () => {
    const mockReq = {
      headers: new Headers({
        "x-forwarded-for": "203.0.113.195, 70.41.3.18",
      }),
    } as unknown as Request;

    const clientId = aiRateLimiter.getClientIdentifier(mockReq);
    assert.equal(clientId, "ip_203.0.113.195");
  });

  it("should extract client IP from x-real-ip header when x-forwarded-for is missing", () => {
    const mockReq = {
      headers: new Headers({
        "x-real-ip": "198.51.100.42",
      }),
    } as unknown as Request;

    const clientId = aiRateLimiter.getClientIdentifier(mockReq);
    assert.equal(clientId, "ip_198.51.100.42");
  });

  it("should prioritize userId over IP headers when user ID is provided", () => {
    const mockReq = {
      headers: new Headers({
        "x-real-ip": "198.51.100.42",
      }),
    } as unknown as Request;

    const clientId = aiRateLimiter.getClientIdentifier(mockReq, "usr_98765");
    assert.equal(clientId, "user_usr_98765");
  });

  it("should fallback to client_anonymous when no headers or user ID are present", () => {
    const mockReq = {
      headers: new Headers(),
    } as unknown as Request;

    const clientId = aiRateLimiter.getClientIdentifier(mockReq);
    assert.equal(clientId, "client_anonymous");
  });
});
