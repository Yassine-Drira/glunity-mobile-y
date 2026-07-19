'use strict';

/**
 * Reel Preview Controller
 *
 * Handles GET /reel/:id — a public, auth-free route that:
 *  1. Loads reel data from MongoDB
 *  2. Builds an optimized Cloudinary thumbnail URL
 *  3. Returns server-rendered HTML with Open Graph + Twitter Card meta tags
 *  4. Returns a professional 404 page if the reel doesn't exist
 *
 * This route is intentionally separate from the /api/reels REST API
 * to support SEO-friendly URLs at the root level (myapp.com/reel/:id).
 */

const mongoose = require('mongoose');
const reelsRepository = require('./reels.repository');
const { buildOgThumbnailUrl } = require('../../integrations/cloudinary/cloudinary.url-builder');
const { buildReelPreviewHtml, buildNotFoundHtml } = require('./og-template.service');
const logger = require('../../bootstrap/logger.bootstrap');

const APP_URL = process.env.APP_URL || 'https://myapp.com';

// Cache-Control header: public CDN cache for 5 minutes, stale-while-revalidate for 1 hour.
// Social crawlers typically re-fetch OG data within minutes, so short TTL keeps previews fresh.
const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

/**
 * GET /reel/:id
 * Render server-side HTML with Open Graph preview for a specific reel.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function getReelPreview(req, res) {
  const { id } = req.params;

  // ── Validate ID format early ──────────────────────────────────────────────
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .set('Content-Type', 'text/html; charset=utf-8')
      .set('Cache-Control', 'no-store')
      .send(buildNotFoundHtml(id));
  }

  try {
    // ── Load reel from MongoDB ──────────────────────────────────────────────
    const reel = await reelsRepository.findById(id);

    if (!reel) {
      logger.info(`[preview] Reel not found: ${id}`);
      return res
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'no-store')
        .send(buildNotFoundHtml(id));
    }

    // ── Build thumbnail URL ─────────────────────────────────────────────────
    // Prefer the explicit thumbnailUrl; fall back to videoUrl (extract poster frame).
    const rawThumbnailUrl = reel.thumbnailUrl || reel.videoUrl || '';
    const thumbnailUrl    = buildOgThumbnailUrl(rawThumbnailUrl);

    // ── Build canonical reel URL ────────────────────────────────────────────
    const reelUrl = `${APP_URL}/reel/${id}`;

    // ── Render and return HTML ──────────────────────────────────────────────
    const html = buildReelPreviewHtml({ reel, thumbnailUrl, reelUrl });

    logger.info(`[preview] Serving OG preview for reel: ${id}`);

    return res
      .status(200)
      .set('Content-Type', 'text/html; charset=utf-8')
      .set('Cache-Control', CACHE_CONTROL)
      .set('X-Content-Type-Options', 'nosniff')
      .send(html);

  } catch (err) {
    logger.error(`[preview] Error loading reel ${id}:`, err);

    // Return a safe 500 page — still HTML so social crawlers see something useful
    return res
      .status(500)
      .set('Content-Type', 'text/html; charset=utf-8')
      .set('Cache-Control', 'no-store')
      .send(buildNotFoundHtml(id));
  }
}

module.exports = { getReelPreview };
