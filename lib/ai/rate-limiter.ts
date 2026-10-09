/**
 * Server-Side In-Memory Rate Limiter for AI Endpoints
 * 
 * Protects against excessive requests, rapid-fire abuse, and provider cost overruns.
 * Configurable via environment variables with sliding-window accounting.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private lastCleanup = Date.now();

  constructor() {
    this.windowMs = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || "60000", 10); // 1 minute
    this.maxRequests = parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || "30", 10); // 30 requests per minute
  }

  /**
   * Evaluates if a request from the given key is allowed
   */
  check(key: string): { allowed: boolean; remaining: number; resetMs: number; limit: number } {
    const now = Date.now();
    this.periodicCleanup(now);

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Keep only timestamps within the current sliding window
    const windowStart = now - this.windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0] || now;
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        limit: this.maxRequests,
      };
    }

    // Record this request
    record.timestamps.push(now);
    const remaining = Math.max(0, this.maxRequests - record.timestamps.length);
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, oldest + this.windowMs - now);

    return {
      allowed: true,
      remaining,
      resetMs,
      limit: this.maxRequests,
    };
  }

  /**
   * Periodically purges entries older than the window to prevent memory leaks
   */
  private periodicCleanup(now: number) {
    if (now - this.lastCleanup < 120000) return; // Cleanup every 2 minutes
    this.lastCleanup = now;

    const threshold = now - this.windowMs;
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > threshold);
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Helper to derive client identifier from NextRequest headers
   */
  getClientIdentifier(req: Request, fallbackId?: string | null): string {
    if (fallbackId) return `user_${fallbackId}`;

    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return `ip_${firstIp}`;
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return `ip_${realIp.trim()}`;

    return "client_anonymous";
  }
}

export const aiRateLimiter = new InMemoryRateLimiter();
