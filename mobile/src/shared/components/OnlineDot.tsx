import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/theme.context';

interface OnlineDotProps {
  isOnline: boolean;
  size?: number; // default 10
  borderColor?: string;
  /** When true, the dot pulses with a subtle opacity animation (Messenger-style) */
  pulse?: boolean;
  /** Offline dot — renders a gray circle instead of green. Only shown when isOnline is false and showOffline is true. */
  showOffline?: boolean;
}

export default function OnlineDot({ isOnline, size = 10, borderColor, pulse = false, showOffline = false }: OnlineDotProps) {
  const { theme } = useTheme();

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (pulse && isOnline) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, // infinite
        true // reverse
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [pulse, isOnline]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Show nothing if offline and showOffline is not requested
  if (!isOnline && !showOffline) return null;

  const dotColor = isOnline ? '#22C55E' : '#9CA3AF'; // green or gray

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor || theme.surface,
          backgroundColor: dotColor,
        },
        pulse && isOnline ? pulseStyle : undefined,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
