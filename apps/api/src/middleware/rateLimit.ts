import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@focustube/shared";
import { TokenBucket, type TokenBucketConfig } from "../rate-limit/TokenBucket.js";

const defaultConfig: TokenBucketConfig = {
  capacity: 5,
  refillPerSecond: 1
};

export function createTokenBucketRateLimiter(config = defaultConfig) {
  const buckets = new Map<string, TokenBucket>();

  return function tokenBucketRateLimiter(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const key = request.ip || request.socket.remoteAddress || "unknown";
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = new TokenBucket(config);
      buckets.set(key, bucket);
    }

    const result = bucket.tryConsume();
    response.setHeader("X-RateLimit-Limit", result.capacity.toString());
    response.setHeader("X-RateLimit-Remaining", result.remaining.toString());

    if (result.allowed) {
      next();
      return;
    }

    response.setHeader("Retry-After", result.retryAfterSeconds.toString());

    const body: ApiErrorResponse = {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry shortly."
      }
    };

    response.status(429).json(body);
  };
}
