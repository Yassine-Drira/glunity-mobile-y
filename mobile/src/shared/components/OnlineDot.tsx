import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/theme.context';

interface OnlineDotProps {
  isOnline: boolean;
  size?: number; // default 10
  borderColor?: string;
}

export default function OnlineDot({ isOnline, size = 10, borderColor }: OnlineDotProps) {
  const { theme } = useTheme();
  if (!isOnline) return null;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor || theme.surface,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
});
