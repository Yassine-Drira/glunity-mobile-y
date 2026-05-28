import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useLanguage } from '@/shared/context/language.context';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

const F = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

const JOURNEY_LEVELS = ['Beginner', 'Aware', 'Safe Eater', 'Fighter', 'Titan'];
const ACTIVE_INDEX = 2;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { theme: T } = useTheme();
  const { isRTL, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 8) + 110;
  const mascotImage = require('../../../../../assets/Logo/image 3.png');

  const s = React.useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: T.bg,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      rowGap: 20,
    },

    topHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    topHeaderSpacer: {
      width: 40,
      height: 40,
    },
    topHeaderTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: T.text,
      fontFamily: F.semibold,
    },
    topHeaderBell: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: T.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },

    headerSection: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 6,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: 10,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: T.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    avatar: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 3.5,
      borderColor: T.surface,
    },
    checkBadge: {
      position: 'absolute',
      right: isRTL ? undefined : 2,
      left: isRTL ? 2 : undefined,
      bottom: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: T.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: T.text,
      marginTop: 8,
      marginBottom: 8,
      fontFamily: F.bold,
      textAlign: 'center',
    },
    subTitle: {
      fontSize: 13,
      color: T.textMuted,
      marginTop: 8,
      fontFamily: F.regular,
      textAlign: 'center',
    },
    roleBadgePill: {
      backgroundColor: T.greenLight,
      borderRadius: 999,
      minWidth: 124,
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 4,
      marginBottom: 0,
    },
    roleBadgeText: {
      color: T.green,
      fontSize: 12,
      fontWeight: '500',
      fontFamily: F.medium,
    },

    sectionWrap: {
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    sectionLabel: {
      fontSize: 12,
      color: T.textMuted,
      fontWeight: '600',
      marginBottom: 8,
      fontFamily: F.semibold,
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },
    card: {
      backgroundColor: 'transparent',
      paddingVertical: 8,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
    },

    roleIconBlock: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: T.greenLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 14,
      marginLeft: isRTL ? 14 : 0,
    },

    roleTextWrap: {
      flex: 1,
      paddingTop: 0,
    },
    roleTitle: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 20,
      color: T.text,
      fontFamily: F.bold,
      textAlign: isRTL ? 'right' : 'left',
    },
    roleSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: T.textSub,
      lineHeight: 18,
      fontFamily: F.regular,
      textAlign: isRTL ? 'right' : 'left',
    },

    journeyCard: {
      position: 'relative',
      backgroundColor: 'transparent',
      paddingVertical: 12,
      width: '100%',
    },
    journeyTrack: {
      position: 'absolute',
      left: '10%',
      right: '10%',
      top: 21.5,
      height: 5,
      backgroundColor: T.border,
      borderRadius: 2.5,
    },
    journeyTrackDone: {
      position: 'absolute',
      left: isRTL ? undefined : 0,
      right: isRTL ? 0 : undefined,
      height: 5,
      backgroundColor: T.green,
      borderRadius: 2.5,
    },
    journeyRow: {
      width: '100%',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    stepItem: {
      width: '20%',
      alignItems: 'center',
    },
    stepNodeRow: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    node: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeInactive: {
      backgroundColor: T.surface,
      borderColor: T.border,
    },
    nodeActive: {
      backgroundColor: T.green,
      borderColor: T.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    nodeActiveCenter: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: T.surface,
    },
    stepLabel: {
      marginTop: 6,
      fontSize: 10,
      color: T.textMuted,
      fontWeight: '400',
      textAlign: 'center',
      fontFamily: F.regular,
    },
    stepLabelActive: {
      color: T.green,
      fontWeight: '700',
      fontFamily: F.bold,
    },
    stepLabelCompleted: {
      color: T.text,
      fontWeight: '700',
      fontFamily: F.bold,
    },
    stepLabelInactive: {
      color: T.textMuted,
    },

    bannerCard: {
      backgroundColor: T.greenLight,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      width: '100%',
    },
    bannerMascotImage: {
      width: 56,
      height: 56,
    },
    bannerText: {
      flex: 1,
      marginLeft: isRTL ? 0 : 14,
      marginRight: isRTL ? 14 : 0,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '500',
      color: T.text,
      fontFamily: F.medium,
      textAlign: isRTL ? 'right' : 'left',
    },

    menuStack: {
      backgroundColor: T.surface,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
      width: '100%',
    },
    menuRowCard: {
      backgroundColor: T.surface,
      paddingVertical: 15,
      paddingHorizontal: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    menuDivider: {
      height: 1,
      backgroundColor: T.border,
      marginLeft: isRTL ? 0 : 64,
      marginRight: isRTL ? 64 : 0,
    },
    menuLeft: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
    },
    menuIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: T.redLight,
    },
    menuLabel: {
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
      fontSize: 14,
      fontWeight: '500',
      color: T.text,
      fontFamily: F.medium,
    },
  }), [T, isRTL]);

  return (
    <AppScaffold
      title={t('Profile')}
      activeTab="profile"
      rightIcon="bell-outline"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => {
        if (user?.profileType === 'pro_commerce') {
          navigation.navigate('SellerProProfile');
        } else {
          navigation.navigate('Profile');
        }
      }}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: bottomInset },
        ]}
      >
        <View style={s.headerSection}>
          <View style={s.avatarWrap}>
            <Image
              source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' }}
              style={s.avatar}
            />
            <View style={s.checkBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#FFFFFF" />
            </View>
          </View>

          <Text style={s.name}>{user?.fullName || 'Yassmine Cherif'}</Text>
          <View style={s.roleBadgePill}>
            <Text style={s.roleBadgeText}>{t('Gluten-Free Warrior')}</Text>
          </View>
          <Text style={s.subTitle}>{t('Living gluten-free for 12 years 🌿')}</Text>
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Role')}</Text>
          <View style={s.card}>
            <View style={s.roleIconBlock}>
              <Feather name="shield" size={22} color={T.green} />
            </View>
            <View style={s.roleTextWrap}>
              <Text style={s.roleTitle}>{t('Gluten-Free Warrior')}</Text>
              <Text style={s.roleSubtitle}>
                {t('You actively manage your gluten-free lifestyle and inspire others.')}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Journey')}</Text>
          <View style={s.journeyCard}>
            <View style={s.journeyTrack}>
              <View
                style={[
                  s.journeyTrackDone,
                  { width: `${(ACTIVE_INDEX / (JOURNEY_LEVELS.length - 1)) * 100}%` }
                ]}
              />
            </View>

            <View style={s.journeyRow}>
              {JOURNEY_LEVELS.map((label, index) => {
                const isCompleted = index < ACTIVE_INDEX;
                const isActive    = index === ACTIVE_INDEX;
                const isActiveOrDone = index <= ACTIVE_INDEX;

                return (
                  <View key={label} style={s.stepItem}>
                    <View style={s.stepNodeRow}>
                      <View
                        style={[
                          s.node,
                          isActiveOrDone ? s.nodeActive : s.nodeInactive,
                        ]}
                      >
                        {isActiveOrDone && <View style={s.nodeActiveCenter} />}
                      </View>
                    </View>

                    <Text
                      style={[
                        s.stepLabel,
                        isActive && s.stepLabelActive,
                        isCompleted && s.stepLabelCompleted,
                        !isCompleted && !isActive && s.stepLabelInactive,
                      ]}
                    >
                      {t(label)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={s.bannerCard}>
          <Image source={mascotImage} style={s.bannerMascotImage} resizeMode="contain" />
          <Text style={s.bannerText}>{t('Every action makes the ecosystem stronger.')}</Text>
        </View>

        <View style={s.menuStack}>
          <TouchableOpacity
            style={s.menuRowCard}
            onPress={() => navigation.navigate('Settings')}
            id="profile-settings-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="settings" size={18} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Settings')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={T.textMuted} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity style={s.menuRowCard} id="profile-privacy-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="shield" size={18} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Privacy & Security')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={T.textMuted} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity style={s.menuRowCard} onPress={logout} id="profile-logout-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="log-out" size={18} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Log out')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

    </AppScaffold>
  );
}


