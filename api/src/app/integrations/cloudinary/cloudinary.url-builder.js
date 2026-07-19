'use strict';

/**
 * Cloudinary URL Builder
 *
 * Builds permanent, CDN-backed Cloudinary URLs from stored asset URLs.
 * Never generates signed/temporary URLs — all output is public and cacheable.
 */

const env = require('../../config/env');

const CLOUD_NAME = env.cloudinary?.cloudName || '';

// Default fallback thumbnail when a Cloudinary URL is unavailable
const DEFAULT_THUMBNAIL = 'https://res.cloudinary.com/placeholder/image/upload/w_1200,h_630,c_fill,q_auto,f_auto/v1/defaults/reel-placeholder.jpg';

/**
 * Extract the Cloudinary public_id from a stored URL.
 *
 * Handles both:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/folder/public_id.jpg
 *   https://res.cloudinary.com/<cloud>/video/upload/v123/folder/public_id.mp4
 *
 * @param {string} url - The stored Cloudinary asset URL
 * @returns {string|null} The public_id (with folder prefix, without extension), or null
 */
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    // Path: /<cloud_name>/<resource_type>/upload/[version]/[...public_id].[ext]
    const parts = parsed.pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;

    // Skip the version segment if present (e.g. v1234567890)
    let startIdx = uploadIdx + 1;
    if (parts[startIdx] && /^v\d+$/.test(parts[startIdx])) {
      startIdx += 1;
    }

    const remaining = parts.slice(startIdx).join('/');
    // Strip file extension
    return remaining.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
}

/**
 * Detect the resource type from a Cloudinary URL.
 * @param {string} url
 * @returns {'image'|'video'|'raw'}
 */
function detectResourceType(url) {
  if (!url) return 'image';
  if (url.includes('/video/upload/')) return 'video';
  if (url.includes('/raw/upload/')) return 'raw';
  return 'image';
}

/**
 * Build a Cloudinary URL with explicit transformations from a public_id.
 *
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'video'
 * @param {string} transformations - Cloudinary transformation string (e.g. 'w_1200,h_630,c_fill')
 * @returns {string}
 */
function buildCloudinaryUrl(publicId, resourceType, transformations) {
  if (!CLOUD_NAME || !publicId) return DEFAULT_THUMBNAIL;
  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${transformations}/${publicId}`;
}

/**
 * Build an Open Graph optimized thumbnail URL (1200×630, WebP, auto-quality).
 * Uses the video thumbnail if the original is a video.
 *
 * @param {string} storedUrl - The URL as stored in MongoDB (Cloudinary URL or local fallback)
 * @returns {string} A permanent, CDN-backed URL suitable for og:image
 */
function buildOgThumbnailUrl(storedUrl) {
  if (!storedUrl) return DEFAULT_THUMBNAIL;

  // Non-Cloudinary URL (local dev fallback, Unsplash, etc.) — return as-is
  if (!storedUrl.includes('res.cloudinary.com')) {
    return storedUrl;
  }

  const publicId = extractPublicId(storedUrl);
  if (!publicId) return storedUrl;

  const resourceType = detectResourceType(storedUrl);

  // For video resources: extract a still thumbnail as an image
  if (resourceType === 'video') {
    return buildCloudinaryUrl(
      publicId,
      'video',
      'w_1200,h_630,c_fill,q_auto,f_jpg,so_0'
    );
  }

  // Image resource
  return buildCloudinaryUrl(publicId, 'image', 'w_1200,h_630,c_fill,q_auto,f_auto');
}

/**
 * Build a mobile-optimized thumbnail (600×600, WebP).
 *
 * @param {string} storedUrl
 * @returns {string}
 */
function buildMobileThumbnailUrl(storedUrl) {
  if (!storedUrl || !storedUrl.includes('res.cloudinary.com')) {
    return storedUrl || DEFAULT_THUMBNAIL;
  }

  const publicId = extractPublicId(storedUrl);
  if (!publicId) return storedUrl;

  const resourceType = detectResourceType(storedUrl);

  if (resourceType === 'video') {
    return buildCloudinaryUrl(publicId, 'video', 'w_600,h_600,c_fill,q_auto,f_jpg,so_0');
  }

  return buildCloudinaryUrl(publicId, 'image', 'w_600,h_600,c_fill,q_auto,f_auto');
}

module.exports = {
  extractPublicId,
  buildOgThumbnailUrl,
  buildMobileThumbnailUrl,
  DEFAULT_THUMBNAIL,
};
