import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  badge?: React.ReactNode;
  subDetail?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

export function KpiCard({ title, value, icon, iconBgColor, badge, subDetail, onPress, children }: KpiCardProps) {
  const { theme: T, isDark } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : Colors.white,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.1)',
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        {badge}
      </View>
      
      <Text style={[styles.value, { color: T.text }]} numberOfLines={1}>
        {value}
      </Text>
      
      <Text style={[styles.title, { color: T.textMuted }]} numberOfLines={1}>
        {title}
      </Text>
      
      {subDetail && (
        <Text style={[styles.subDetail, { color: T.textMuted }]} numberOfLines={1}>
          {subDetail}
        </Text>
      )}

      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: 20, // More rounded for premium feel
    borderWidth: 1,
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontFamily: Font.bold,
    fontSize: 24,
    marginBottom: 2,
  },
  title: {
    fontFamily: Font.medium,
    fontSize: 12,
  },
  subDetail: {
    fontFamily: Font.regular,
    fontSize: 11,
    marginTop: Spacing.xs,
  },
});
