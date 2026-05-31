import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';

interface FilterPillProps {
  label?: string;
  onPress?: () => void;
  testID?: string;
}

/**
 * The floating "Filter" pill that floats above the map.
 * Tapping it opens the filter sheet.
 */
export function FilterPill({ label = 'Filter', onPress, testID }: FilterPillProps) {
  const { theme: T } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: T.surface, borderColor: T.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <Feather name="sliders" size={13} color={T.green} />
        <Text style={[styles.label, { color: T.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
