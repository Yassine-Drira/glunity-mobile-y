/**
 * useDeepLink — React Navigation handles cold-start, background, and foreground
 * deep links automatically via the `linking` prop on NavigationContainer (see App.tsx).
 *
 * This hook provides ADDITIONAL imperative handling for use cases where you need
 * programmatic access to the incoming URL — for example, triggering analytics,
 * showing a toast, or handling edge cases not covered by the route mapping.
 *
 * Usage:
 *   const { lastUrl } = useDeepLink();
 *
 * For most reel navigation needs, the React Navigation linking config in App.tsx
 * is the primary mechanism. This hook is supplementary.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const REEL_PATH_REGEX = /\/reel\/([a-f0-9]{24})/i;
const APP_DOMAIN = 'myapp.com';

export interface DeepLinkState {
  /** The last URL the app received via a deep link, or null if none */
  lastUrl: string | null;
  /** Whether the initial URL has been processed (useful for splash screens) */
  isReady: boolean;
}

/**
 * Parse a reel ID from a supported deep link URL.
 *
 * Handles:
 *   https://myapp.com/reel/65a92abc...
 *   glunity://reel/65a92abc...
 *
 * @param {string} url
 * @returns {string|null} The MongoDB ObjectId string, or null
 */
export function parseReelIdFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(REEL_PATH_REGEX);
  return match ? match[1] : null;
}

/**
 * Determine if a URL is a reel deep link for this app.
 */
export function isReelDeepLink(url: string): boolean {
  if (!url) return false;
  return REEL_PATH_REGEX.test(url);
}

/**
 * useDeepLink
 *
 * Monitors incoming URLs from:
 *  - Cold start (app was closed — reads getInitialURL)
 *  - Background / foreground transition (app resumes — Linking event)
 *
 * Navigates to ReelDetail when a reel URL is received.
 * React Navigation's built-in linking config handles most cases; this hook
 * covers edge cases and provides lastUrl for analytics.
 */
export function useDeepLink(): DeepLinkState {
  const navigation = useNavigation<any>();
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const handledUrls = useRef(new Set<string>());

  const handleUrl = useCallback(
    (url: string | null) => {
      if (!url) return;
      if (handledUrls.current.has(url)) return; // Prevent double-handling

      handledUrls.current.add(url);
      setLastUrl(url);

      const reelId = parseReelIdFromUrl(url);
      if (reelId) {
        // Navigate to the deep-link redirect screen
        // (which replaces itself with ReelsFeed + autoOpenReelId)
        try {
          navigation.navigate('ReelDetail', { reelId });
        } catch {
          // If navigator is not ready yet, React Navigation's own linking
          // config will handle it via the NavigationContainer linking prop.
        }
      }
    },
    [navigation]
  );

  // ── Cold start ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    Linking.getInitialURL()
      .then((url) => {
        if (!mounted) return;
        handleUrl(url);
        setIsReady(true);
      })
      .catch(() => {
        if (mounted) setIsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background → Foreground ────────────────────────────────────────────────
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  return { lastUrl, isReady };
}
