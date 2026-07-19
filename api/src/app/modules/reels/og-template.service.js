'use strict';

/**
 * Open Graph HTML Template Service
 *
 * Generates a server-rendered HTML page for a given reel that includes:
 *  - Full Open Graph meta tags  (og:title, og:image, og:url, og:type, og:video)
 *  - Twitter Card meta tags     (twitter:card, twitter:title, twitter:image)
 *  - Smart mobile redirect      (JS detects iOS / Android UA → deep-links into app)
 *  - Responsive web fallback    (thumbnail poster + play button + App Store/Play Store banners)
 *  - Professional 404 page
 *
 * All generated HTML is self-contained and works without any external CSS framework.
 */

const APP_NAME    = 'Glunity';
const APP_URL     = process.env.APP_URL || 'https://myapp.com';
const APP_SCHEME  = 'glunity'; // Custom URI scheme (fallback for deep links)

// App Store / Play Store redirect URLs
const IOS_APP_STORE_URL    = process.env.IOS_APP_STORE_URL    || 'https://apps.apple.com/app/glunity/id000000000';
const ANDROID_PLAY_STORE_URL = process.env.ANDROID_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.islemhammami.glunitymobile';

/**
 * Common <head> styles embedded inline for fast first paint with no external assets.
 */
const SHARED_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0a0a;
    color: #f0f0f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }
  a { color: inherit; text-decoration: none; }
  .card {
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 20px;
    overflow: hidden;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.7);
  }
  .thumbnail-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 9/16;
    background: #111;
    overflow: hidden;
  }
  .thumbnail-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.35);
  }
  .play-btn {
    width: 72px;
    height: 72px;
    background: rgba(255,255,255,0.92);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
    cursor: pointer;
  }
  .play-btn:hover { transform: scale(1.08); }
  .play-btn svg { margin-left: 5px; }
  .info {
    padding: 20px 20px 8px;
  }
  .app-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .app-badge-dot {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6DAE3F, #4a9b2a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }
  .app-badge-name { font-size: 13px; font-weight: 600; color: #aaa; letter-spacing: 0.5px; text-transform: uppercase; }
  .reel-caption {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.45;
    color: #f0f0f0;
    margin-bottom: 6px;
    word-break: break-word;
  }
  .reel-author {
    font-size: 13px;
    color: #888;
    margin-bottom: 18px;
  }
  .store-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 20px 20px;
  }
  .store-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .store-btn:hover { opacity: 0.88; }
  .store-btn.open-app  { background: linear-gradient(135deg, #6DAE3F, #4a9b2a); color: #fff; }
  .store-btn.app-store { background: #1c1c1e; border: 1px solid #3a3a3c; color: #f0f0f0; }
  .store-btn.play-store{ background: #1c1c1e; border: 1px solid #3a3a3c; color: #f0f0f0; }
  .divider { height: 1px; background: #2a2a2a; margin: 0 20px; }
  /* 404 styles */
  .error-wrap { text-align: center; max-width: 400px; }
  .error-code { font-size: 96px; font-weight: 800; color: #2a2a2a; line-height: 1; }
  .error-title { font-size: 24px; font-weight: 700; margin: 16px 0 8px; }
  .error-desc { font-size: 15px; color: #777; line-height: 1.6; margin-bottom: 32px; }
  .home-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: linear-gradient(135deg, #6DAE3F, #4a9b2a);
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }
`;

/**
 * Generate the full preview HTML page for a reel.
 *
 * @param {{ reel: object, thumbnailUrl: string, reelUrl: string }} opts
 * @returns {string} Complete HTML string
 */
function buildReelPreviewHtml({ reel, thumbnailUrl, reelUrl }) {
  const title       = reel.caption ? reel.caption.slice(0, 120) : `Watch this reel on ${APP_NAME}`;
  const description = reel.caption
    ? `${reel.caption.slice(0, 200)} — Watch on ${APP_NAME}`
    : `Check out this reel on ${APP_NAME}. Discover health, wellness, recipes, and more.`;
  const authorName  = reel.authorId?.fullName || 'A Glunity Creator';
  const reelId      = reel._id?.toString() || '';

  // Deep link: try universal link first, then custom-scheme fallback
  const universalLink = reelUrl;
  const customSchemeLink = `${APP_SCHEME}://reel/${reelId}`;

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escHtml(title)} | ${APP_NAME}</title>
  <meta name="description" content="${escHtml(description)}" />
  <meta name="robots" content="index, follow" />

  <!-- ── Open Graph ──────────────────────────────────────────────────────── -->
  <meta property="og:site_name"    content="${APP_NAME}" />
  <meta property="og:type"         content="video.other" />
  <meta property="og:title"        content="${escHtml(title)}" />
  <meta property="og:description"  content="${escHtml(description)}" />
  <meta property="og:url"          content="${escHtml(reelUrl)}" />
  <meta property="og:image"        content="${escHtml(thumbnailUrl)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt"    content="${escHtml(title)}" />
  <meta property="og:locale"       content="en_US" />

  <!-- ── Twitter Card ───────────────────────────────────────────────────── -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image"       content="${escHtml(thumbnailUrl)}" />
  <meta name="twitter:image:alt"   content="${escHtml(title)}" />

  <!-- ── iOS Smart App Banner ───────────────────────────────────────────── -->
  <meta name="apple-itunes-app" content="app-id=000000000, app-argument=${escHtml(universalLink)}" />

  <!-- ── Preload thumbnail ──────────────────────────────────────────────── -->
  <link rel="preload" as="image" href="${escHtml(thumbnailUrl)}" />

  <style>${SHARED_STYLES}</style>
</head>
<body>

  <!-- ── Smart App Redirect (runs before page paints) ─────────────────── -->
  <script>
    (function() {
      var ua = navigator.userAgent || '';
      var isIOS     = /iPhone|iPad|iPod/i.test(ua);
      var isAndroid = /Android/i.test(ua);

      if (!isIOS && !isAndroid) return; // desktop — show web page

      // Attempt to open the app via universal link / custom scheme.
      // If the app is not installed the browser will either:
      //  - iOS: stay on this page (AASA redirect) or fall through to App Store
      //  - Android: stay on this page (App Links) or fall through to Play Store
      var opened = false;
      var fallbackTimer;

      function openStore() {
        if (opened) return;
        window.location.href = isIOS
          ? '${IOS_APP_STORE_URL}'
          : '${ANDROID_PLAY_STORE_URL}';
      }

      // Try deep link after a short delay to let page finish loading
      window.addEventListener('DOMContentLoaded', function() {
        // Show buttons immediately for manual tap (accessibility / slow devices)
        document.getElementById('store-section').style.display = 'flex';

        fallbackTimer = setTimeout(function() {
          if (!document.hidden) openStore();
        }, 2500);
      });

      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          opened = true;
          clearTimeout(fallbackTimer);
        }
      });

      // "Open in App" button handler
      window.openInApp = function() {
        opened = false;
        // Try universal link first
        window.location.href = '${escHtml(universalLink)}';
        // Schedule store fallback
        fallbackTimer = setTimeout(function() {
          if (!document.hidden) openStore();
        }, 1800);
      };
    })();
  </script>

  <div class="card">
    <!-- Thumbnail -->
    <div class="thumbnail-wrap">
      <img
        src="${escHtml(thumbnailUrl)}"
        alt="${escHtml(title)}"
        loading="eager"
        onerror="this.src='https://via.placeholder.com/480x854/111111/444444?text=Glunity+Reel'"
      />
      <div class="play-overlay">
        <button class="play-btn" onclick="window.openInApp && window.openInApp()" aria-label="Play reel">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M7 4L24 14L7 24V4Z" fill="#111" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="info">
      <div class="app-badge">
        <div class="app-badge-dot">🌿</div>
        <span class="app-badge-name">${APP_NAME}</span>
      </div>
      <p class="reel-caption">${escHtml(title)}</p>
      <p class="reel-author">by ${escHtml(authorName)}</p>
    </div>

    <div class="divider"></div>

    <!-- Store Buttons -->
    <div class="store-buttons" id="store-section">
      <button class="store-btn open-app" onclick="window.openInApp && window.openInApp()">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L18 10L10 18M2 10H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Open in ${APP_NAME}
      </button>
      <a class="store-btn app-store" href="${IOS_APP_STORE_URL}" target="_blank" rel="noopener">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="#f0f0f0">
          <path d="M15.3 10.5c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-1.9-3.7-1.9-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.5 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.3-.9-2.3-3.2z"/>
        </svg>
        Download on App Store
      </a>
      <a class="store-btn play-store" href="${ANDROID_PLAY_STORE_URL}" target="_blank" rel="noopener">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="#f0f0f0">
          <path d="M3.2 1L12.4 10.2 3.2 19.4a1 1 0 01-1.2-1V2a1 1 0 011.2-1zm14.3 8.3L15 7.8 5.3 2.2l8.5 8.5-1.9 1.8 8.5 8.5-10.7-5.7 2.5-2.5 1.5 1.5 3.8-3.8zM3.2 1L15 8.5"/>
        </svg>
        Get it on Google Play
      </a>
    </div>
  </div>

  <p style="margin-top:24px;font-size:13px;color:#444;">
    &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  </p>

</body>
</html>`;
}

/**
 * Generate a professional 404 page.
 *
 * @param {string} [reelId]
 * @returns {string} Complete HTML string
 */
function buildNotFoundHtml(reelId) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reel Not Found | ${APP_NAME}</title>
  <meta name="robots" content="noindex" />
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="error-wrap">
    <div class="error-code">404</div>
    <h1 class="error-title">This reel doesn't exist</h1>
    <p class="error-desc">
      The reel you're looking for may have been deleted, or the link might be incorrect.
      Discover great content on ${APP_NAME}.
    </p>
    <a href="${APP_URL}" class="home-btn">
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M8 1L1 8h2v6h4v-4h2v4h4V8h2L8 1z" fill="white"/>
      </svg>
      Back to ${APP_NAME}
    </a>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML entities to prevent XSS in template strings.
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

module.exports = {
  buildReelPreviewHtml,
  buildNotFoundHtml,
};
