/**
 * Rate Limiting Middleware
 * 
 * Protects API from DDoS and excessive requests
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address for rate limiting (supports IPv6)
  keyGenerator: (req: Request): string => {
    // Try to get IP from various headers (for proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    // Use express-rate-limit's helper for IPv6 support
    return ipKeyGenerator(req);
  },
});

// Stricter rate limiter for write operations
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_WRITE_MAX || '20', 10), // Limit write operations to 20 per 15 minutes
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return ipKeyGenerator(req);
  },
});

// More lenient rate limiter for telemetry events
// Telemetry events are frequent but non-critical, so we allow more requests
export const telemetryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_TELEMETRY_MAX || '200', 10), // Limit telemetry to 200 per 15 minutes
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many telemetry requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return ipKeyGenerator(req);
  },
});



