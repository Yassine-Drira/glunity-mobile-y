import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '@/shared/components/BottomNavBar';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

const C = {
  bg: '#F6F5F3',
  white: '#FFFFFF',
  dark: '#2E2E2E',
  muted: '#888888',
  mutedLight: '#BBBBBB',
  green: '#8BC34A',
  greenTint: '#E8F5E9',
  lineInactive: '#D0D0D0',
  lineTrack: '#E0E0E0',
  rowDivider: '#F0F0F0',
  red: '#C8102E',
};

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
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 8);
  const mascotImage = require('../../../../../assets/Logo/image 3.png');

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.topHeader}>
        <View style={s.topHeaderSpacer} />
        <Text style={s.topHeaderTitle}>Profile</Text>
        <TouchableOpacity style={s.topHeaderBell} id="profile-header-bell-btn">
          <Feather name="bell" size={22} color={C.dark} />
        </TouchableOpacity>
      </View>

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
              <Feather name="check" size={12} color={C.white} />
            </View>
          </View>

          <Text style={s.name}>{user?.fullName || 'Yassmine Cherif'}</Text>
          <View style={s.roleBadgePill}>
            <Text style={s.roleBadgeText}>Gluten-Free Warrior</Text>
          </View>
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>Your Role</Text>
          <View style={s.card}>
            <View style={s.roleIconBlock}>
              <Feather name="shield" size={22} color={C.green} />
            </View>
            <View style={s.roleTextWrap}>
              <Text style={s.roleTitle}>Gluten-Free Warrior</Text>
              <Text style={s.roleSubtitle}>
                You actively manage your gluten-free lifestyle and inspire others.
              </Text>
            </View>
          </View>
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>Your Journey</Text>
          <View style={s.journeyCard}>
            <View style={s.journeyTrack}>
              <View style={s.journeyTrackDone} />
            </View>

            <View style={s.journeyRow}>
            {JOURNEY_LEVELS.map((label, index) => {
              const isCompleted = index < ACTIVE_INDEX;
              const isActive = index === ACTIVE_INDEX;

              return (
                <View key={label} style={s.stepItem}>
                  <View style={s.stepNodeRow}>
                    <View
                      style={[
                        s.node,
                        isCompleted && s.nodeDone,
                        !isCompleted && !isActive && s.nodeInactive,
                        isActive && s.nodeActive,
                      ]}
                    >
                      {isActive && <View style={s.nodeActiveCenter} />}
                    </View>
                  </View>

                  <Text
                    style={[
                      s.stepLabel,
                      isActive && s.stepLabelActive,
                      !isCompleted && !isActive && s.stepLabelInactive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
            </View>
          </View>
        </View>

        <View style={s.bannerCard}>
          <Image source={mascotImage} style={s.bannerMascotImage} resizeMode="contain" />
          <Text style={s.bannerText}>Every action makes the ecosystem stronger.</Text>
        </View>

        <View style={s.menuStack}>
          <TouchableOpacity
            style={s.menuRowCard}
            onPress={() => navigation.navigate('Settings')}
            id="profile-settings-btn"
          >
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="settings" size={18} color={C.red} />
              </View>
              <Text style={s.menuLabel}>Settings</Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.mutedLight} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity style={s.menuRowCard} id="profile-privacy-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="shield" size={18} color={C.red} />
              </View>
              <Text style={s.menuLabel}>Privacy & Security</Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.mutedLight} />
          </TouchableOpacity>

          <View style={s.menuDivider} />

          <TouchableOpacity style={s.menuRowCard} onPress={logout} id="profile-logout-btn">
            <View style={s.menuLeft}>
              <View style={s.menuIconCircle}>
                <Feather name="log-out" size={18} color={C.red} />
              </View>
              <Text style={s.menuLabel}>Log out</Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.mutedLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNavBar
        activeTab="profile"
        idPrefix="profile-nav"
        onPressHome={() => navigation.navigate('Home')}
        onPressEvents={() => {}}
        onPressCenter={() => {}}
        onPressReels={() => {}}
        onPressProfile={() => navigation.navigate('Profile')}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    rowGap: 12,
  },

  topHeader: {
    flexDirection: 'row',
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
    color: C.dark,
    fontFamily: F.semibold,
  },
  topHeaderBell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.white,
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
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: C.green,
  },
  checkBadge: {
    position: 'absolute',
    right: -2,
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.white,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: C.dark,
    marginTop: 12,
    marginBottom: 6,
    fontFamily: F.semibold,
  },
  roleBadgePill: {
    backgroundColor: 'rgba(139,195,74,0.15)',
    borderRadius: 999,
    minWidth: 124,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: F.medium,
  },

  sectionWrap: {
    rowGap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '400',
    marginBottom: 4,
    marginTop: 8,
    fontFamily: F.regular,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },

  roleIconBlock: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,195,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  roleTextWrap: {
    flex: 1,
    paddingTop: 0,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
    color: C.dark,
    fontFamily: F.semibold,
  },
  roleSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    fontFamily: F.regular,
  },

  journeyCard: {
    position: 'relative',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  journeyTrack: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 24,
    height: 3,
    backgroundColor: C.lineTrack,
    borderRadius: 2,
  },
  journeyTrackDone: {
    width: '50%',
    height: 3,
    backgroundColor: C.green,
    borderRadius: 2,
  },
  journeyRow: {
    width: '100%',
    flexDirection: 'row',
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
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.lineInactive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  nodeDone: {
    backgroundColor: C.green,
  },
  nodeInactive: {
    backgroundColor: C.lineInactive,
  },
  nodeActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: 'rgba(139,195,74,0.4)',
  },
  nodeActiveCenter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.green,
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 9,
    color: C.muted,
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: F.regular,
  },
  stepLabelActive: {
    color: C.green,
    fontWeight: '600',
    fontSize: 9,
    fontFamily: F.semibold,
  },
  stepLabelInactive: {
    color: C.muted,
  },

  bannerCard: {
    backgroundColor: C.greenTint,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerMascotImage: {
    width: 56,
    height: 56,
  },
  bannerText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: C.dark,
    fontFamily: F.medium,
  },

  menuStack: {
    backgroundColor: C.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  menuRowCard: {
    backgroundColor: C.white,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuDivider: {
    height: 1,
    backgroundColor: C.rowDivider,
    marginLeft: 64,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,16,46,0.08)',
  },
  menuLabel: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: C.dark,
    fontFamily: F.medium,
  },

});
