import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, DimensionValue } from 'react-native';
import { useTheme } from '../../../../shared/context/theme.context';
import { Radius, Spacing } from '../../../../shared/utils/theme';

interface SkeletonCardProps {
  height?: number;
  width?: DimensionValue;
}

export function SkeletonCard({ height = 150, width = '100%' }: SkeletonCardProps) {
  const { isDark } = useTheme();
  const animValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [animValue]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          height,
          width,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          opacity: animValue,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
});
