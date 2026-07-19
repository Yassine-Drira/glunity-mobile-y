'use strict';

/**
 * Reel Preview Routes
 *
 * Public, authentication-free routes for serving reel Open Graph preview pages.
 * These are mounted at the root level (not under /api) so URLs are:
 *
 *   GET https://myapp.com/reel/:id
 *
 * This is intentionally separate from the REST API routes (/api/reels) so that:
 *  - Social crawlers see clean, SEO-friendly URLs
 *  - Auth middleware is never invoked (no token required for previews)
 *  - Rate limiting can be tuned independently
 */

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { getReelPreview } = require('./reels.preview.controller');
const { param } = require('express-validator');
const validate = require('../../common/middleware/validation.middleware');

const router = Router();

// ── Rate limit: generous for crawlers, still protects against scraping ────────
const previewLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 120,                // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for known social crawler User-Agents
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const crawlers = ['facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot', 'discordbot', 'slackbot', 'pinterest'];
    return crawlers.some((c) => ua.includes(c));
  },
});

/**
 * GET /reel/:id
 * Returns server-rendered HTML with Open Graph meta tags for a reel.
 * Used by social media crawlers to generate link previews.
 */
router.get('/:id', previewLimiter, getReelPreview);

module.exports = router;
