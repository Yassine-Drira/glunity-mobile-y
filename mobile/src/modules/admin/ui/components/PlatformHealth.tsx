import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

interface PlatformHealthProps {
  health?: {
    notifications: number;
    emailsSent: number;
    apiLatency: string;
    dbStatus: string;
  };
}

export function PlatformHealth({ health }: PlatformHealthProps) {
  const { theme: T, isDark } = useTheme();
  
  const healthData = [
    { label: 'Notifications', value: health?.notifications || '0', icon: 'bell', color: '#8B5CF6' },
    { label: 'Emails Envoyés', value: health?.emailsSent || '0', icon: 'mail', color: '#3B82F6' },
    { label: 'Latence API', value: health?.apiLatency || 'N/A', icon: 'activity', color: '#10B981' },
    { label: 'Base de données', value: health?.dbStatus || 'Inconnu', icon: 'database', color: '#8BC34A' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.container}
    >
      {healthData.map((item, index) => (
        <View 
          key={index} 
          style={[
            styles.pill, 
            { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: item.color + '20' }]}>
            <Feather name={item.icon as any} size={14} color={item.color} />
          </View>
          <View>
            <Text style={[styles.value, { color: T.text }]}>{item.value}</Text>
            <Text style={[styles.label, { color: T.textMuted }]}>{item.label}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingRight: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  value: {
    fontFamily: Font.semibold,
    fontSize: 13,
  },
  label: {
    fontFamily: Font.regular,
    fontSize: 10,
  }
});
