import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const goNext = () => {
    navigation.replace('Intro');
  };

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Auto-navigate to intro quickly.
    const timer = setTimeout(() => {
      goNext();
    }, 1000);
    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

      {/* Big decorative circle (BG Circle) */}
      <View style={styles.bgCircle} />

      {/* Animated logo + subtitle */}
      <Animated.View
        style={[
          styles.centerContent,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo placeholder — swap with <Image source={require('../assets/logo.png')} /> */}
        <View style={styles.logoWrap}>
          {/* Wheat / gluten-free icon placeholder */}
          <Text style={styles.logoEmoji}>🌾</Text>
        </View>

        <Text style={styles.logoText}>Glutenia logo</Text>
        <Text style={styles.subtitle}>Sans Gluten, Sans probleme</Text>
      </Animated.View>

      {/* Decorative hearts (bottom-left) */}
      <View style={[styles.heart, styles.heart1]}>
        <HeartIcon size={24} color="#C8102E" rotation={30} />
      </View>
      <View style={[styles.heart, styles.heart2]}>
        <HeartIcon size={18} color="#C8102E" rotation={-39} />
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={goNext} activeOpacity={0.85}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

// Simple heart SVG-like shape using View
function HeartIcon({
  size,
  color,
  rotation,
}: {
  size: number;
  color: string;
  rotation: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        transform: [{ rotate: `${rotation}deg` }],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.9, color }}>♥</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8BC34A',
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // BG Circle: left: -30.79%, top: 65.38%
  bgCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(252, 221, 236, 0.25)',
    left: -121,
    top: 556,
  },

  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logoEmoji: {
    fontSize: 48,
  },

  // Glutenia logo text: left 87px, top 391px, w 220px
  logoText: {
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 48,
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  // Title subtitle: top 53.05%
  subtitle: {
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    color: '#FAFAFA',
  },

  // Hearts — bottom-left area
  heart: {
    position: 'absolute',
  },
  heart1: {
    left: '11.95%',
    bottom: '3.65%',
  },
  heart2: {
    left: '10.69%',
    bottom: '11.03%',
  },
  continueBtn: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
