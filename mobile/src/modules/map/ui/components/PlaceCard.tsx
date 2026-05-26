import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MapLocation } from '../../domain/location.types';

interface PlaceCardProps {
  location: MapLocation;
  variant?: 'compact' | 'detailed';
  distanceKm?: number | null;
  etaMinutes?: number | null;
  onPress?: () => void;
  onContact?: () => void;
}

const C = {
  white: '#FFFFFF',
  text: '#2E2E2E',
  muted: '#6B6B6B',
  green: '#8BC34A',
  star: '#E53935',
  badgeBg: '#8BC34A',
  shadow: '#000000',
};

/**
 * The floating "place" card that appears at the bottom of the map.
 *  - `compact` (default): small horizontal card with name + rating + price
 *  - `detailed`: full card with hero image, description and a "Contact" CTA
 *    (matches the right-hand mockup screen)
 */
export function PlaceCard({
  location,
  variant = 'compact',
  distanceKm,
  etaMinutes,
  onPress,
  onContact,
}: PlaceCardProps) {
  const heroUrl = location.images?.[0]?.url ?? null;
  const ratingLabel = location.rating?.average ? location.rating.average.toFixed(1) : '—';
  const reviewLabel = formatReviews(location.rating?.count ?? 0);

  if (variant === 'detailed') {
    return (
      <View style={styles.detailedCard}>
        <View style={styles.heroWrap}>
          {heroUrl ? (
            <Image source={{ uri: heroUrl }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="storefront-outline" size={36} color="#A8A8A8" />
            </View>
          )}
          {location.glutenFree && (
            <View style={styles.glutenRibbon}>
              <Text style={styles.glutenRibbonText}>Gluten Free</Text>
            </View>
          )}
        </View>

        <View style={styles.detailedBody}>
          <Text style={styles.title} numberOfLines={1}>{location.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Ionicons name="star" size={14} color={C.star} />
              <Text style={styles.metaStrong}>{ratingLabel}</Text>
              <Text style={styles.metaMuted}>({reviewLabel} Reviews)</Text>
            </View>
            {(distanceKm != null || etaMinutes != null) && (
              <View style={styles.metaCell}>
                <Feather name="map-pin" size={14} color={C.green} />
                <Text style={styles.metaMuted}>
                  {distanceKm != null ? `${distanceKm.toFixed(1)} KM` : ''}
                  {distanceKm != null && etaMinutes != null ? ' / ' : ''}
                  {etaMinutes != null ? `${etaMinutes} min` : ''}
                </Text>
              </View>
            )}
          </View>

          {!!location.description && (
            <Text style={styles.description} numberOfLines={3}>
              {location.description}
              {location.description.length > 120 ? <Text style={styles.readMore}> Read More</Text> : null}
            </Text>
          )}

          <Pressable onPress={onContact} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
            <Text style={styles.ctaLabel}>Contact</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // compact variant
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compactCard, pressed && { opacity: 0.92 }]}>
      <View style={styles.compactRowTop}>
        <View style={styles.glutenChip}>
          <Text style={styles.glutenChipText}>Gluten-free</Text>
          <Ionicons name="checkmark-circle" size={14} color={C.green} />
        </View>
      </View>
      <View style={styles.compactRow}>
        <Feather name="map-pin" size={14} color={C.muted} />
        <Text style={styles.compactMuted}>
          {distanceKm != null ? `${distanceKm.toFixed(1)} km away from you` : (location.address || location.city || '—')}
        </Text>
      </View>
      <View style={styles.compactBottom}>
        <View style={styles.metaCell}>
          <Ionicons name="star" size={14} color={C.star} />
          <Text style={styles.metaStrong}>{ratingLabel}</Text>
          <Text style={styles.metaMuted}>{reviewLabel} reviews</Text>
        </View>
        {!!location.priceRange && (
          <Text style={styles.price}>{priceToDisplay(location.priceRange)}</Text>
        )}
      </View>
    </Pressable>
  );
}

function formatReviews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function priceToDisplay(p: string): string {
  // Visual cue for the mockup ("20 TND" style); fallback to the symbols
  if (!p) return '';
  return p;
}

const RADIUS = 22;

const styles = StyleSheet.create({
  // ── Compact ────────────────────────────────────────────────────────────────
  compactCard: {
    backgroundColor: C.white,
    borderRadius: RADIUS,
    padding: 16,
    shadowColor: C.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  compactRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  compactMuted: { fontSize: 12, color: C.muted, fontFamily: 'Poppins_400Regular' },
  compactBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glutenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F2F8E9',
    borderRadius: 999,
  },
  glutenChipText: { fontSize: 12, color: C.text, fontFamily: 'Poppins_500Medium' },
  price: { fontSize: 16, fontWeight: '700', color: C.text, fontFamily: 'Poppins_700Bold' },

  // ── Detailed ───────────────────────────────────────────────────────────────
  detailedCard: {
    backgroundColor: C.white,
    borderRadius: RADIUS,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 170 },
  heroPlaceholder: { backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  glutenRibbon: {
    position: 'absolute',
    right: 16,
    top: 0,
    paddingHorizontal: 14,
    paddingVertical: 24,
    backgroundColor: C.green,
  },
  glutenRibbonText: {
    color: C.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    transform: [{ rotate: '-90deg' }],
  },
  detailedBody: { padding: 18, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: C.text, fontFamily: 'Poppins_700Bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  metaCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaStrong: { fontSize: 13, fontWeight: '600', color: C.text, fontFamily: 'Poppins_600SemiBold' },
  metaMuted: { fontSize: 12, color: C.muted, fontFamily: 'Poppins_400Regular' },
  description: { fontSize: 13, lineHeight: 19, color: C.text, fontFamily: 'Poppins_400Regular' },
  readMore: { color: C.star, fontFamily: 'Poppins_600SemiBold' },
  cta: {
    marginTop: 6,
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: { color: C.white, fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
