import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

interface DauWauMauProps {
  data: { dau: number; wau: number; mau: number };
}

const METRICS = [
  {
    key: 'dau' as const,
    label: 'Actifs Aujourd\'hui',
    shortLabel: 'DAU',
    color: '#3B82F6',
    icon: 'sun' as const,
  },
  {
    key: 'wau' as const,
    label: 'Cette Semaine',
    shortLabel: 'WAU',
    color: '#0EA5E9',
    icon: 'calendar' as const,
  },
  {
    key: 'mau' as const,
    label: 'Ce Mois',
    shortLabel: 'MAU',
    color: '#0F766E',
    icon: 'trending-up' as const,
  },
];

export function DauWauMau({ data }: DauWauMauProps) {
  const { theme: T, isDark } = useTheme();

  // Trend: wau should be > dau, mau should be > wau
  const dauTrend = data.dau > 0 ? ((data.dau / Math.max(data.wau / 7, 1)) * 100 - 100).toFixed(0) : null;
  const trends = [dauTrend, null, null]; // Only DAU has a meaningful daily trend vs weekly avg

  return (
    <View style={styles.container}>
      {METRICS.map((m, index) => {
        const value = data[m.key];
        const trend = trends[index];
        const isUp = trend !== null && Number(trend) >= 0;

        return (
          <View
            key={m.key}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1C1C1E' : Colors.white,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }
            ]}
          >
            {/* Icon */}
            <View style={[styles.iconBg, { backgroundColor: m.color + '18' }]}>
              <Feather name={m.icon} size={14} color={m.color} />
            </View>

            {/* Value */}
            <Text style={[styles.value, { color: m.color }]}>{value.toLocaleString()}</Text>

            {/* Label */}
            <Text style={[styles.label, { color: T.textMuted }]} numberOfLines={2}>{m.label}</Text>

            {/* Trend badge */}
            {trend !== null ? (
              <View style={[styles.trendBadge, { backgroundColor: isUp ? '#10B98118' : '#EF444418' }]}>
                <Feather name={isUp ? 'arrow-up-right' : 'arrow-down-right'} size={9} color={isUp ? '#10B981' : '#EF4444'} />
                <Text style={[styles.trendText, { color: isUp ? '#10B981' : '#EF4444' }]}>{Math.abs(Number(trend))}%</Text>
              </View>
            ) : (
              <View style={styles.shortLabelRow}>
                <Text style={[styles.shortLabel, { color: m.color }]}>{m.shortLabel}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  card: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontFamily: Font.bold,
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontFamily: Font.regular,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
    marginTop: 2,
  },
  trendText: {
    fontFamily: Font.bold,
    fontSize: 9,
  },
  shortLabelRow: {
    marginTop: 2,
  },
  shortLabel: {
    fontFamily: Font.bold,
    fontSize: 9,
  },
});
