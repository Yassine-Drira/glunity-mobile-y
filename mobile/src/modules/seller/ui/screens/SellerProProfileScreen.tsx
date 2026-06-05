import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerProProfile'>;

const F = {
  regular: 'Poppins_400Regular',
  medium:  'Poppins_500Medium',
  semibold:'Poppins_600SemiBold',
  bold:    'Poppins_700Bold',
};

const PRO_JOURNEY_LEVELS = ['Learner', 'Supporter', 'Advocate', 'Champion', 'Guardian'];
const PRO_THRESHOLDS     = [0, 120, 300, 1000, 2500];

const PRO_BADGES = [
  {
    id: 'pro_silver',
    name: 'Silver Advocate',
    description: 'Unlock at 300 XP to show advocacy.',
    pointsRequired: 300,
    source: require('../../../../../assets/badges/heromedaillesilver.png') as ReturnType<typeof require>,
    bgColor: 'rgba(160, 170, 181, 0.15)',
  },
  {
    id: 'pro_gold',
    name: 'Gold Guardian',
    description: 'Unlock at 2500 XP as the ultimate guardian.',
    pointsRequired: 2500,
    source: require('../../../../../assets/badges/heromedaillegold.png') as ReturnType<typeof require>,
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
];

export default function SellerProProfileScreen({ navigation }: Props) {
  const { user, logout, checkIn } = useAuth();
  const { theme: T } = useTheme();
  const { isRTL, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8) + 110;

  const [checkingIn, setCheckingIn] = React.useState(false);

  const points = user?.points || 0;

  // Dynamic journey
  let activeIndex = 0;
  for (let i = PRO_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= PRO_THRESHOLDS[i]) { activeIndex = i; break; }
  }
  let progressPercent = 0;
  if (activeIndex >= PRO_JOURNEY_LEVELS.length - 1) {
    progressPercent = 100;
  } else {
    const cur = PRO_THRESHOLDS[activeIndex];
    const nxt = PRO_THRESHOLDS[activeIndex + 1];
    const seg = (points - cur) / (nxt - cur);
    progressPercent = Math.max(0, Math.min(100, ((activeIndex + seg) / (PRO_JOURNEY_LEVELS.length - 1)) * 100));
  }
  const nextLevelPoints = activeIndex < PRO_JOURNEY_LEVELS.length - 1 ? PRO_THRESHOLDS[activeIndex + 1] : PRO_THRESHOLDS[activeIndex];
  const pointsToNext = nextLevelPoints - points;
  const currentLevelLabel = PRO_JOURNEY_LEVELS[activeIndex];
  const nextLevelLabel = activeIndex < PRO_JOURNEY_LEVELS.length - 1 ? PRO_JOURNEY_LEVELS[activeIndex + 1] : null;
  const isMaxLevel = activeIndex >= PRO_JOURNEY_LEVELS.length - 1;

  // Streak / check-in
  const lastCheckIn = user?.lastCheckInAt ? new Date(user.lastCheckInAt) : null;
  const isAlreadyCheckedIn = !!(lastCheckIn && lastCheckIn.toDateString() === new Date().toDateString());

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const earned = await checkIn();
      Alert.alert(t('Success'), `${t('Success! You earned points.')} +${earned} XP`);
    } catch (err: any) {
      Alert.alert(t('Error'), err?.response?.data?.message || err?.message || t('Failed to check in'));
    } finally {
      setCheckingIn(false);
    }
  };

  const isBadgeUnlocked = (required: number) => points >= required;

  const s = React.useMemo(() => StyleSheet.create({
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, rowGap: 20 },

    headerSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
    avatarWrap: {
      position: 'relative', marginBottom: 10,
      width: 110, height: 110, borderRadius: 55,
      backgroundColor: T.surface,
      boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.12)', elevation: 3,
    },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3.5, borderColor: T.surface },
    checkBadge: {
      position: 'absolute',
      right: isRTL ? undefined : 2, left: isRTL ? 2 : undefined,
      bottom: 0, width: 28, height: 28, borderRadius: 14,
      backgroundColor: T.red, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2.5, borderColor: T.surface,
      boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)', elevation: 2,
    },
    name: {
      fontSize: 20, fontWeight: '700', color: T.text,
      marginTop: 8, marginBottom: 8, fontFamily: F.bold, textAlign: 'center',
    },
    statsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6,
    },
    roleBadgePill: {
      backgroundColor: T.redLight, borderRadius: 999,
      minWidth: 124, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4,
    },
    roleBadgeText: { color: T.red, fontSize: 12, fontWeight: '500', fontFamily: F.medium },
    pointsBadgePill: {
      backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 12, flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: T.border,
    },
    pointsBadgeText: { fontSize: 12, fontWeight: '600', color: T.text, fontFamily: F.semibold },
    subTitle: { fontSize: 13, color: T.textMuted, marginTop: 8, fontFamily: F.regular, textAlign: 'center' },

    sectionWrap: { alignItems: isRTL ? 'flex-end' : 'flex-start' },
    sectionLabel: {
      fontSize: 12, color: T.textMuted, fontWeight: '600',
      marginBottom: 8, fontFamily: F.semibold,
      textAlign: isRTL ? 'right' : 'left', width: '100%',
    },

    // Role card
    card: { backgroundColor: 'transparent', paddingVertical: 8, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    roleIconBlock: {
      width: 54, height: 54, borderRadius: 16, backgroundColor: T.redLight,
      alignItems: 'center', justifyContent: 'center',
      marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0,
    },
    roleTextWrap: { flex: 1 },
    roleTitle: { fontSize: 16, fontWeight: '700', lineHeight: 20, color: T.text, fontFamily: F.bold, textAlign: isRTL ? 'right' : 'left' },
    roleSubtitle: { marginTop: 4, fontSize: 13, color: T.textSub, lineHeight: 18, fontFamily: F.regular, textAlign: isRTL ? 'right' : 'left' },

    // Journey
    journeyCard: {
      position: 'relative',
      backgroundColor: T.surface,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: T.border,
      overflow: 'hidden',
      boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.08)',
      elevation: 3,
      width: '100%',
    },
    journeyGlow: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: T.red,
      opacity: 0.08,
    },
    journeyHeaderRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    journeyHeaderLeft: {
      flex: 1,
    },
    journeyLevelPill: {
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: T.redLight,
      borderWidth: 1,
      borderColor: T.red,
    },
    journeyLevelText: {
      fontSize: 11,
      fontWeight: '600',
      color: T.red,
      fontFamily: F.semibold,
    },
    journeyLevelTitle: {
      marginTop: 6,
      fontSize: 15,
      color: T.text,
      fontFamily: F.bold,
      textAlign: isRTL ? 'right' : 'left',
    },
    journeyXpPill: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: T.surfaceAlt,
      borderWidth: 1,
      borderColor: T.border,
    },
    journeyXpText: {
      fontSize: 11,
      fontWeight: '600',
      color: T.text,
      fontFamily: F.semibold,
    },
    journeyProgressWrap: {
      position: 'relative',
      marginTop: 12,
      paddingBottom: 2,
    },
    journeyTrack: {
      position: 'absolute',
      left: '10%',
      right: '10%',
      top: 12,
      height: 6,
      backgroundColor: T.surfaceAlt,
      borderRadius: 6,
      overflow: 'hidden',
    },
    journeyTrackGlow: {
      position: 'absolute',
      left: isRTL ? undefined : 0,
      right: isRTL ? 0 : undefined,
      top: 0,
      height: 6,
      backgroundColor: T.red,
      borderRadius: 6,
      opacity: 0.12,
    },
    journeyTrackDone: {
      position: 'absolute',
      left: isRTL ? undefined : 0,
      right: isRTL ? 0 : undefined,
      top: 0,
      height: 6,
      backgroundColor: T.red,
      borderRadius: 6,
    },
    journeyRow: { width: '100%', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    stepItem: { width: '20%', alignItems: 'center' },
    stepNodeRow: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },
    nodeInactive: { borderColor: T.border },
    nodeCompleted: { backgroundColor: T.surface, borderColor: T.red },
    nodeActive: { backgroundColor: T.red, borderColor: T.surface, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)', elevation: 2 },
    nodeActiveCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.surface },
    stepLabel: { marginTop: 6, fontSize: 10, color: T.textMuted, fontWeight: '400', textAlign: 'center', fontFamily: F.regular },
    stepValue: { marginTop: 2, fontSize: 9, color: T.textMuted, fontWeight: '500', textAlign: 'center', fontFamily: F.medium },
    stepLabelActive: { color: T.red, fontWeight: '700', fontFamily: F.bold },
    stepLabelCompleted: { color: T.text, fontWeight: '700', fontFamily: F.bold },
    stepLabelInactive: { color: T.textMuted },
    journeyFooterRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    progressText: { fontSize: 11, color: T.textMuted, fontFamily: F.regular, textAlign: isRTL ? 'right' : 'left' },

    // Medals
    badgesGrid: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
    badgeItem: {
      backgroundColor: T.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8,
      alignItems: 'center', width: '47%', position: 'relative',
      borderWidth: 1, borderColor: T.border,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)', elevation: 2,
      minHeight: 210,
      justifyContent: 'flex-start',
    },
    badgeNameWrap: {
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    badgeDescWrap: {
      height: 42,
      justifyContent: 'flex-start',
      alignItems: 'center',
      width: '100%',
      marginTop: 4,
    },
    badgeItemLocked: { backgroundColor: T.surfaceAlt, borderColor: T.border, opacity: 0.85 },
    badgeIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    badgeName: { fontSize: 11, fontWeight: '700', color: T.text, fontFamily: F.bold, textAlign: 'center' },
    badgeDesc: { fontSize: 9, color: T.textMuted, marginTop: 4, fontFamily: F.regular, textAlign: 'center', lineHeight: 12 },
    badgeLockIcon: {
      position: 'absolute', top: 6,
      right: isRTL ? undefined : 6, left: isRTL ? 6 : undefined,
      backgroundColor: 'rgba(0,0,0,0.06)',
      width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },

    // Menu
    menuStack: {
      backgroundColor: T.surface, borderRadius: 14, overflow: 'hidden',
      boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.06)', elevation: 1, width: '100%',
    },
    menuRow: {
      backgroundColor: T.surface, paddingVertical: 15, paddingHorizontal: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    menuDivider: { height: 1, backgroundColor: T.border, marginLeft: isRTL ? 0 : 64, marginRight: isRTL ? 64 : 0 },
    menuLeft: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    menuIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.redLight },
    menuLabel: { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontSize: 14, fontWeight: '500', color: T.text, fontFamily: F.medium },
  }), [T, isRTL]);

  const roleName = user?.profileType === 'pro_health' ? t('Pro Contributor') : t('Pro Partner');
  const roleDesc = user?.profileType === 'pro_health'
    ? t('You are a verified health professional providing expert gluten-free guidance.')
    : t('You are a verified business supporting the gluten-free community.');

  return (
    <AppScaffold
      title={t('Profile')}
      activeTab="profile"
      rightIcon="bell-outline"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => navigation.navigate('SellerProProfile')}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scrollContent, { paddingBottom: bottomInset }]}>

        {/* ── Avatar + stats row ── */}
        <View style={s.headerSection}>
          <View style={s.avatarWrap}>
            <Image
              source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' }}
              style={s.avatar}
            />
            <View style={s.checkBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#FFFFFF" />
            </View>
          </View>

          <Text style={s.name}>{user?.fullName || 'Pro User'}</Text>

          <View style={s.statsRow}>
            <View style={s.roleBadgePill}>
              <Text style={s.roleBadgeText}>{roleName}</Text>
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.pointsBadgePill}>
              <MaterialCommunityIcons name="star" size={12} color={T.red} style={{ marginRight: 4 }} />
              <Text style={s.pointsBadgeText}>{points} XP</Text>
            </View>
            <TouchableOpacity
              style={[s.pointsBadgePill, isAlreadyCheckedIn && { borderColor: '#FFA000', backgroundColor: T.surfaceAlt }]}
              disabled={isAlreadyCheckedIn || checkingIn}
              onPress={handleCheckIn}
            >
              <MaterialCommunityIcons name="fire" size={12} color={isAlreadyCheckedIn ? '#FF5722' : T.textMuted} style={{ marginRight: 4 }} />
              <Text style={[s.pointsBadgeText, isAlreadyCheckedIn && { color: '#FF5722', fontWeight: '700' }]}>
                {checkingIn ? '...' : isAlreadyCheckedIn ? `${user?.streakDays || 0} ${t('days')}` : t('Check In')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.subTitle}>{user?.bio || t('Empowering the gluten-free community 🏆')}</Text>
        </View>

        {/* ── Your Role ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Role')}</Text>
          <View style={s.card}>
            <View style={s.roleIconBlock}>
              <Feather name="award" size={22} color={T.red} />
            </View>
            <View style={s.roleTextWrap}>
              <Text style={s.roleTitle}>{roleName}</Text>
              <Text style={s.roleSubtitle}>{roleDesc}</Text>
            </View>
          </View>
        </View>

        {/* ── Your Journey (dynamic) ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Journey')}</Text>
          <View style={s.journeyCard}>
            <View style={s.journeyGlow} />
            <View style={s.journeyHeaderRow}>
              <View style={s.journeyHeaderLeft}>
                <View style={s.journeyLevelPill}>
                  <MaterialCommunityIcons name="trophy-variant" size={12} color={T.red} />
                  <Text style={s.journeyLevelText}>{t('Level')} {activeIndex + 1}</Text>
                </View>
                <Text style={s.journeyLevelTitle}>{t(currentLevelLabel)}</Text>
              </View>
              <View style={s.journeyXpPill}>
                <MaterialCommunityIcons name={isMaxLevel ? 'crown' : 'rocket-launch'} size={12} color={T.red} />
                <Text style={s.journeyXpText}>{isMaxLevel ? t('Max Level') : `${pointsToNext} XP ${t('to next')}`}</Text>
              </View>
            </View>

            <View style={s.journeyProgressWrap}>
              <View style={s.journeyTrack}>
                <View style={[s.journeyTrackGlow, { width: `${progressPercent}%` }]} />
                <View style={[s.journeyTrackDone, { width: `${progressPercent}%` }]} />
              </View>
              <View style={s.journeyRow}>
                {PRO_JOURNEY_LEVELS.map((label, index) => {
                  const isCompleted = index < activeIndex;
                  const isActive = index === activeIndex;
                  return (
                    <View key={label} style={s.stepItem}>
                      <View style={s.stepNodeRow}>
                        <View style={[s.node, isActive ? s.nodeActive : isCompleted ? s.nodeCompleted : s.nodeInactive]}>
                          {isActive && <View style={s.nodeActiveCenter} />}
                          {isCompleted && !isActive && (
                            <MaterialCommunityIcons name="check" size={10} color={T.red} />
                          )}
                        </View>
                      </View>
                      <Text style={[
                        s.stepLabel,
                        isActive && s.stepLabelActive,
                        isCompleted && s.stepLabelCompleted,
                        !isCompleted && !isActive && s.stepLabelInactive,
                      ]}>
                        {t(label)}
                      </Text>
                      <Text style={[s.stepValue, (isActive || isCompleted) && { color: T.red }]}>
                        {PRO_THRESHOLDS[index]} XP
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={s.journeyFooterRow}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={T.red} />
            <Text style={s.progressText}>
              {isMaxLevel
                ? t('Max Level Reached!')
                : `${points} XP • ${pointsToNext} XP ${t('to')} ${t(nextLevelLabel || '')}`}
            </Text>
          </View>
        </View>

        {/* ── Your Medals ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Medals')}</Text>
          <View style={s.badgesGrid}>
            {PRO_BADGES.map((badge) => {
              const unlocked = isBadgeUnlocked(badge.pointsRequired);
              return (
                <View key={badge.id} style={[s.badgeItem, !unlocked && s.badgeItemLocked]}>
                  <View style={[s.badgeIconWrap, { backgroundColor: unlocked ? badge.bgColor : 'transparent' }]}>
                    <Image
                      source={badge.source}
                      style={[{ width: 72, height: 72 }, !unlocked ? { opacity: 0.4 } : undefined]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={s.badgeNameWrap}>
                    <Text style={s.badgeName} numberOfLines={2}>{t(badge.name)}</Text>
                  </View>
                  <View style={s.badgeDescWrap}>
                    <Text style={s.badgeDesc} numberOfLines={3}>{t(badge.description)}</Text>
                  </View>
                  {!unlocked && (
                    <View style={s.badgeLockIcon}>
                      <Feather name="lock" size={11} color={T.textMuted} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Seller actions ── */}
        <View style={s.menuStack}>
          <TouchableOpacity style={s.menuRow} onPress={() => navigation.navigate('ProductsMarket', { sellerId: user?._id })} id="pro-profile-products-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}><Feather name="shopping-bag" size={17} color={T.red} /></View>
              <Text style={s.menuLabel}>{t('My products')}</Text>
            </View>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={T.textMuted} />
          </TouchableOpacity>
          <View style={s.menuDivider} />
          <TouchableOpacity style={s.menuRow} onPress={() => navigation.navigate('SellerStats')} id="pro-profile-visibility-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}><Feather name="eye" size={17} color={T.red} /></View>
              <Text style={s.menuLabel}>{t('Visibility')}</Text>
            </View>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={T.textMuted} />
          </TouchableOpacity>
          <View style={s.menuDivider} />
          <TouchableOpacity style={s.menuRow} id="pro-profile-messages-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}><Feather name="message-square" size={17} color={T.red} /></View>
              <Text style={s.menuLabel}>{t('Clients messages')}</Text>
            </View>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Settings / Logout ── */}
        <View style={s.menuStack}>
          <TouchableOpacity style={s.menuRow} onPress={() => navigation.navigate('Settings')} id="pro-profile-settings-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}><Feather name="settings" size={17} color={T.red} /></View>
              <Text style={s.menuLabel}>{t('Settings')}</Text>
            </View>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={T.textMuted} />
          </TouchableOpacity>
          <View style={s.menuDivider} />
          <TouchableOpacity
            style={s.menuRow}
            onPress={() => navigation.navigate('Privacy')}
            id="pro-profile-privacy-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}><Feather name="shield" size={17} color={T.red} /></View>
              <Text style={s.menuLabel}>{t('Privacy & Security')}</Text>
            </View>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={T.textMuted} />
          </TouchableOpacity>
          <View style={s.menuDivider} />
          <TouchableOpacity style={s.menuRow} onPress={logout} id="pro-profile-logout-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}><Feather name="log-out" size={17} color={T.red} /></View>
              <Text style={s.menuLabel}>{t('Log out')}</Text>
            </View>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={17} color={T.textMuted} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </AppScaffold>
  );
}
