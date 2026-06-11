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
const PRO_JOURNEY_LEVELS = ['Learner', 'Supporter', 'Advocate', 'Champion', 'Guardian'];

const CELIAC_BADGES = [
  {
    id: 'bronze',
    name: 'Bronze Initiator',
    description: 'Unlock at 150 XP to start your journey.',
    pointsRequired: 150,
    source: require('../../../../../assets/badges/bronze.png') as ReturnType<typeof require>,
    color: '#CD7F32',
    bgColor: 'rgba(205, 127, 50, 0.12)',
  },
  {
    id: 'silver',
    name: 'Active Contributor',
    description: 'Unlock at 500 XP to showcase your contribution.',
    pointsRequired: 500,
    source: require('../../../../../assets/badges/silver.png') as ReturnType<typeof require>,
    color: '#A0AAB5',
    bgColor: 'rgba(160, 170, 181, 0.15)',
  },
  {
    id: 'gold',
    name: 'Gluten-Free Champion',
    description: 'Unlock at 2500 XP as the ultimate guardian.',
    pointsRequired: 2500,
    source: require('../../../../../assets/badges/gold.png') as ReturnType<typeof require>,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
];

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

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout, checkIn } = useAuth();
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
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
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
      boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.12)',
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
      boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
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
      backgroundColor: T.green,
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
      backgroundColor: T.greenLight,
      borderWidth: 1,
      borderColor: T.green,
    },
    journeyLevelText: {
      fontSize: 11,
      fontWeight: '600',
      color: T.green,
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
      backgroundColor: T.green,
      borderRadius: 6,
      opacity: 0.12,
    },
    journeyTrackDone: {
      position: 'absolute',
      left: isRTL ? undefined : 0,
      right: isRTL ? 0 : undefined,
      top: 0,
      height: 6,
      backgroundColor: T.green,
      borderRadius: 6,
    },
    journeyRow: {
      width: '100%',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 0,
    },
    stepItem: {
      width: '20%',
      alignItems: 'center',
    },
    stepNodeRow: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    node: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: T.surface,
    },
    nodeInactive: {
      borderColor: T.border,
    },
    nodeCompleted: {
      backgroundColor: T.surface,
      borderColor: T.green,
    },
    nodeActive: {
      backgroundColor: T.green,
      borderColor: T.surface,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
      elevation: 2,
    },
    nodeActiveCenter: {
      width: 8,
      height: 8,
      borderRadius: 4,
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
    stepValue: {
      marginTop: 2,
      fontSize: 9,
      color: T.textMuted,
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: F.medium,
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
      boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.06)',
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
    statsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 6,
    },
    pointsBadgePill: {
      backgroundColor: T.surface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: T.border,
    },
    pointsBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: T.text,
      fontFamily: F.semibold,
    },

    journeyFooterRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    progressText: {
      fontSize: 11,
      color: T.textMuted,
      fontFamily: F.regular,
      textAlign: isRTL ? 'right' : 'left',
    },

    badgesGrid: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 8,
      flexWrap: 'wrap',
      gap: 8,
    },
    badgeItem: {
      backgroundColor: T.surface,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: 'center',
      flex: 1,
      minWidth: 96,
      minHeight: 190,
      justifyContent: 'flex-start',
      position: 'relative',
      borderWidth: 1,
      borderColor: T.border,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      elevation: 2,
      overflow: 'hidden',
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
    badgeItemLocked: {
      backgroundColor: T.surfaceAlt,
      borderColor: T.border,
      opacity: 0.85,
    },
    badgeIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    badgeIconWrapLocked: {
      backgroundColor: 'transparent',
    },
    badgeName: {
      fontSize: 11,
      fontWeight: '700',
      color: T.text,
      fontFamily: F.bold,
      textAlign: 'center',
    },
    badgeDesc: {
      fontSize: 9,
      color: T.textMuted,
      marginTop: 4,
      fontFamily: F.regular,
      textAlign: 'center',
      lineHeight: 12,
    },
    badgeLockIcon: {
      position: 'absolute',
      top: 6,
      right: isRTL ? undefined : 6,
      left: isRTL ? 6 : undefined,
      backgroundColor: 'rgba(0,0,0,0.06)',
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [T, isRTL]);

  const [checkingIn, setCheckingIn] = React.useState(false);

  const points = user?.points || 0;
  const isPro = user?.profileType?.startsWith('pro_');

  const GENERAL_THRESHOLDS = [0, 150, 500, 1000, 2500];
  const PRO_THRESHOLDS = [0, 120, 300, 1000, 2500];

  const levels = isPro ? PRO_JOURNEY_LEVELS : JOURNEY_LEVELS;
  const thresholds = isPro ? PRO_THRESHOLDS : GENERAL_THRESHOLDS;

  let activeIndex = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) {
      activeIndex = i;
      break;
    }
  }

  // Calculate exact percentage along the 5-node timeline (4 segments)
  let progressPercent = 0;
  if (activeIndex >= levels.length - 1) {
    progressPercent = 100;
  } else {
    const currentThresh = thresholds[activeIndex];
    const nextThresh = thresholds[activeIndex + 1];
    const segmentProgress = (points - currentThresh) / (nextThresh - currentThresh);
    progressPercent = ((activeIndex + segmentProgress) / (levels.length - 1)) * 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));
  }

  const nextLevelPoints = activeIndex < levels.length - 1 ? thresholds[activeIndex + 1] : thresholds[activeIndex];
  const pointsToNext = nextLevelPoints - points;
  const currentLevelLabel = levels[activeIndex];
  const nextLevelLabel = activeIndex < levels.length - 1 ? levels[activeIndex + 1] : null;
  const isMaxLevel = activeIndex >= levels.length - 1;

  const roleName = user?.profileType === 'pro_commerce'
    ? t('Pro Partner')
    : user?.profileType === 'pro_health'
    ? t('Pro Contributor')
    : t('Gluten-Free Warrior');

  const roleDesc = user?.profileType === 'pro_commerce'
    ? t('You are a verified business supporting the gluten-free community.')
    : user?.profileType === 'pro_health'
    ? t('You are a verified health professional providing expert gluten-free guidance.')
    : t('You actively manage your gluten-free lifestyle and inspire others.');


  const lastCheckIn = user?.lastCheckInAt ? new Date(user.lastCheckInAt) : null;
  const isAlreadyCheckedIn = !!(lastCheckIn && lastCheckIn.toDateString() === new Date().toDateString());

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const pointsEarned = await checkIn();
      Alert.alert(
        t('Success'),
        `${t('Success! You earned points.')} +${pointsEarned} XP`
      );
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || t('Failed to check in');
      Alert.alert(t('Error'), errMsg);
    } finally {
      setCheckingIn(false);
    }
  };

  const currentBadges = isPro ? PRO_BADGES : CELIAC_BADGES;

  /**
   * A badge is unlocked if and only if the user has accumulated enough XP.
   * We do NOT use user.badges (populated DB objects) because:
   * 1. The backend seeds generic DB badges (pointsRequired: 10, 50, 100, 200)
   *    which don't correspond to the frontend's visual badge set.
   * 2. The previous fallback compared frontend badge id strings ('gold') against
   *    the DB badge icon field, which could cause false positives.
   */
  const isBadgeUnlocked = (badgeId: string): boolean => {
    const badge = currentBadges.find((b) => b.id === badgeId);
    if (!badge) return false;
    return points >= badge.pointsRequired;
  };

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
            <View style={[s.checkBadge, isPro && { backgroundColor: T.red }]}>
              <MaterialCommunityIcons 
                name={isPro ? "check-decagram" : "shield-check"}
                size={14} 
                color="#FFFFFF" 
              />
            </View>
          </View>

          <Text style={s.name}>{user?.fullName || 'Yassmine Cherif'}</Text>
          <View style={s.statsRow}>
            <View style={[s.roleBadgePill, isPro && { backgroundColor: T.redLight }]}>
              <Text style={[s.roleBadgeText, isPro && { color: T.red }]}>{roleName}</Text>
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.pointsBadgePill}>
              <MaterialCommunityIcons name="star" size={12} color={isPro ? T.red : T.green} style={{ marginRight: 4 }} />
              <Text style={s.pointsBadgeText}>{points} XP</Text>
            </View>
            <TouchableOpacity
              style={[
                s.pointsBadgePill,
                isAlreadyCheckedIn && { borderColor: '#FFA000', backgroundColor: T.surfaceAlt },
              ]}
              disabled={isAlreadyCheckedIn || checkingIn}
              onPress={handleCheckIn}
            >
              <MaterialCommunityIcons
                name="fire"
                size={12}
                color={isAlreadyCheckedIn ? '#FF5722' : T.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={[s.pointsBadgeText, isAlreadyCheckedIn && { color: '#FF5722', fontWeight: '700' }]}>
                {checkingIn ? '...' : isAlreadyCheckedIn ? `${user?.streakDays || 0} ${t('days')}` : t('Check In')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={s.subTitle}>{user?.bio || t('Living gluten-free for 12 years 🌿')}</Text>
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Role')}</Text>
          <View style={s.card}>
            <View style={[s.roleIconBlock, isPro && { backgroundColor: T.redLight }]}>
              <Feather name={isPro ? "award" : "shield"} size={22} color={isPro ? T.red : T.green} />
            </View>
            <View style={s.roleTextWrap}>
              <Text style={s.roleTitle}>{roleName}</Text>
              <Text style={s.roleSubtitle}>{roleDesc}</Text>
            </View>
          </View>
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{t('Your Journey')}</Text>
          <View style={s.journeyCard}>
            <View style={[s.journeyGlow, isPro && { backgroundColor: T.red }]} />
            <View style={s.journeyHeaderRow}>
              <View style={s.journeyHeaderLeft}>
                <View style={[s.journeyLevelPill, isPro && { backgroundColor: T.redLight, borderColor: T.red }]}>
                  <MaterialCommunityIcons name="trophy-variant" size={12} color={isPro ? T.red : T.green} />
                  <Text style={[s.journeyLevelText, isPro && { color: T.red }]}>
                    {t('Level')} {activeIndex + 1}
                  </Text>
                </View>
                <Text style={s.journeyLevelTitle}>{t(currentLevelLabel)}</Text>
              </View>
              <View style={[s.journeyXpPill, isPro && { backgroundColor: T.redLight, borderColor: T.red }]}>
                <MaterialCommunityIcons
                  name={isMaxLevel ? 'crown' : 'rocket-launch'}
                  size={12}
                  color={isPro ? T.red : T.green}
                />
                <Text style={[s.journeyXpText, isPro && { color: T.red }]}>
                  {isMaxLevel ? t('Max Level') : `${pointsToNext} XP ${t('to next')}`}
                </Text>
              </View>
            </View>

            <View style={s.journeyProgressWrap}>
              <View style={s.journeyTrack}>
                <View
                  style={[
                    s.journeyTrackGlow,
                    isPro && { backgroundColor: T.red },
                    { width: `${progressPercent}%` },
                  ]}
                />
                <View
                  style={[
                    s.journeyTrackDone,
                    isPro && { backgroundColor: T.red },
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>

              <View style={s.journeyRow}>
                {levels.map((label, index) => {
                  const isCompleted = index < activeIndex;
                  const isActive = index === activeIndex;

                  return (
                    <View key={label} style={s.stepItem}>
                      <View style={s.stepNodeRow}>
                        <View
                          style={[
                            s.node,
                            isActive ? s.nodeActive : isCompleted ? s.nodeCompleted : s.nodeInactive,
                            isActive && isPro && { backgroundColor: T.red },
                            isCompleted && isPro && { backgroundColor: T.surface, borderColor: T.red },
                          ]}
                        >
                          {isActive && <View style={s.nodeActiveCenter} />}
                          {isCompleted && !isActive && (
                            <MaterialCommunityIcons
                              name="check"
                              size={10}
                              color={isPro ? T.red : T.green}
                            />
                          )}
                        </View>
                      </View>

                      <Text
                        style={[
                          s.stepLabel,
                          isActive && s.stepLabelActive,
                          isCompleted && s.stepLabelCompleted,
                          !isCompleted && !isActive && s.stepLabelInactive,
                          isActive && isPro && { color: T.red },
                        ]}
                      >
                        {t(label)}
                      </Text>
                      <Text
                        style={[
                          s.stepValue,
                          (isActive || isCompleted) && { color: isPro ? T.red : T.green },
                        ]}
                      >
                        {thresholds[index]} XP
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={s.journeyFooterRow}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={isPro ? T.red : T.green} />
            <Text style={s.progressText}>
              {isMaxLevel
                ? t('Max Level Reached!')
                : `${points} XP • ${pointsToNext} XP ${t('to')} ${t(nextLevelLabel || '')}`}
            </Text>
          </View>
        </View>

        {/* Badges Grid Section */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>{isPro ? t('Your Medals') : t('Your Badges')}</Text>
          <View style={s.badgesGrid}>
            {currentBadges.map((badge) => {
              const isUnlocked = isBadgeUnlocked(badge.id);
              return (
                <View 
                  key={badge.id} 
                  style={[
                    s.badgeItem, 
                    isPro && { maxWidth: '48%' },
                    !isUnlocked && s.badgeItemLocked
                  ]}
                >
                  <View 
                    style={[
                      s.badgeIconWrap, 
                      isUnlocked ? { backgroundColor: badge.bgColor } : s.badgeIconWrapLocked,
                    ]}
                  >
                    <Image
                      source={badge.source}
                      style={[{ width: 60, height: 60 }, !isUnlocked ? { opacity: 0.35 } : undefined]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={s.badgeNameWrap}>
                    <Text style={s.badgeName} numberOfLines={2}>{t(badge.name)}</Text>
                  </View>
                  <View style={s.badgeDescWrap}>
                    <Text style={s.badgeDesc} numberOfLines={3}>{t(badge.description)}</Text>
                  </View>
                  
                  {!isUnlocked && (
                    <View style={s.badgeLockIcon}>
                      <Feather name="lock" size={11} color={T.textMuted} />
                    </View>
                  )}
                </View>
              );
            })}
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

          <TouchableOpacity
            style={s.menuRowCard}
            onPress={() => navigation.navigate('Privacy')}
            id="profile-privacy-btn"
          >
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


