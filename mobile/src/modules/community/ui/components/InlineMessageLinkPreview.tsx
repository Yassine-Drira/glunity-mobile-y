/**
 * InlineMessageLinkPreview — In-conversation rich link preview card.
 *
 * Detects a social media URL inside a chat message bubble and renders
 * a compact, styled preview card below the message text — similar to
 * Telegram, Discord, iMessage, and Slack.
 *
 * This component is self-contained: it handles its own data fetching
 * so it can be dropped into the message list without lifting state.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { extractSupportedUrl, PLATFORM_COLOR, PLATFORM_DISPLAY, type SupportedPlatform } from '../../utils/url-parser';
import { fetchLinkPreview, type LinkPreviewData } from '../../services/link-preview.service';

// ── Props ─────────────────────────────────────────────────────────────────────

interface InlineMessageLinkPreviewProps {
  /** The raw message text content */
  messageContent: string;
  /** Whether this message was sent by the current user */
  isMe: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default React.memo(function InlineMessageLinkPreview({
  messageContent,
  isMe,
}: InlineMessageLinkPreviewProps) {
  const { theme: T, isDark } = useTheme();
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading]  = useState(false);
  const fadeAnim               = useRef(new Animated.Value(0)).current;
  const pulseAnim              = useRef(new Animated.Value(0.35)).current;

  const link = extractSupportedUrl(messageContent);

  // Fetch metadata once on mount (or when the message changes)
  useEffect(() => {
    if (!link) return;
    let cancelled = false;

    setLoading(true);
    setPreview(null);
    fadeAnim.setValue(0);

    fetchLinkPreview(link.url)
      .then((data) => {
        if (!cancelled) {
          setPreview(data);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {
        // Silent fail — don't render error inside message bubbles
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.url]);

  // Skeleton pulse loop
  useEffect(() => {
    if (loading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [loading]);

  if (!link) return null;

  const platform    = (preview?.type ?? 'unknown') as SupportedPlatform;
  const accentColor = PLATFORM_COLOR[platform] ?? '#888';
  const platformLbl = PLATFORM_DISPLAY[platform] ?? preview?.siteName ?? 'Link';

  // Adapt card colors based on whether it's inside a "my" bubble (dark green) or
  // a received bubble (light or dark-mode background)
  const cardBg = isMe
    ? 'rgba(0,0,0,0.20)'
    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const textColor  = isMe ? 'rgba(255,255,255,0.95)' : T.text;
  const mutedColor = isMe ? 'rgba(255,255,255,0.60)' : T.textMuted;
  const borderColor = isMe ? 'rgba(255,255,255,0.15)' : T.border;

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    const skBar = (w: number | string, h = 9) => (
      <Animated.View
        style={{
          width: w as any,
          height: h,
          borderRadius: 5,
          backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : T.border,
          opacity: pulseAnim,
          marginBottom: 4,
        }}
      />
    );

    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={[styles.accent, { backgroundColor: T.border }]} />
        <View style={styles.thumbnailSkeleton}>
          <Animated.View
            style={{ flex: 1, borderRadius: 6, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : T.border, opacity: pulseAnim }}
          />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', gap: 5 }}>
          {skBar('50%', 7)}
          {skBar('90%', 10)}
          {skBar('65%', 9)}
        </View>
      </View>
    );
  }

  if (!preview) return null;

  const handleOpen = () => Linking.openURL(preview.url ?? link.url).catch(() => {});

  // ── Full card ───────────────────────────────────────────────────────────────
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      >
        {/* Left accent bar */}
        <View style={[styles.accent, { backgroundColor: accentColor }]} />

        {/* Thumbnail */}
        {preview.thumbnail ? (
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: preview.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.playOverlay}>
              <View style={[styles.playCircle, { backgroundColor: `${accentColor}CC` }]}>
                <Ionicons name="play" size={10} color="#fff" />
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.thumbnailWrapper, styles.thumbnailPlaceholder, { backgroundColor: `${accentColor}25` }]}>
            <Ionicons name="link" size={18} color={accentColor} />
          </View>
        )}

        {/* Text */}
        <View style={styles.textCol}>
          {/* Platform badge */}
          <View style={styles.badgeRow}>
            {preview.favicon ? (
              <Image source={{ uri: preview.favicon }} style={styles.favicon} resizeMode="contain" />
            ) : (
              <View style={[styles.faviconDot, { backgroundColor: accentColor }]} />
            )}
            <Text style={[styles.platformLabel, { color: accentColor }]} numberOfLines={1}>
              {platformLbl}
            </Text>
          </View>

          {/* Title */}
          {preview.title ? (
            <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {preview.title}
            </Text>
          ) : null}

          {/* Author */}
          {preview.author ? (
            <Text style={[styles.author, { color: mutedColor }]} numberOfLines={1}>
              {preview.author.startsWith('@') ? preview.author : `@${preview.author}`}
            </Text>
          ) : null}
        </View>

        {/* External link icon */}
        <Ionicons
          name="open-outline"
          size={14}
          color={mutedColor}
          style={{ alignSelf: 'center', marginRight: 8 }}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    minHeight: 64,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 1 },
    }),
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    margin: 6,
    borderRadius: 7,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailSkeleton: {
    width: 60,
    height: 60,
    margin: 6,
    borderRadius: 7,
    overflow: 'hidden',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 1,
  },
  textCol: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 4,
    gap: 2,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  favicon: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  faviconDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  platformLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  author: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
});
