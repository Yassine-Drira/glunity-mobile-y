import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../shared/context/theme.context';
import { Font, Spacing } from '../../../../shared/utils/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  const { theme: T } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: T.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: T.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  title: {
    fontFamily: Font.semibold,
    fontSize: 15,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
