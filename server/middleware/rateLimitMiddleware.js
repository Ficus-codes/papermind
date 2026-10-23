import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware for LLM-calling and compute-heavy endpoints (Phase 9)
 * Protects against API credit exhaustion, brute force, and runaway client loops.
 */

// LLM endpoints limiter: Summarization, Single-Paper RAG, Cross-Library RAG
export const llmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per 15-minute window
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    message: 'Too many AI synthesis requests from this IP. Please wait a few moments before trying again.',
    status: 429,
  },
});

// Authentication limiter: Login & Register to prevent brute force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    status: 429,
  },
});

// Upload limiter: PDF uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 PDF uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Upload quota reached for this window. Please wait before uploading more files.',
    status: 429,
  },
});
