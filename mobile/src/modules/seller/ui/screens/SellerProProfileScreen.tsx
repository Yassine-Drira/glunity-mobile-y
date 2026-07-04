import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { ReelsService, Reel } from '@/modules/reels/services/reels.service';
import { TokenStore } from '@/core/storage/secure-store';
import { Video, ResizeMode } from 'expo-av';
import { Platform } from 'react-native';

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

  const [activeProfileTab, setActiveProfileTab] = React.useState<'dashboard' | 'reels'>('dashboard');
  const [reels, setReels] = React.useState<Reel[]>([]);
  const [loadingReels, setLoadingReels] = React.useState(false);
  const [selectedReel, setSelectedReel] = React.useState<Reel | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editCaption, setEditCaption] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<'all' | 'recipes' | 'tips' | 'products' | 'lifestyle'>('all');
  const [updatingReel, setUpdatingReel] = React.useState(false);
  const [deletingReel, setDeletingReel] = React.useState(false);
  const [pendingDeleteReelId, setPendingDeleteReelId] = React.useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = React.useState<string | null>(null);
  const [modalVideoResizeMode, setModalVideoResizeMode] = React.useState<ResizeMode>(ResizeMode.COVER);

  const handleModalVideoReady = React.useCallback((event: any) => {
    const ns = event?.naturalSize;
    if (ns && ns.width > 0 && ns.height > 0) {
      const aspectRatio = ns.width / ns.height;
      const mode = aspectRatio < 0.85 ? ResizeMode.COVER : ResizeMode.CONTAIN;
      setModalVideoResizeMode(mode);
    }
  }, []);

  React.useEffect(() => {
    setModalVideoResizeMode(ResizeMode.COVER);
  }, [activeVideoUrl]);


  const fetchUserReels = async () => {
    if (!user) return;
    try {
      setLoadingReels(true);
      const res = await ReelsService.getUserReels(user._id);
      if (res.success && res.data) {
        setReels(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch user reels:', err);
    } finally {
      setLoadingReels(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchUserReels();
    }
  }, [user]);

  const handleUpdateReel = async () => {
    if (!selectedReel) return;
    try {
      setUpdatingReel(true);
      const res = await ReelsService.updateReel(selectedReel.id, {
        caption: editCaption,
        category: editCategory,
      });
      if (res.success) {
        Alert.alert(t('Success'), t('Reel updated successfully'));
        setIsEditModalOpen(false);
        setSelectedReel(null);
        fetchUserReels();
      }
    } catch (err: any) {
      Alert.alert(t('Error'), err?.message || t('Failed to update reel'));
    } finally {
      setUpdatingReel(false);
    }
  };

  const [pendingDeleteReelIdMessage, setPendingDeleteReelIdMessage] = React.useState<string | null>(null);

  const requestDeleteReel = async (reelId: string) => {
    try {
      const token = await TokenStore.getAccessToken();
      if (!token) {
        Alert.alert(t('Error'), t('Please log in to delete reels'));
        return;
      }
    } catch (e) {
      Alert.alert(t('Error'), t('Unable to verify authentication. Please log in.'));
      return;
    }

    setPendingDeleteReelIdMessage(t('This action cannot be undone. The reel will no longer be available.'));
    setPendingDeleteReelId(reelId);
  };

  const performDeleteReel = async (reelId: string | null) => {
    if (!reelId) return;
    try {
      setDeletingReel(true);
      const res = await ReelsService.deleteReel(reelId);
      if (res.success) {
        setIsStatsModalOpen(false);
        setSelectedReel(null);
        Alert.alert(t('Success'), t('Reel deleted successfully.'));
        DeviceEventEmitter.emit('reelDeleted', { reelId });
        fetchUserReels();
      }
    } catch (err: any) {
      if (err && err.code === 'NO_ACCESS_TOKEN') {
        Alert.alert(t('Error'), t('No access token available. Please log in.'));
      } else {
        Alert.alert(t('Error'), err?.message || t('Failed to delete reel'));
      }
    } finally {
      setDeletingReel(false);
      setPendingDeleteReelId(null);
      setPendingDeleteReelIdMessage(null);
    }
  };

  const s = React.useMemo(() => StyleSheet.create({
    tabBarContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      backgroundColor: T.surfaceAlt,
      borderRadius: 14,
      padding: 4,
      marginBottom: 16,
      width: '100%',
    },
    tabButton: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    tabButtonActive: {
      backgroundColor: T.surface,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
      elevation: 2,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: T.textMuted,
      fontFamily: F.medium,
    },
    tabButtonTextActive: {
      color: T.text,
      fontWeight: '600',
      fontFamily: F.semibold,
    },
    reelsHeaderRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    reelsHeaderTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: T.text,
      fontFamily: F.bold,
    },
    uploadReelBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.red,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    uploadReelText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      fontFamily: F.semibold,
    },
    reelsGrid: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
    },
    reelGridItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: T.surfaceAlt,
      position: 'relative',
    },
    reelThumbnail: {
      width: '100%',
      height: '100%',
    },
    viewsOverlay: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 2,
    },
    viewsOverlayText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '600',
    },
    reelOptionsBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.5)',
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      width: '100%',
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: T.text,
      marginTop: 12,
      fontFamily: F.semibold,
    },
    emptyStateSub: {
      fontSize: 13,
      color: T.textMuted,
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 16,
      paddingHorizontal: 24,
      fontFamily: F.regular,
    },
    createReelBtnLarge: {
      backgroundColor: T.red,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    createReelBtnLargeText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
      fontFamily: F.semibold,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    statsModalContent: {
      backgroundColor: T.surface,
      borderRadius: 20,
      width: '100%',
      maxWidth: 360,
      padding: 20,
      alignItems: 'center',
      boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
      elevation: 5,
    },
    statsModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: T.text,
      marginBottom: 16,
      fontFamily: F.bold,
    },
    statsPreviewRow: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: T.surfaceAlt,
      borderRadius: 12,
      padding: 10,
      marginBottom: 16,
      alignItems: 'center',
      gap: 12,
    },
    statsPreviewThumb: {
      width: 50,
      height: 70,
      borderRadius: 6,
    },
    statsPreviewInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    statsPreviewCaption: {
      fontSize: 13,
      color: T.text,
      fontWeight: '500',
      fontFamily: F.medium,
    },
    statsPreviewCat: {
      fontSize: 11,
      color: T.red,
      fontWeight: '600',
      marginTop: 4,
      fontFamily: F.semibold,
      textTransform: 'uppercase',
    },
    insightsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      width: '100%',
      marginBottom: 16,
    },
    insightCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: T.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    insightValue: {
      fontSize: 16,
      fontWeight: '700',
      color: T.text,
      marginTop: 4,
      fontFamily: F.bold,
    },
    insightLabel: {
      fontSize: 11,
      color: T.textMuted,
      marginTop: 2,
      fontFamily: F.regular,
    },
    engagementCard: {
      width: '100%',
      backgroundColor: T.redLight,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    engagementRateText: {
      fontSize: 24,
      fontWeight: '800',
      color: T.red,
      fontFamily: F.bold,
    },
    engagementLabel: {
      fontSize: 12,
      color: T.text,
      fontWeight: '600',
      marginTop: 4,
      fontFamily: F.semibold,
    },
    engagementBadge: {
      backgroundColor: T.red,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginTop: 6,
    },
    engagementBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    modalActionsColumn: {
      width: '100%',
      gap: 10,
    },
    modalActionBtn: {
      width: '100%',
      height: 44,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    modalActionBtnPrimary: {
      backgroundColor: T.red,
    },
    modalActionBtnSecondary: {
      backgroundColor: T.surfaceAlt,
      borderWidth: 1,
      borderColor: T.border,
    },
    modalActionBtnDanger: {
      backgroundColor: T.redLight,
    },
    modalActionBtnText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: F.semibold,
    },
    confirmMessage: {
      fontSize: 14,
      color: T.text,
      textAlign: 'center',
      marginBottom: 18,
      fontFamily: F.regular,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: T.textSub,
      alignSelf: 'flex-start',
      marginBottom: 6,
      fontFamily: F.semibold,
    },
    captionInput: {
      width: '100%',
      backgroundColor: T.surfaceAlt,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: T.text,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 16,
      fontFamily: F.regular,
    },
    catChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
      marginBottom: 20,
    },
    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.surface,
    },
    catChipActive: {
      borderColor: T.red,
      backgroundColor: T.redLight,
    },
    catChipText: {
      fontSize: 12,
      color: T.textSub,
      fontFamily: F.medium,
    },
    catChipTextActive: {
      color: T.red,
      fontWeight: '600',
      fontFamily: F.semibold,
    },
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
      onPressReels={() => navigation.navigate('ReelsFeed')}
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

        <View style={s.tabBarContainer}>
          <TouchableOpacity
            style={[s.tabButton, activeProfileTab === 'dashboard' && s.tabButtonActive]}
            onPress={() => setActiveProfileTab('dashboard')}
          >
            <Feather name="grid" size={18} color={activeProfileTab === 'dashboard' ? T.red : T.textMuted} />
            <Text style={[s.tabButtonText, activeProfileTab === 'dashboard' && s.tabButtonTextActive]}>
              {t('Dashboard')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabButton, activeProfileTab === 'reels' && s.tabButtonActive]}
            onPress={() => setActiveProfileTab('reels')}
          >
            <Feather name="video" size={18} color={activeProfileTab === 'reels' ? T.red : T.textMuted} />
            <Text style={[s.tabButtonText, activeProfileTab === 'reels' && s.tabButtonTextActive]}>
              {t('Reels')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeProfileTab === 'dashboard' ? (
          <>
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
          </>
        ) : (
          <View style={{ width: '100%' }}>
            <View style={s.reelsHeaderRow}>
              <Text style={s.reelsHeaderTitle}>
                {t('My Shared Reels')} ({reels.length})
              </Text>
              <TouchableOpacity
                style={s.uploadReelBtn}
                onPress={() => navigation.navigate('ReelCapture')}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={s.uploadReelText}>{t('Upload')}</Text>
              </TouchableOpacity>
            </View>

            {loadingReels ? (
              <ActivityIndicator style={{ marginVertical: 30 }} color={T.red} />
            ) : reels.length === 0 ? (
              <View style={s.emptyStateWrap}>
                <Feather name="video-off" size={48} color={T.textMuted} />
                <Text style={s.emptyStateTitle}>{t('No Reels Yet')}</Text>
                <Text style={s.emptyStateSub}>
                  {t('Share your gluten-free recipes, dining tips, or lifestyle moments with the community!')}
                </Text>
                <TouchableOpacity
                  style={s.createReelBtnLarge}
                  onPress={() => navigation.navigate('ReelCapture')}
                >
                  <Text style={s.createReelBtnLargeText}>{t('Create First Reel')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.reelsGrid}>
                {reels.map((reel) => (
                  <TouchableOpacity
                    key={reel.id}
                    style={s.reelGridItem}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedReel(reel);
                      setIsStatsModalOpen(true);
                    }}
                  >
                    <Image
                      source={{ uri: reel.thumbnailUrl }}
                      style={s.reelThumbnail}
                      resizeMode="cover"
                    />
                    <View style={s.viewsOverlay}>
                      <Feather name="play" size={10} color="#FFFFFF" />
                      <Text style={s.viewsOverlayText}>
                        {reel.viewsCount >= 1000 ? `${(reel.viewsCount / 1000).toFixed(1)}k` : reel.viewsCount}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.reelOptionsBtn}
                      onPress={() => {
                        setSelectedReel(reel);
                        setIsStatsModalOpen(true);
                      }}
                    >
                      <Feather name="more-vertical" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- STATS & ENGAGEMENT INSIGHTS MODAL --- */}
      <Modal
        visible={isStatsModalOpen && !!selectedReel}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsStatsModalOpen(false);
          setSelectedReel(null);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={[s.statsModalContent, { maxHeight: '90%' }]}>
            <Text style={s.statsModalTitle}>{t('Reel Insights')}</Text>
            
            {selectedReel && (
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ alignItems: 'center' }}
                showsVerticalScrollIndicator={false}
              >
                <View style={s.statsPreviewRow}>
                  <Image source={{ uri: selectedReel.thumbnailUrl }} style={s.statsPreviewThumb} />
                  <View style={s.statsPreviewInfo}>
                    <Text style={s.statsPreviewCaption} numberOfLines={2}>
                      {selectedReel.caption || t('No caption')}
                    </Text>
                    <Text style={[s.statsPreviewCat, { color: T.red }]}>
                      {selectedReel.category || 'all'}
                    </Text>
                  </View>
                </View>

                {/* Engagement Card */}
                <View style={[s.engagementCard, { backgroundColor: T.redLight }]}>
                  <Text style={[s.engagementRateText, { color: T.red }]}>
                    {((selectedReel.likesCount + selectedReel.commentsCount + selectedReel.sharesCount) / (selectedReel.viewsCount || 1) * 100).toFixed(1)}%
                  </Text>
                  <Text style={s.engagementLabel}>{t('Engagement Rate')}</Text>
                  <View style={[s.engagementBadge, { backgroundColor: T.red }]}>
                    <Text style={s.engagementBadgeText}>
                      {((selectedReel.likesCount + selectedReel.commentsCount + selectedReel.sharesCount) / (selectedReel.viewsCount || 1) * 100) > 12
                        ? t('🔥 High Engagement')
                        : t('📈 Active')}
                    </Text>
                  </View>
                </View>

                {/* Insights grid */}
                <View style={s.insightsGrid}>
                  <View style={s.insightCard}>
                    <Feather name="eye" size={16} color={T.textMuted} style={{ marginBottom: 4 }} />
                    <Text style={s.insightValue}>{selectedReel.viewsCount}</Text>
                    <Text style={s.insightLabel}>{t('Views')}</Text>
                  </View>
                  <View style={s.insightCard}>
                    <Feather name="heart" size={16} color={T.textMuted} style={{ marginBottom: 4 }} />
                    <Text style={s.insightValue}>{selectedReel.likesCount}</Text>
                    <Text style={s.insightLabel}>{t('Likes')}</Text>
                  </View>
                  <View style={s.insightCard}>
                    <Feather name="message-square" size={16} color={T.textMuted} style={{ marginBottom: 4 }} />
                    <Text style={s.insightValue}>{selectedReel.commentsCount}</Text>
                    <Text style={s.insightLabel}>{t('Comments')}</Text>
                  </View>
                  <View style={s.insightCard}>
                    <Feather name="share-2" size={16} color={T.textMuted} style={{ marginBottom: 4 }} />
                    <Text style={s.insightValue}>{selectedReel.sharesCount}</Text>
                    <Text style={s.insightLabel}>{t('Shares')}</Text>
                  </View>
                </View>

                {/* Actions column */}
                <View style={s.modalActionsColumn}>
                  <TouchableOpacity
                    style={[s.modalActionBtn, s.modalActionBtnPrimary, { backgroundColor: T.red }]}
                    onPress={() => {
                      setIsStatsModalOpen(false);
                      setActiveVideoUrl(selectedReel.videoUrl);
                    }}
                    disabled={deletingReel}
                  >
                    <Feather name="play" size={16} color="#FFFFFF" />
                    <Text style={[s.modalActionBtnText, { color: '#FFFFFF' }]}>{t('Play Reel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.modalActionBtn, s.modalActionBtnSecondary]}
                    onPress={() => {
                      setEditCaption(selectedReel.caption || '');
                      setEditCategory(selectedReel.category || 'all');
                      setIsStatsModalOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    disabled={deletingReel}
                  >
                    <Feather name="edit-2" size={16} color={T.text} />
                    <Text style={[s.modalActionBtnText, { color: T.text }]}>{t('Edit Caption & Category')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.modalActionBtn, s.modalActionBtnDanger]}
                    onPress={() => requestDeleteReel(selectedReel.id)}
                    disabled={deletingReel}
                  >
                    {deletingReel ? (
                      <ActivityIndicator size="small" color={T.red} />
                    ) : (
                      <>
                        <Feather name="trash-2" size={16} color={T.red} />
                        <Text style={[s.modalActionBtnText, { color: T.red }]}>{t('Delete Reel')}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.modalActionBtn, s.modalActionBtnSecondary, { marginTop: 4 }]}
                    onPress={() => {
                      setIsStatsModalOpen(false);
                      setSelectedReel(null);
                    }}
                    disabled={deletingReel}
                  >
                    <Text style={[s.modalActionBtnText, { color: T.text }]}>{t('Close')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Modal
        visible={!!pendingDeleteReelId}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeleteReelId(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.statsModalContent, { width: 320, padding: 20 }]}>
            <Text style={[s.statsModalTitle, { marginBottom: 8 }]}>{t('Delete Reel?')}</Text>
            <Text style={s.confirmMessage}>{pendingDeleteReelIdMessage}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                style={[s.modalActionBtn, { flex: 1, marginRight: 12 }]}
                onPress={() => setPendingDeleteReelId(null)}
                disabled={deletingReel}
              >
                <Text style={s.modalActionBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalActionBtn, s.modalActionBtnDanger, { flex: 1 }]}
                onPress={() => performDeleteReel(pendingDeleteReelId)}
                disabled={deletingReel}
              >
                {deletingReel ? <ActivityIndicator size="small" color={T.red} /> : <Text style={[s.modalActionBtnText, { color: T.red }]}>{t('Delete')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- EDIT REEL MODAL --- */}
      <Modal
        visible={isEditModalOpen && !!selectedReel}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsEditModalOpen(false);
          setSelectedReel(null);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.statsModalContent}>
            <Text style={s.statsModalTitle}>{t('Edit Reel')}</Text>

            <Text style={s.inputLabel}>{t('Caption')}</Text>
            <TextInput
              style={s.captionInput}
              value={editCaption}
              onChangeText={setEditCaption}
              multiline
              numberOfLines={3}
              placeholder={t('Write a caption...')}
              placeholderTextColor={T.textMuted}
            />

            <Text style={s.inputLabel}>{t('Category')}</Text>
            <View style={s.catChipsRow}>
              {(['all', 'recipes', 'tips', 'products', 'lifestyle'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.catChip,
                    editCategory === cat && s.catChipActive,
                    editCategory === cat && { borderColor: T.red, backgroundColor: T.redLight }
                  ]}
                  onPress={() => setEditCategory(cat)}
                >
                  <Text style={[
                    s.catChipText,
                    editCategory === cat && s.catChipTextActive,
                    editCategory === cat && { color: T.red }
                  ]}>
                    {t(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.modalActionsColumn}>
              <TouchableOpacity
                style={[s.modalActionBtn, s.modalActionBtnPrimary, { backgroundColor: T.red }]}
                onPress={handleUpdateReel}
                disabled={updatingReel}
              >
                {updatingReel ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <Text style={[s.modalActionBtnText, { color: '#FFFFFF' }]}>{t('Save Changes')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalActionBtn, s.modalActionBtnSecondary]}
                onPress={() => {
                  setIsEditModalOpen(false);
                  setSelectedReel(null);
                }}
              >
                <Text style={[s.modalActionBtnText, { color: T.text }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- FULL SCREEN REEL PLAYER MODAL --- */}
      {activeVideoUrl && (
        <Modal visible={true} transparent={false} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Video
              source={{ uri: activeVideoUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={modalVideoResizeMode}
              shouldPlay
              isLooping
              style={{ width: '100%', height: '100%' }}
              onReadyForDisplay={handleModalVideoReady}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: Math.max(insets.top, 20),
                right: 20,
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.5)',
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setActiveVideoUrl(null)}
            >
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </AppScaffold>
  );
}
