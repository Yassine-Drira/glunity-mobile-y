import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useLanguage } from '@/shared/context/language.context';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // Heart animations
  const heart1Anim = useRef(new Animated.Value(0)).current;
  const heart2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Infinite heart floating/pulsing loops
    Animated.loop(
      Animated.sequence([
        Animated.timing(heart1Anim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(heart1Anim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heart2Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(heart2Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Intro');
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Interpolations for hearts
  const heart1Scale = heart1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.15],
  });
  const heart1TranslateY = heart1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const heart2Scale = heart2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.12],
  });
  const heart2TranslateY = heart2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

      {/* CERCLE DÉCORATIF — bas gauche */}
      <View style={styles.bgCircle} />

      {/* CONTENU CENTRAL */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
          },
        ]}
      >
        {/* Seamless circular container for Logo matching image background */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../../../assets/Logo/image 1.png')}
            style={styles.logoImage}
          />
        </View>

        {/* Sous-titre */}
        <Text style={styles.subtitle}>{t('Sans Gluten, Sans probleme')}</Text>
      </Animated.View>

      {/* Petit cœur — animated floating/pulsing */}
      <Animated.View 
        style={[
          styles.heartSmallWrap,
          {
            transform: [
              { rotate: '-20deg' },
              { scale: heart1Scale },
              { translateY: heart1TranslateY }
            ]
          }
        ]}
      >
        <Text style={styles.heartSmall}>♥</Text>
      </Animated.View>

      {/* Grand cœur — animated floating/pulsing */}
      <Animated.View 
        style={[
          styles.heartLargeWrap,
          {
            transform: [
              { rotate: '15deg' },
              { scale: heart2Scale },
              { translateY: heart2TranslateY }
            ]
          }
        ]}
      >
        <Text style={styles.heartLarge}>♥</Text>
      </Animated.View>
    </View>
  );
}

const CIRCLE_SIZE = width * 0.88;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    left: -(CIRCLE_SIZE * 0.22),
    bottom: -(CIRCLE_SIZE * 0.12),
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -height * 0.08, // Elevated higher on the y-axis, centered horizontally
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FAF8F5', // Matches the logo image background color exactly
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
    backgroundColor: '#FAF8F5', // Ensures zero boundary mismatch
  },
  subtitle: {
    fontWeight: '600',
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'center',
    color: '#FAFAFA',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  heartSmallWrap: {
    position: 'absolute',
    left: '14%',
    bottom: '12%',
  },
  heartSmall: {
    fontSize: 26,
    color: '#C8102E',
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  heartLargeWrap: {
    position: 'absolute',
    left: '8%',
    bottom: '4%',
  },
  heartLarge: {
    fontSize: 52,
    color: '#C8102E',
    lineHeight: 58,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});