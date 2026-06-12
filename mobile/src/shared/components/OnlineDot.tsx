import React from 'react';
import { View, StyleSheet } from 'react-native';

interface OnlineDotProps {
  isOnline: boolean;
  size?: number; // default 10
}

export default function OnlineDot({ isOnline, size = 10 }: OnlineDotProps) {
  if (!isOnline) return null;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
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
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
});
