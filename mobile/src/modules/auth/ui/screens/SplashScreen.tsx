import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';
import { useLanguage } from '@/shared/context/language.context';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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

    const timer = setTimeout(() => {
      navigation.replace('Intro');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

      {/* ═══════════════════════════════
          CERCLE DÉCORATIF — bas gauche
          Déborde hors écran en bas et à gauche
      ════════════════════════════════ */}
      <View style={styles.bgCircle} />

      {/* ═══════════════════════════════
          CONTENU CENTRAL
          Légèrement sous le centre vertical
      ════════════════════════════════ */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Titre principal */}
        <Text style={styles.logoText}>{t('Glutenia logo')}</Text>

        {/* Sous-titre */}
        <Text style={styles.subtitle}>{t('Sans Gluten, Sans probleme')}</Text>
      </Animated.View>

      {/* ═══════════════════════════════
          CŒURS — bas gauche
          Petit cœur (haut) + Grand cœur (bas)
      ════════════════════════════════ */}

      {/* Petit cœur — légèrement plus haut et à droite */}
      <View style={styles.heartSmallWrap}>
        <Text style={styles.heartSmall}>♥</Text>
      </View>

      {/* Grand cœur — plus bas, légèrement plus à gauche */}
      <View style={styles.heartLargeWrap}>
        <Text style={styles.heartLarge}>♥</Text>
      </View>
    </View>
  );
}

const CIRCLE_SIZE = width * 0.88;

const styles = StyleSheet.create({
  /* ─── Conteneur principal ─── */
  container: {
    flex: 1,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Cercle décoratif bas-gauche ─── */
  bgCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    // Déborde à gauche (~20%) et en bas (~10%)
    left: -(CIRCLE_SIZE * 0.22),
    bottom: -(CIRCLE_SIZE * 0.12),
  },

  /* ─── Bloc textes centré, légèrement sous le centre ─── */
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: height * 0.06, // pousse légèrement vers le bas du centre
  },

  /* ─── "Glutenia logo" ─── */
  logoText: {
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 44,
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  /* ─── "Sans Gluten, Sans probleme" ─── */
  subtitle: {
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    color: '#FAFAFA',
    letterSpacing: 0.1,
  },

  /* ─── Petit cœur (haut) ─── */
  heartSmallWrap: {
    position: 'absolute',
    left: '13%',
    bottom: '11%',
    transform: [{ rotate: '-20deg' }],
  },
  heartSmall: {
    fontSize: 16,
    color: '#C8102E',
    lineHeight: 20,
  },

  /* ─── Grand cœur (bas) ─── */
  heartLargeWrap: {
    position: 'absolute',
    left: '10%',
    bottom: '4.5%',
    transform: [{ rotate: '15deg' }],
  },
  heartLarge: {
    fontSize: 28,
    color: '#C8102E',
    lineHeight: 34,
  },
});