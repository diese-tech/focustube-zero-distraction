export type TokenBucketConfig = {
  capacity: number;
  refillPerSecond: number;
};

export type TokenBucketResult = {
  allowed: boolean;
  capacity: number;
  remaining: number;
  retryAfterSeconds: number;
};

export class TokenBucket {
  private tokens: number;
  private lastRefillAtMs: number;

  constructor(private readonly config: TokenBucketConfig) {
    if (config.capacity <= 0 || config.refillPerSecond <= 0) {
      throw new Error("TokenBucket capacity and refillPerSecond must be positive.");
    }

    this.tokens = config.capacity;
    this.lastRefillAtMs = Date.now();
  }

  tryConsume(nowMs = Date.now()): TokenBucketResult {
    this.refill(nowMs);

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return this.result(true);
    }

    return this.result(false);
  }

  private refill(nowMs: number) {
    const elapsedMs = Math.max(0, nowMs - this.lastRefillAtMs);
    if (elapsedMs === 0) {
      return;
    }

    const refillAmount = (elapsedMs / 1000) * this.config.refillPerSecond;
    this.tokens = Math.min(this.config.capacity, this.tokens + refillAmount);
    this.lastRefillAtMs = nowMs;
  }

  private result(allowed: boolean): TokenBucketResult {
    const tokensNeeded = Math.max(0, 1 - this.tokens);

    return {
      allowed,
      capacity: this.config.capacity,
      remaining: Math.floor(this.tokens),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil(tokensNeeded / this.config.refillPerSecond))
    };
  }
}
