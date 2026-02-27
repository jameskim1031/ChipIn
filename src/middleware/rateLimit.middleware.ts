import type { Request, Response, NextFunction } from "express";

type Entry = {
  count: number;
  resetAt: number;
};

export function makeRateLimitMiddleware(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) {
  const bucket = new Map<string, Entry>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip ?? "unknown"}`;
    const current = bucket.get(key);

    if (!current || current.resetAt <= now) {
      bucket.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (current.count >= options.max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      return res.status(429).json({
        error: "Rate limit exceeded for email-triggering endpoint",
        retryAfterSeconds,
      });
    }

    current.count += 1;
    return next();
  };
}
