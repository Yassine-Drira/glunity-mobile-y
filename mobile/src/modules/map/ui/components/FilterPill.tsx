import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface FilterPillProps {
  label?: string;
  onPress?: () => void;
  testID?: string;
}

const C = {
  bg: '#FFFFFF',
  text: '#2E2E2E',
  shadow: '#000000',
};

/**
 * The white "Filter" pill that floats above the map (top-right of screen
 * in the mockup). Tapping it opens the filter sheet.
 */
export function FilterPill({ label = 'Filter', onPress, testID }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Feather name="sliders" size={14} color={C.text} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: C.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
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
    color: C.text,
    fontFamily: 'Poppins_500Medium',
  },
});
