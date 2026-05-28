import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/theme.context';
import { ScanFrameIcon } from './icons/ScanFrameIcon';

type TabKey = 'home' | 'events' | 'reels' | 'profile';

interface BottomNavBarProps {
  activeTab: TabKey;
  idPrefix?: string;
  onPressHome?: () => void;
  onPressEvents?: () => void;
  onPressCenter?: () => void;
  onPressReels?: () => void;
  onPressProfile?: () => void;
}

import { useLanguage } from '../context/language.context';

export function BottomNavBar({
  activeTab,
  idPrefix = 'nav',
  onPressHome,
  onPressEvents,
  onPressCenter,
  onPressReels,
  onPressProfile,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { theme: C } = useTheme();
  const { isRTL, t } = useLanguage();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.surface,
      borderTopWidth: 1,
      borderTopColor: C.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Math.max(insets.bottom, 12),
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: -3 },
      shadowRadius: 8,
      elevation: 10,
    },
    bottomBar: {
      height: 60,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    iconFrame: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconFrameActive: {},
    navItem: {
      width: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    navLabel: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '500',
      color: C.textMuted,
      fontFamily: 'Poppins_500Medium',
    },
    navLabelActive: {
      color: C.green,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
    fabButton: {
      position: 'absolute',
      alignSelf: 'center',
      top: -24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: C.green,
      borderWidth: 4,
      borderColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 10,
    },
  }), [C, insets]);

  const getLabelStyle = (tab: TabKey) => [styles.navLabel, activeTab === tab ? styles.navLabelActive : null];
  const getIconColor = (tab: TabKey) => (activeTab === tab ? C.green : C.textMuted);
  const getIconFrameStyle = (tab: TabKey) => [styles.iconFrame, activeTab === tab ? styles.iconFrameActive : null];

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
      // Prevents this fixed bar from being announced as hidden when a
      // React Navigation screen overlay sets aria-hidden on its parent.
      importantForAccessibility="yes"
      accessibilityRole="tablist"
    >
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={onPressHome}
          id={`${idPrefix}-home`}
          accessibilityRole="tab"
          accessibilityLabel={t('Home')}
          accessibilityState={{ selected: activeTab === 'home' }}
        >
          <View style={getIconFrameStyle('home')}>
            <Feather name="home" size={22} color={getIconColor('home')} />
          </View>
          <Text style={getLabelStyle('home')}>{t('Home')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={onPressEvents}
          id={`${idPrefix}-events`}
          accessibilityRole="tab"
          accessibilityLabel={t('Events')}
          accessibilityState={{ selected: activeTab === 'events' }}
        >
          <View style={getIconFrameStyle('events')}>
            <Feather name="calendar" size={22} color={getIconColor('events')} />
          </View>
          <Text style={getLabelStyle('events')}>{t('Events')}</Text>
        </TouchableOpacity>

        <View style={styles.navItem} />

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={onPressReels}
          id={`${idPrefix}-reels`}
          accessibilityRole="tab"
          accessibilityLabel={t('Reels')}
          accessibilityState={{ selected: activeTab === 'reels' }}
        >
          <View style={getIconFrameStyle('reels')}>
            <MaterialCommunityIcons name="movie-play-outline" size={24} color={getIconColor('reels')} />
          </View>
          <Text style={getLabelStyle('reels')}>{t('Reels')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={onPressProfile}
          id={`${idPrefix}-profile`}
          accessibilityRole="tab"
          accessibilityLabel={t('Profile')}
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <View style={getIconFrameStyle('profile')}>
            <Feather name="user" size={22} color={getIconColor('profile')} />
          </View>
          <Text style={getLabelStyle('profile')}>{t('Profile')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={onPressCenter}
        id={`${idPrefix}-fab`}
        accessibilityRole="button"
        accessibilityLabel={t('Scan for gluten')}
      >
        <ScanFrameIcon size={28} color="#FFFFFF" strokeWidth={2.0} />
      </TouchableOpacity>
    </View>
  );
}
