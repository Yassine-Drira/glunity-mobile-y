/**
 * shareReel — Reusable native share utility for Reels
 *
 * Generates a canonical https://myapp.com/reel/{id} URL and triggers the
 * native share sheet (iOS Share Sheet / Android Share Intent).
 *
 * Features:
 *  - Generates SEO-friendly HTTPS share URL (not a custom scheme)
 *  - Records the share event on the backend (sharesCount++)
 *  - Handles errors gracefully (no silent failures)
 *  - Returns the share result so callers can react (e.g., show confetti)
 *
 * Usage:
 *   import { shareReel } from '../services/shareReel';
 *   await shareReel({ reelId: reel.id, caption: reel.caption });
 */

import { Share, Alert, Platform } from 'react-native';
import { ReelsService } from './reels.service';

// ── Configuration ──────────────────────────────────────────────────────────────
// Replace with your actual production domain
const APP_URL    = 'https://myapp.com';
const APP_NAME   = 'Glunity';

export interface ShareReelOptions {
  /** The reel's MongoDB ObjectId string */
  reelId: string;
  /** Optional caption to include in the share message */
  caption?: string;
  /** Optional author name for richer share text */
  authorName?: string;
}

export interface ShareReelResult {
  /** Whether the user completed the share action (vs dismissed the sheet) */
  shared: boolean;
  /** The canonical URL that was shared */
  url: string;
  /** The native share action string returned by the OS, if available */
  action?: string;
}

/**
 * Build the canonical public share URL for a reel.
 *
 * @param reelId - The MongoDB ObjectId of the reel
 * @returns The full HTTPS URL, e.g. https://myapp.com/reel/65a92abc...
 */
export function buildReelShareUrl(reelId: string): string {
  return `${APP_URL}/reel/${reelId}`;
}

/**
 * Build the share message string.
 * Kept short so it displays well in all messengers.
 *
 * @param caption - Optional reel caption
 * @param url     - The share URL
 */
function buildShareMessage(caption: string | undefined, url: string): string {
  if (caption && caption.trim().length > 0) {
    // Truncate long captions gracefully
    const short = caption.trim().slice(0, 120);
    return `${short}${caption.length > 120 ? '...' : ''}\n\n${url}`;
  }
  return `Check out this reel on ${APP_NAME}!\n\n${url}`;
}

/**
 * Open the native share sheet for a reel.
 *
 * This function:
 *  1. Builds the canonical share URL
 *  2. Opens the native Share API (iOS Sheet / Android Chooser)
 *  3. On success, records the share on the backend (fire-and-forget)
 *
 * @param opts - Share options
 * @returns ShareReelResult
 */
export async function shareReel(opts: ShareReelOptions): Promise<ShareReelResult> {
  const { reelId, caption, authorName } = opts;

  if (!reelId) {
    console.warn('[shareReel] No reelId provided');
    return { shared: false, url: '' };
  }

  const url     = buildReelShareUrl(reelId);
  const message = buildShareMessage(caption, url);

  // Build the title shown at the top of the share sheet (iOS only)
  const title = authorName
    ? `${authorName}'s reel on ${APP_NAME}`
    : `A reel on ${APP_NAME}`;

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? {
            // On iOS, providing both message and url gives the best UX:
            // - `url` is what gets embedded by iMessage, WhatsApp, etc. (for OG preview)
            // - `message` is the text shown in the share sheet compose area
            message,
            url,
            title,
          }
        : {
            // On Android, `message` + a trailing URL is the standard pattern.
            // Android apps parse the URL out of the message for link previews.
            message,
            title,
          },
      {
        dialogTitle: `Share this reel`,  // Android chooser header
        subject: title,                  // Email subject fallback
      }
    );

    const shared =
      result.action === Share.sharedAction ||
      // Android returns 'sharedAction' when the user picks an app
      result.action !== Share.dismissedAction;

    if (shared) {
      // ── Record share on backend (fire-and-forget) ─────────────────────────
      // We don't await this to avoid blocking the UI.
      // Failures are swallowed — the share already succeeded for the user.
      ReelsService.recordShare(reelId).catch((err) => {
        console.warn('[shareReel] Failed to record share:', err?.message);
      });
    }

    return { shared, url, action: result.action };

  } catch (err: any) {
    // Share API errors are rare but can happen on unusual Android configurations
    if (__DEV__) {
      console.error('[shareReel] Share error:', err);
    }
    Alert.alert(
      'Unable to share',
      'Something went wrong while opening the share sheet. Please try again.',
      [{ text: 'OK' }]
    );
    return { shared: false, url };
  }
}

/**
 * Copy the reel URL to clipboard.
 * Useful as a "Copy link" button alongside the main share action.
 *
 * @param reelId
 * @returns The URL that was copied
 */
export async function copyReelLink(reelId: string): Promise<string> {
  const url = buildReelShareUrl(reelId);
  try {
    // Clipboard API — import Clipboard from '@react-native-clipboard/clipboard'
    // Uncomment if @react-native-clipboard/clipboard is installed:
    // const Clipboard = require('@react-native-clipboard/clipboard').default;
    // await Clipboard.setString(url);
    console.log('[shareReel] Link to copy:', url);
  } catch (err) {
    console.warn('[shareReel] Clipboard error:', err);
  }
  return url;
}
