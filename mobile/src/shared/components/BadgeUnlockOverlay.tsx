import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/theme.context';
import { useLanguage } from '../context/language.context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mapping of badge icons to local image assets
const BADGE_IMAGES: Record<string, any> = {
  bronze: require('../../../assets/badges/bronze.png'),
  silver: require('../../../assets/badges/silver.png'),
  gold: require('../../../assets/badges/gold.png'),
  pro_silver: require('../../../assets/badges/heromedaillesilver.png'),
  pro_gold: require('../../../assets/badges/heromedaillegold.png'),
};

const BADGE_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#A0AAB5',
  gold: '#FFD700',
  pro_silver: '#96A4AE',
  pro_gold: '#FFD700',
};

interface BadgeInfo {
  icon: string;
  name: string;
}

interface BadgeUnlockOverlayProps {
  badge: BadgeInfo;
  onClose: () => void;
}

// ── Decelerating Particle Explosion Component ────────────────────────────────
interface ParticleProps {
  angle: number;
  maxDistance: number;
  color: string;
  size: number;
  delay: number;
  trigger: boolean;
}

const Particle = ({ angle, maxDistance, color, size, delay, trigger }: ParticleProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => {
    // Decelerating travel physics: travel = maxDistance * (1 - e^(-3.5 * t))
    const travel = maxDistance * (1 - Math.exp(-3.5 * progress.value));
    const x = Math.cos(angle) * travel;
    const y = Math.sin(angle) * travel;
    const scale = 1 - progress.value * 0.9;
    const opacity = 1 - progress.value;

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

// ── Confetti Rain Component ──────────────────────────────────────────────────
interface ConfettiProps {
  startX: number;
  color: string;
  width: number;
  height: number;
  duration: number;
  delay: number;
  rotations: number;
  swingDistance: number;
}

const ConfettiPiece = ({
  startX,
  color,
  width,
  height,
  duration,
  delay,
  rotations,
  swingDistance,
}: ConfettiProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const y = -20 + (SCREEN_HEIGHT + 40) * progress.value;
    const x = Math.sin(progress.value * Math.PI * 4) * swingDistance;
    const rotateZ = `${progress.value * 360 * rotations}deg`;
    const rotateY = `${progress.value * 360 * (rotations / 2)}deg`;

    return {
      transform: [
        { translateY: y },
        { translateX: x },
        { rotate: rotateZ },
        { rotateY: rotateY },
      ],
      opacity: progress.value > 0.92 ? withTiming(0, { duration: 100 }) : 1,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
          width,
          height,
          backgroundColor: color,
          borderRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
};

// ── Main Overlay Component ───────────────────────────────────────────────────
export function BadgeUnlockOverlay({ badge, onClose }: BadgeUnlockOverlayProps) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();

  // Animation values
  const scale = useSharedValue(0.1);
  const floatOffset = useSharedValue(0);

  // Staggered Text Values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(-15);
  
  const nameOpacity = useSharedValue(0);
  const nameScale = useSharedValue(0.85);

  const dismissOpacity = useSharedValue(0);
  
  const [showEffects, setShowEffects] = useState(false);
  const [isDismissible, setIsDismissible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Get configuration based on badge type
  const badgeIconKey = badge.icon.toLowerCase();
  const badgeImage = BADGE_IMAGES[badgeIconKey] || BADGE_IMAGES.gold;
  const badgeColor = BADGE_COLORS[badgeIconKey] || T.green;

  // Generate particles (explosion on impact)
  const particles = React.useMemo(() => {
    const arr = [];
    const colors = [badgeColor, '#FFFFFF', '#FFF5C0', '#90CAF9', '#A5D6A7', '#FF8A80'];
    for (let i = 0; i < 22; i++) {
      arr.push({
        id: i,
        angle: (i * 2 * Math.PI) / 22 + Math.random() * 0.2 - 0.1,
        maxDistance: 80 + Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 7,
        delay: Math.random() * 100,
      });
    }
    return arr;
  }, [badgeColor]);

  // Generate confetti (rain)
  const confetti = React.useMemo(() => {
    const arr = [];
    const colors = ['#FFD700', '#FF5252', '#448AFF', '#B2FF59', '#FF4081', '#E040FB', '#18FFFF'];
    for (let i = 0; i < 35; i++) {
      arr.push({
        id: i,
        startX: Math.random() * SCREEN_WIDTH,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: 6 + Math.random() * 5,
        height: 10 + Math.random() * 6,
        duration: 2500 + Math.random() * 1500,
        delay: Math.random() * 1500,
        rotations: 3 + Math.floor(Math.random() * 4),
        swingDistance: 20 + Math.random() * 25,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    // 1. Initial micro-haptic when overlay mounts
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 2. Entrance scale & bounce animation (NO ROTATION)
    scale.value = withSpring(
      1.0,
      { damping: 12, stiffness: 90 },
      (finished) => {
        if (finished) {
          // Trigger particles & confetti starts
          runOnJS(setShowEffects)(true);
          
          // Trigger heavy success haptic on settle
          runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);

          // Start gentle badge floating (translateY only)
          floatOffset.value = withRepeat(
            withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
          );
        }
      }
    );

    // 3. Staggered Text Animations
    // Title slides down & fades in
    titleOpacity.value = withDelay(350, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(350, withSpring(0, { damping: 14 }));
    
    // Badge Name scales up & fades in shortly after
    nameOpacity.value = withDelay(550, withTiming(1, { duration: 500 }));
    nameScale.value = withDelay(550, withSpring(1.0, { damping: 10, stiffness: 100 }));

    // 4. Make dismissible & show hint after 2.2 seconds
    const dismissTimer = setTimeout(() => {
      setIsDismissible(true);
      dismissOpacity.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1,
        true
      );
    }, 2200);

    return () => clearTimeout(dismissTimer);
  }, []);

  const handleDismiss = () => {
    if (!isDismissible || exiting) return;
    setExiting(true);

    // Trigger subtle dismiss feedback
    Haptics.selectionAsync();

    // Outro animation: Scale down badge, fade out texts
    scale.value = withTiming(0.1, { duration: 250, easing: Easing.in(Easing.ease) });
    titleOpacity.value = withTiming(0, { duration: 200 });
    nameOpacity.value = withTiming(0, { duration: 200 });
    dismissOpacity.value = withTiming(0, { duration: 150 });
    
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Animated styles mapping
  const badgeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: floatOffset.value },
      ],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: titleOpacity.value,
      transform: [{ translateY: titleTranslateY.value }],
    };
  });

  const nameAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: nameOpacity.value,
      transform: [{ scale: nameScale.value }],
    };
  });

  const dismissAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: dismissOpacity.value,
    };
  });

  return (
    <Modal visible={true} transparent={true} animationType="fade" statusBarTranslucent={true}>
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.container}>
          {/* Blurred Immersive Background (Respects dark and light mode settings) */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 85}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.darkenOverlay,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.65)' },
            ]}
          />

          {/* Confetti Rain (Behind the Badge) */}
          {showEffects && confetti.map((c) => <ConfettiPiece key={c.id} {...c} />)}

          {/* Core Animating Content Area */}
          <View style={styles.contentWrap}>
            <View style={styles.badgeContainer}>
              {/* Exploding Sparkles Layer */}
              {showEffects &&
                particles.map((p) => (
                  <Particle key={p.id} {...p} trigger={showEffects} />
                ))}

              {/* Main Badge Hero Element */}
              <Animated.View style={[styles.badgeHero, badgeAnimatedStyle]}>
                <Image source={badgeImage} style={styles.badgeImage} resizeMode="contain" />
              </Animated.View>
            </View>

            {/* Staggered Achievement Text Group */}
            <View style={styles.textContainer}>
              <Animated.Text
                style={[
                  styles.unlockTitle,
                  { color: isDark ? '#A3D65C' : '#6DAE3F' },
                  titleAnimatedStyle,
                ]}
              >
                {t('New badge unlocked!')}
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.badgeName,
                  { color: T.text },
                  nameAnimatedStyle,
                ]}
              >
                {t(badge.name)}
              </Animated.Text>
            </View>
          </View>

          {/* Continue Action Indicator */}
          <Animated.View style={[styles.dismissContainer, dismissAnimatedStyle]}>
            <Text style={[styles.dismissText, { color: T.textMuted }]}>
              {t('Tap anywhere to continue')}
            </Text>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkenOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  badgeContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeHero: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: 160,
    height: 160,
  },
  textContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  unlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(163, 214, 92, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badgeName: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
    paddingHorizontal: 12,
  },
  dismissContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    zIndex: 11,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    fontFamily: 'Poppins_500Medium',
  },
});
