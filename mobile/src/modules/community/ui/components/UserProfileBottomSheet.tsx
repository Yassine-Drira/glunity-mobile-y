import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, Animated, PanResponder, Dimensions, TouchableOpacity, Image, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import http from '../../../../core/network/http.client';
import { useAuth } from '../../../auth/state/auth.context';

const BADGE_IMAGES: Record<string, any> = {
  bronze: require('../../../../../assets/badges/bronze.png'),
  silver: require('../../../../../assets/badges/silver.png'),
  gold: require('../../../../../assets/badges/gold.png'),
  pro_silver: require('../../../../../assets/badges/heromedaillesilver.png'),
  pro_gold: require('../../../../../assets/badges/heromedaillegold.png'),
};

interface UserProfileBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  theme: any;
  t: (key: string) => string;
  isDark: boolean;
  BlurView: any;
  onStartChat?: (targetUserId: string) => void;
}

export function UserProfileBottomSheet({
  visible,
  onClose,
  userId,
  theme: T,
  t,
  isDark,
  BlurView,
  onStartChat,
}: UserProfileBottomSheetProps) {
  const { user: currentUser } = useAuth();
  const screenHeight = Dimensions.get('window').height;
  const SHEET_HEIGHT = screenHeight * 0.72;

  const sheetAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const pan = useRef(new Animated.Value(0)).current;
  const overlayFallback = isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)';

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (visible && userId) {
      pan.setValue(0);
      Animated.timing(sheetAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      fetchProfile(userId);
    } else {
      setProfile(null);
    }
  }, [visible, userId]);

  const fetchProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await http.get(`/users/${id}`);
      if (res.data?.success && res.data?.data) {
        setProfile(res.data.data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.warn('[profile-sheet] failed to fetch profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) pan.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          handleClose();
        } else {
          Animated.timing(pan, { toValue: 0, duration: 220, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const getProfileTypeDetails = (type: string) => {
    switch (type) {
      case 'celiac':
        return { bg: '#FADBD8', dot: '#E74C3C', text: '#C0392B', label: t('Celiac') };
      case 'gluten_sensitive':
        return { bg: '#FDEBD0', dot: '#E67E22', text: '#D35400', label: t('Gluten Sensitive') };
      case 'allergy':
        return { bg: '#E8F8F5', dot: '#1ABC9C', text: '#16A085', label: t('Allergy') };
      case 'pro_commerce':
        return { bg: '#D4EFDF', dot: '#2ECC71', text: '#27AE60', label: t('Pro / Commerce') };
      default:
        return { bg: '#E5E8E8', dot: '#7F8C8D', text: '#5D6D7E', label: type };
    }
  };

  const getBadgeEmoji = (iconName: string) => {
    switch (iconName) {
      case 'award': return '🏆';
      case 'flame': return '🔥';
      case 'star': return '⭐';
      case 'shield': return '🛡️';
      case 'trophy': return '🏆';
      case 'heart': return '❤️';
      case 'checkmark-circle': return '✅';
      case 'flash': return '⚡';
      default: return '🏅';
    }
  };

  const isMe = currentUser && profile && String(currentUser._id || (currentUser as any).id) === String(profile._id || profile.id);

  // Derive levels & progress (100 points per level)
  const points = profile?.points || 0;
  const level = Math.floor(points / 100) + 1;
  const levelProgress = (points % 100) / 100;
  const pointsToNextLevel = 100 - (points % 100);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {BlurView ? (
        <Pressable onPress={handleClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        </Pressable>
      ) : (
        <Pressable onPress={handleClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: SHEET_HEIGHT,
          bottom: 0,
          backgroundColor: T.surface,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          paddingTop: 8,
          paddingHorizontal: 22,
          transform: [
            {
              translateY: Animated.add(
                sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SHEET_HEIGHT, 0],
                }),
                pan
              ),
            },
          ],
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.45 : 0.15,
          shadowRadius: 20,
          elevation: 24,
        }}
      >
        {/* Grabber Handle */}
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 44, height: 5, borderRadius: 2.5, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#DFDFDF' }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={T.green || '#8BC34A'} />
            <Text style={{ marginTop: 14, color: T.textMuted, fontSize: 14, fontFamily: 'Poppins_500Medium' }}>
              {t('Loading profile details...')}
            </Text>
          </View>
        ) : profile ? (
          <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
              
              {/* Profile Card Header */}
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <View style={{
                  position: 'relative',
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6
                }}>
                  <Image
                    source={{
                      uri:
                        profile.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || 'U')}&background=8BC34A&color=fff&size=150`,
                    }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      borderWidth: 3,
                      borderColor: T.green || '#8BC34A',
                    }}
                  />
                  {profile.onlineStatus === 'online' ? (
                    <View
                      style={{
                        position: 'absolute',
                        right: 3,
                        bottom: 3,
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: '#2ECC71',
                        borderWidth: 3,
                        borderColor: T.surface,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        position: 'absolute',
                        right: 3,
                        bottom: 3,
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: '#BDC3C7',
                        borderWidth: 3,
                        borderColor: T.surface,
                      }}
                    />
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 23,
                    fontWeight: '900',
                    color: T.text,
                    marginTop: 14,
                    fontFamily: 'Poppins_700Bold',
                  }}
                >
                  {profile.fullName}
                </Text>

                {/* Profile Type Badge */}
                {(() => {
                  const badge = getProfileTypeDetails(profile.profileType);
                  return (
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : badge.bg,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 20,
                        marginTop: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: badge.dot,
                      }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: badge.dot }} />
                      <Text
                        style={{
                          color: isDark ? '#fff' : badge.text,
                          fontWeight: '800',
                          fontSize: 12,
                          fontFamily: 'Poppins_600Medium',
                        }}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  );
                })()}

                {/* Calendar Member Date */}
                {memberSince && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                    <Ionicons name="calendar-outline" size={13} color={T.textMuted} />
                    <Text style={{ fontSize: 12, color: T.textMuted, fontFamily: 'Poppins_400Regular' }}>
                      {t('Member since')} {memberSince}
                    </Text>
                  </View>
                )}
              </View>

              {/* Levels & Gamification Progress Bar */}
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F5F8F6',
                  borderRadius: 16,
                  padding: 15,
                  marginVertical: 10,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: T.green || '#8BC34A', fontFamily: 'Poppins_700Bold', letterSpacing: 0.5 }}>
                    {t('LEVEL')} {level}
                  </Text>
                  <Text style={{ fontSize: 12, color: T.textMuted, fontFamily: 'Poppins_400Regular' }}>
                    {profile.points || 0} XP
                  </Text>
                </View>
                {/* Progress bar line */}
                <View style={{ height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E3E6E4', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${levelProgress * 100}%`, height: '100%', backgroundColor: T.green || '#8BC34A', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 6, fontFamily: 'Poppins_400Regular', textAlign: 'right' }}>
                  {pointsToNextLevel} XP {t('to next level')}
                </Text>
              </View>

              {/* Stats Cards Row */}
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                {/* Streak Card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FCF3EE',
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(230,126,34,0.08)',
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FDF2E9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 18 }}>🔥</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: T.text, fontFamily: 'Poppins_700Bold' }}>
                    {profile.streakDays || 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_400Regular', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                    {t('Days Streak')}
                  </Text>
                </View>

                {/* Score Card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#EAF2F8',
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(52,152,219,0.08)',
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EBF5FB', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 18 }}>✨</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: T.text, fontFamily: 'Poppins_700Bold' }}>
                    {profile.points || 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_400Regular', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                    {t('Total XP')}
                  </Text>
                </View>

                {/* Medals Card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#EAF2EB',
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(46,204,113,0.08)',
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E8F8F5', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 18 }}>🏆</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: T.text, fontFamily: 'Poppins_700Bold' }}>
                    {profile.badges?.length || 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_400Regular', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                    {t('Medals')}
                  </Text>
                </View>
              </View>

              {/* Biography Section */}
              <View style={{ marginVertical: 12 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: T.text,
                    marginBottom: 6,
                    fontFamily: 'Poppins_700Bold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  {t('Bio')}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: T.textMuted || '#7F8C8D',
                    fontFamily: 'Poppins_400Regular',
                    lineHeight: 22,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFCFA',
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  {profile.bio || t('This user has not set a bio yet.')}
                </Text>
              </View>

              {/* Medals & Badges Section */}
              <View style={{ marginVertical: 12 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: T.text,
                    marginBottom: 10,
                    fontFamily: 'Poppins_700Bold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  {t('Badges & Achievements')}
                </Text>

                {profile.badges && profile.badges.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {profile.badges.map((badge: any, index: number) => (
                      <View
                        key={badge._id || badge.id || index}
                        style={{
                          width: '48.4%', // Grid of 2 items with gap
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F9FBFB',
                          borderRadius: 16,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          alignItems: 'center',
                        }}
                      >
                        {BADGE_IMAGES[badge.icon] ? (
                          <Image
                            source={BADGE_IMAGES[badge.icon]}
                            style={{ width: 48, height: 48, marginBottom: 8 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={{ fontSize: 32, marginBottom: 6 }}>
                            {getBadgeEmoji(badge.icon)}
                          </Text>
                        )}
                        <Text
                          style={{
                            fontWeight: '700',
                            color: T.text,
                            fontSize: 13,
                            fontFamily: 'Poppins_600Medium',
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          {badge.name}
                        </Text>
                        <Text
                          style={{
                            color: T.textMuted,
                            fontSize: 11,
                            fontFamily: 'Poppins_400Regular',
                            marginTop: 4,
                            textAlign: 'center',
                            lineHeight: 14,
                          }}
                          numberOfLines={2}
                        >
                          {badge.description}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    style={{
                      padding: 24,
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : '#FAFDFB',
                      borderRadius: 16,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      borderColor: isDark ? '#333' : '#D5DDD8',
                    }}
                  >
                    <Ionicons name="medal-outline" size={36} color={T.textMuted} style={{ marginBottom: 8 }} />
                    <Text
                      style={{
                        color: T.textMuted,
                        fontSize: 13,
                        fontFamily: 'Poppins_400Regular',
                      }}
                    >
                      {t('No badges earned yet.')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Contact Button */}
              {!isMe && onStartChat && (
                <TouchableOpacity
                  onPress={() => {
                    handleClose();
                    onStartChat(profile._id || profile.id);
                  }}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: T.green || '#8BC34A',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderRadius: 16,
                    marginTop: 20,
                    gap: 8,
                    shadowColor: T.green || '#8BC34A',
                    shadowOpacity: 0.2,
                    shadowOffset: { width: 0, height: 6 },
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: '800',
                      fontSize: 15,
                      fontFamily: 'Poppins_600Medium',
                    }}
                  >
                    {t('Send Message')}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="warning-outline" size={48} color={T.textMuted} style={{ marginBottom: 12 }} />
            <Text style={{ color: T.text, fontWeight: '800', fontSize: 16, fontFamily: 'Poppins_700Bold' }}>
              {t('Profile not found')}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                marginTop: 18,
                paddingHorizontal: 22,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: T.surfaceAlt,
              }}
            >
              <Text style={{ color: T.text, fontWeight: '700', fontFamily: 'Poppins_600Medium' }}>
                {t('Close')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}
