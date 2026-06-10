import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Platform, DimensionValue } from 'react-native';
import { useTheme } from '@/shared/context/theme.context';

interface SkeletonProps {
  style?: ViewStyle | ViewStyle[];
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

export function SkeletonLoader({ style, width, height, borderRadius = 8 }: SkeletonProps) {
  const { theme: T } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 850,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: T.surfaceAlt,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

// ── Common Layout Presets ───────────────────────────────────────────────────

export function ArticleCardSkeleton() {
  const { theme: T } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
        gap: 12,
        marginBottom: 12,
        marginHorizontal: 20,
      }}
    >
      <SkeletonLoader width={90} height={90} borderRadius={12} />
      <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonLoader width="35%" height={12} borderRadius={4} />
          <SkeletonLoader width="20%" height={10} borderRadius={4} />
        </View>
        <SkeletonLoader width="85%" height={15} borderRadius={4} />
        <SkeletonLoader width="65%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function FeaturedArticleSkeleton() {
  const { theme: T } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 20,
        backgroundColor: T.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
        gap: 12,
        paddingBottom: 16,
      }}
    >
      <SkeletonLoader width="100%" height={160} borderRadius={0} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <SkeletonLoader width="25%" height={12} borderRadius={4} />
        <SkeletonLoader width="80%" height={18} borderRadius={4} />
        <SkeletonLoader width="90%" height={12} borderRadius={4} />
        <SkeletonLoader width="50%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function VideoCardSkeleton() {
  const { theme: T } = useTheme();
  return (
    <View style={{ width: 160, gap: 8, marginRight: 12 }}>
      <SkeletonLoader width={160} height={90} borderRadius={12} />
      <SkeletonLoader width="90%" height={12} borderRadius={4} />
      <SkeletonLoader width="60%" height={10} borderRadius={4} />
    </View>
  );
}

export function EventCardSkeleton() {
  const { theme: T } = useTheme();
  return (
    <View
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 12,
      }}
    >
      <SkeletonLoader width="100%" height={140} borderRadius={0} />
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
        <SkeletonLoader width="75%" height={16} borderRadius={4} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SkeletonLoader width={14} height={14} borderRadius={7} />
          <SkeletonLoader width="40%" height={12} borderRadius={4} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <SkeletonLoader width={12} height={12} borderRadius={6} />
            <SkeletonLoader width="50%" height={11} borderRadius={4} />
          </View>
          <SkeletonLoader width="25%" height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

