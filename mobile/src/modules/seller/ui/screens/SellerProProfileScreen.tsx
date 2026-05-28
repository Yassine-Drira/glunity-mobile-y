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
import { AppScaffold } from '@/shared/components/AppScaffold';
import { Radius } from '@/shared/utils/theme';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerProProfile'>;

// ── Seller journey progression (matches the image exactly) ───────────────────
const JOURNEY_LEVELS = ['Learner', 'Supporter', 'Advocate', 'Champion', 'Guardian'];
const ACTIVE_INDEX   = 1; // "Supporter" is active (second node, as in image)

export default function SellerProProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { theme: T } = useTheme();
  const { isRTL, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8) + 110;

  const s = React.useMemo(() => StyleSheet.create({
    safe:          { flex: 1, backgroundColor: T.bg },
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, rowGap: 20 },

    // Top header — identical layout to ProfileScreen
    topHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    topHeaderSpacer: { width: 40, height: 40 },
    topHeaderTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: T.text,
      fontFamily: 'Poppins_600SemiBold',
    },
    topHeaderBell: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
    },

    // Avatar header
    headerSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
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
    heartBadge: {
      position: 'absolute',
      right: isRTL ? undefined : 2,
      left: isRTL ? 2 : undefined,
      bottom: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: T.red,
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
      fontSize: 20, fontWeight: '700', color: T.text,
      marginTop: 8, marginBottom: 8, fontFamily: 'Poppins_700Bold',
      textAlign: 'center',
    },

    // Red role pill
    roleBadgePill: {
      backgroundColor: T.redLight,
      borderRadius: Radius.full,
      minWidth: 120, alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 4,
      marginBottom: 0,
    },
    roleBadgeText: {
      color: T.red, fontSize: 12,
      fontWeight: '500', fontFamily: 'Poppins_500Medium',
    },

    sectionWrap:  {
      alignItems: isRTL ? 'flex-end' : 'flex-start',
      width: '100%',
    },
    sectionLabel: {
      fontSize: 12, color: T.textMuted, fontWeight: '600',
      marginBottom: 8, fontFamily: 'Poppins_600SemiBold',
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },

    // Role card
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
      backgroundColor: T.redLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 14,
      marginLeft: isRTL ? 14 : 0,
    },
    roleTextWrap: { flex: 1 },
    roleTitle: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 20,
      color: T.text,
      fontFamily: 'Poppins_700Bold',
      textAlign: isRTL ? 'right' : 'left',
    },
    roleSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: T.textSub,
      lineHeight: 18,
      fontFamily: 'Poppins_400Regular',
      textAlign: isRTL ? 'right' : 'left',
    },

    // Journey stepper card
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
      backgroundColor: T.red,
      borderRadius: 2.5,
    },
    journeyRow: {
      width: '100%',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    stepItem:    { width: '20%', alignItems: 'center' },
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
      backgroundColor: T.red,
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
      fontFamily: 'Poppins_400Regular',
    },
    stepLabelActive: {
      color: T.red,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
    stepLabelCompleted: {
      color: T.text,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
    stepLabelInactive: {
      color: T.textMuted,
    },

    // Banner
    bannerCard: {
      backgroundColor: T.greenLight, borderRadius: Radius.lg,
      paddingHorizontal: 16, paddingVertical: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
      width: '100%',
    },
    bannerMascotImage: { width: 56, height: 56 },
    bannerText: {
      flex: 1,
      marginLeft: isRTL ? 0 : 14,
      marginRight: isRTL ? 14 : 0,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '500',
      color: T.text,
      fontFamily: 'Poppins_500Medium',
      textAlign: isRTL ? 'right' : 'left',
    },

    // Menu rows
    menuStack: {
      backgroundColor: T.surface, borderRadius: Radius.lg,
      overflow: 'hidden', shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
      shadowRadius: 4, elevation: 1,
      width: '100%',
    },
    menuRow: {
      backgroundColor: T.surface, paddingVertical: 15, paddingHorizontal: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    menuDivider: {
      height: 1,
      backgroundColor: T.border,
      marginLeft: isRTL ? 0 : 64,
      marginRight: isRTL ? 64 : 0,
    },
    menuLeft:    { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    menuIconCircle: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: T.redLight,
    },
    menuLabel: {
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
      fontSize: 14,
      fontWeight: '500',
      color: T.text,
      fontFamily: 'Poppins_500Medium',
    },
  }), [T, isRTL]);

  return (
    <AppScaffold
      title={t('Profile')}
      activeTab="profile"
      rightIcon="bell-outline"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Map')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => navigation.navigate('SellerProProfile')}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: bottomInset }]}
      >

        {/* ── Avatar + name + red "Gluten-Free Ally" pill ──────────────── */}
        <View style={s.headerSection}>
          <View style={s.avatarWrap}>
            <Image
              source={{
                uri: user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
              }}
              style={s.avatar}
            />
            {/* Red heart badge — distinguishes seller from user's green check */}
            <View style={s.heartBadge}>
              <MaterialCommunityIcons name="heart" size={11} color="#FFFFFF" />
            </View>
          </View>

          <Text style={s.name}>{user?.fullName || 'Senda Abid'}</Text>

          <View style={s.roleBadgePill}>
            <Text style={s.roleBadgeText}>{t('Gluten-Free Ally')}</Text>
          </View>
        </View>

        {/* ── Your Role ─────────────────────────────────────────────────── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Role')}</Text>
          <View style={s.card}>
            <View style={s.roleIconBlock}>
              <MaterialCommunityIcons name="heart-outline" size={22} color={T.red} />
            </View>
            <View style={s.roleTextWrap}>
              <Text style={s.roleTitle}>{t('Gluten-Free Ally')}</Text>
              <Text style={s.roleSubtitle}>
                {t('You support and help someone living gluten-free.')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Your Journey stepper ──────────────────────────────────────── */}
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

        {/* ── Seller-specific actions block ─────────────────────────────── */}
        <View style={s.menuStack}>
          <TouchableOpacity
            style={s.menuRow}
            onPress={() => navigation.navigate('SellerProfile', { sellerId: user?._id })}
            id="pro-profile-products-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="shopping-bag" size={17} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('My products')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={T.textMuted} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity
            style={s.menuRow}
            onPress={() => navigation.navigate('SellerStats')}
            id="pro-profile-visibility-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="eye" size={17} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Visibility')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={T.textMuted} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity
            style={s.menuRow}
            id="pro-profile-messages-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="message-square" size={17} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Clients messages')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Settings / Privacy / Logout block ─────────────────────────── */}
        <View style={s.menuStack}>
          <TouchableOpacity
            style={s.menuRow}
            onPress={() => navigation.navigate('Settings')}
            id="pro-profile-settings-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="settings" size={17} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Settings')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={T.textMuted} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity style={s.menuRow} id="pro-profile-privacy-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="shield" size={17} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Privacy & Security')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={T.textMuted} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity style={s.menuRow} onPress={logout} id="pro-profile-logout-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="log-out" size={17} color={T.red} />
              </View>
              <Text style={s.menuLabel}>{t('Log out')}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={T.textMuted} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </AppScaffold>
  );
}
