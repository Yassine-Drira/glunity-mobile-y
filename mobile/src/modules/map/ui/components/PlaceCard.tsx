import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MapLocation } from '../../domain/location.types';
import { useLanguage } from '@/shared/context/language.context';

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
  const { t } = useLanguage();
  const heroUrl = location.images?.[0]?.url ?? null;
  const ratingLabel = location.rating?.average ? location.rating.average.toFixed(1) : '—';
  const reviewLabel = formatReviews(location.rating?.count ?? 0);

  const localizedReviews = t('({reviewLabel} reviews)').replace('{reviewLabel}', reviewLabel);

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
              <Text style={styles.glutenRibbonText}>{t('Gluten Free')}</Text>
            </View>
          )}
        </View>

        <View style={styles.detailedBody}>
          <Text style={styles.title} numberOfLines={1}>{t(location.name)}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Ionicons name="star" size={14} color={C.star} />
              <Text style={styles.metaStrong}>{ratingLabel}</Text>
              <Text style={styles.metaMuted}>{localizedReviews}</Text>
            </View>
            {(distanceKm != null || etaMinutes != null) && (
              <View style={styles.metaCell}>
                <Feather name="map-pin" size={14} color={C.green} />
                <Text style={styles.metaMuted}>
                  {distanceKm != null ? `${distanceKm.toFixed(1)} ${t('KM')}` : ''}
                  {distanceKm != null && etaMinutes != null ? ' / ' : ''}
                  {etaMinutes != null ? `${etaMinutes} ${t('min')}` : ''}
                </Text>
              </View>
            )}
          </View>

          {!!location.description && (
            <Text style={styles.description} numberOfLines={3}>
              {t(location.description)}
              {location.description.length > 120 ? <Text style={styles.readMore}> {t('Read More')}</Text> : null}
            </Text>
          )}

          <Pressable onPress={onContact} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
            <Text style={styles.ctaLabel}>{t('Contact')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // compact variant
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compactCard, pressed && { opacity: 0.95 }]}>
      <View style={styles.compactRowTop}>
        <Text style={styles.compactTitle} numberOfLines={1}>{t(location.name)}</Text>
        <View style={styles.glutenChip}>
          <Text style={styles.glutenChipText}>{t('GF')}</Text>
          <Ionicons name="checkmark-circle" size={11} color={C.green} />
        </View>
      </View>
      <View style={styles.compactRow}>
        <Feather name="map-pin" size={13} color={C.muted} />
        <Text style={styles.compactMuted} numberOfLines={1}>
          {distanceKm != null ? t('{distance} km away from you').replace('{distance}', distanceKm.toFixed(1)) : t(location.address || location.city || '—')}
        </Text>
      </View>
      <View style={styles.compactBottom}>
        <View style={styles.metaCell}>
          <Ionicons name="star" size={13} color={C.star} />
          <Text style={styles.metaStrong}>{ratingLabel}</Text>
          <Text style={styles.metaMuted}>{localizedReviews}</Text>
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
  if (!p) return '';
  return p;
}

const RADIUS = 20;

const styles = StyleSheet.create({
  // ── Compact ────────────────────────────────────────────────────────────────
  compactCard: {
    backgroundColor: C.white,
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: C.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 5,
  },
  compactRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  compactTitle: { fontSize: 16, fontWeight: '700', color: C.text, fontFamily: 'Poppins_700Bold', flex: 1 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  compactMuted: { fontSize: 12, color: C.muted, fontFamily: 'Poppins_400Regular', flex: 1 },
  compactBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F4F4F3', paddingTop: 10, marginTop: 4 },
  glutenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EBF8E1',
    borderRadius: 8,
  },
  glutenChipText: { fontSize: 11, fontWeight: '600', color: C.green, fontFamily: 'Poppins_600SemiBold' },
  price: { fontSize: 15, fontWeight: '700', color: C.text, fontFamily: 'Poppins_700Bold' },

  // ── Detailed ───────────────────────────────────────────────────────────────
  detailedCard: {
    backgroundColor: C.white,
    borderRadius: RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: C.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 7,
  },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 160 },
  heroPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  glutenRibbon: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.green,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  glutenRibbonText: {
    color: C.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
  },
  detailedBody: { padding: 16, gap: 8 },
  title: { fontSize: 19, fontWeight: '700', color: C.text, fontFamily: 'Poppins_700Bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  metaCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaStrong: { fontSize: 13, fontWeight: '600', color: C.text, fontFamily: 'Poppins_600SemiBold' },
  metaMuted: { fontSize: 12, color: C.muted, fontFamily: 'Poppins_400Regular' },
  description: { fontSize: 13, lineHeight: 18, color: C.muted, fontFamily: 'Poppins_400Regular' },
  readMore: { color: C.greenDeep, fontFamily: 'Poppins_600SemiBold' },
  cta: {
    marginTop: 8,
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: C.green,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  ctaLabel: { color: C.white, fontFamily: 'Poppins_600SemiBold', fontSize: 14, fontWeight: '600' },
});
