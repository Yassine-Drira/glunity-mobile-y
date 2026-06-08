import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';

const CORE_API_URL = API_BASE_URL;

const getChannelVisual = (channelName: string) => {
  const name = (channelName || '').toLowerCase();
  if (name.includes('tips') || name.includes('tip') || name.includes('gf')) {
    return { icon: 'search-outline', unread: 3 };
  }
  if (name.includes('reviews') || name.includes('review')) {
    return { icon: 'star-outline', unread: 0 };
  }
  if (name.includes('begin')) {
    return { icon: 'leaf-outline', unread: 12 };
  }
  if (name.includes('store') || name.includes('restau')) {
    return { icon: 'storefront-outline', unread: 0 };
  }
  return { icon: 'chatbubbles-outline', unread: 0 };
};

const fallbackUsers = [
  { _id: '1', fullName: 'Yasmine Ben Salah', profileType: 'celiac', points: 1240, avatarUrl: 'https://randomuser.me/api/portraits/women/12.jpg', badges: [{ id: 'b1', name: 'Community Contributor' }] },
  { _id: '2', fullName: 'Rania Khelifi', profileType: 'proche', points: 980, avatarUrl: 'https://randomuser.me/api/portraits/women/23.jpg', badges: [{ id: 'b2', name: 'Gluten-Free Novice' }] },
  { _id: '3', fullName: 'Sami Trabelsi', profileType: 'pro_commerce', points: 750, avatarUrl: 'https://randomuser.me/api/portraits/men/34.jpg', badges: [{ id: 'b3', name: 'Master Baker' }] },
  { _id: '4', fullName: 'Ines Chaabane', profileType: 'pro_health', points: 620, avatarUrl: 'https://randomuser.me/api/portraits/women/45.jpg', badges: [] },
];

const badgeImageMap: { [key: string]: any } = {
  bronze: require('../../../../../assets/badges/bronze.png'),
  silver: require('../../../../../assets/badges/silver.png'),
  gold: require('../../../../../assets/badges/gold.png'),
  heromedaillegold: require('../../../../../assets/badges/heromedaillegold.png'),
  heromedaillesilver: require('../../../../../assets/badges/heromedaillesilver.png'),
  default: require('../../../../../assets/badges/Frame.png'),
};

export default function CommunityJoin({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [creatingChannelFor, setCreatingChannelFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await TokenStore.getAccessToken();
        // Try to fetch users list — if API doesn't support it, fallback to seeded data
        try {
          const res = await axios.get(`${CORE_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
          setUsers(res.data?.data || fallbackUsers);
        } catch (e) {
          setUsers(fallbackUsers);
        }
      } catch (err) {
        setUsers(fallbackUsers);
      } finally {
        setLoadingUsers(false);
      }
    })();

    (async () => {
      try {
        const token = await TokenStore.getAccessToken();
        const res = await axios.get(`${CORE_API_URL}/channels`, { headers: { Authorization: `Bearer ${token}` } });
        setChannels(res.data?.data || []);
      } catch (err) {
        setChannels([]);
      } finally {
        setLoadingChannels(false);
      }
    })();
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider, backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 20, fontWeight: '700', color: T.text },
    skipText: { color: T.textMuted, fontSize: 14, paddingHorizontal: 8 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: T.textMuted, marginTop: 12, marginBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase' },
    // Channel explore styles (matching TempCommunityMessaging)
    spaceCard: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 6,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1.5,
    },
    spaceIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 },
    spaceTitle: { fontSize: 15.5, fontWeight: '700', color: T.text },
    spaceSubtext: { fontSize: 12.5, color: T.textMuted, marginTop: 3 },
    spaceBadge: { backgroundColor: T.green, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, position: 'absolute', right: isRTL ? undefined : 16, left: isRTL ? 16 : undefined },
    spaceBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },
    userCardWrap: { width: 220, marginHorizontal: 12 },
    userCard: { backgroundColor: T.surface, borderRadius: 16, padding: 16, alignItems: 'flex-start', shadowColor: T.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    avatarWrap: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', borderWidth: 4, borderColor: T.surface, justifyContent: 'center', alignItems: 'center', backgroundColor: T.surfaceAlt },
    avatarImage: { width: 80, height: 80, borderRadius: 40 },
    statusDot: { position: 'absolute', right: 8, bottom: 8, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: T.surface, backgroundColor: T.green },
    name: { fontSize: 18, fontWeight: '800', color: T.text, marginTop: 8 },
    metaRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    metaText: { fontSize: 13, color: T.textMuted },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: T.divider, width: '100%', marginVertical: 12 },
    badgeRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
    badgeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
    badgeText: { fontSize: 13, color: T.textMuted, marginLeft: 8 },
    contactBtn: { marginTop: 14, backgroundColor: T.greenLight, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
    contactBtnText: { color: T.green, fontWeight: '800', fontSize: 16 },
    channelItem: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: T.divider, backgroundColor: T.surface },
    channelName: { fontSize: 16, fontWeight: '700', color: T.text, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 },
  }), [T, isRTL]);

  async function contactUser(targetUserId: string) {
    setCreatingChannelFor(targetUserId);
    try {
      const token = await TokenStore.getAccessToken();
      const res = await axios.post(`${CORE_API_URL}/channels/direct`, { userId: targetUserId }, { headers: { Authorization: `Bearer ${token}` } });
      const channel = res.data?.data;
      // Navigate to the messaging screen if available; fallback to TempCommunityMessaging
      if (channel) {
        navigation.navigate('CommunityChat', { initialChannel: channel });
      }
    } catch (err) {
      console.error('[community] Failed to create direct channel', err);
    } finally {
      setCreatingChannelFor(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MessagingHome') }>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Explore Users</Text>
      {loadingUsers ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
        <FlatList
          horizontal
          data={users}
          keyExtractor={(i) => i._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <View style={styles.userCardWrap}>
              <View style={styles.userCard}>
                <View style={{ alignSelf: 'center' }}>
                  <View style={styles.avatarWrap}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarImage} />
                    )}
                    <View style={styles.statusDot} />
                  </View>
                </View>

                <Text style={styles.name}>{item.fullName}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="leaf-outline" size={16} color={T.green} />
                  <Text style={styles.metaText}>{item.profileType}</Text>
                  <View style={{ width: 6 }} />
                  <Text style={styles.metaText}>•</Text>
                  <View style={{ width: 6 }} />
                  <Text style={styles.metaText}>{item.points ?? 0} XP</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.badgeRow}>
                  {item.badges && item.badges.length ? (
                    <>
                      <Image source={ badgeImageMap[item.badges[item.badges.length - 1].icon] || badgeImageMap.default } style={{ width: 36, height: 36, borderRadius: 8 }} />
                      <Text style={styles.badgeText}>{item.badges[item.badges.length - 1].name}</Text>
                    </>
                  ) : (
                    <>
                      <Image source={badgeImageMap.default} style={{ width: 36, height: 36, borderRadius: 8 }} />
                      <Text style={styles.badgeText}>No badge yet</Text>
                    </>
                  )}
                </View>

                <TouchableOpacity style={styles.contactBtn} onPress={() => contactUser(item._id)} disabled={creatingChannelFor === item._id}>
                  <Ionicons name="mail-outline" size={18} color={T.green} />
                  {creatingChannelFor === item._id ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.contactBtnText}>Contact</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Text style={styles.sectionTitle}>Channels</Text>
      {loadingChannels ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : (
            <FlatList
              data={channels}
          keyExtractor={(c) => c.id || c._id}
          renderItem={({ item }) => {
            const isDM = item.name && item.name.startsWith('DM-');
            const displayName = item.name || item.description || 'Channel';
            const visual = getChannelVisual(item.name);
            const iconName = isDM ? 'person-outline' : visual.icon;
            const subtext = isDM ? 'Direct Message' : (item.description || 'Welcome to this space! Tap to read.');
            const unreadCount = isDM ? 0 : visual.unread;

            return (
              <TouchableOpacity style={[styles.spaceCard, { paddingVertical: 12 }]} onPress={() => navigation.navigate('CommunityChat', { initialChannel: item })}>
                <View style={[styles.spaceIconContainer, { backgroundColor: T.surfaceAlt }]}> 
                  <Ionicons name={iconName as any} size={20} color={T.text} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.spaceTitle}>{displayName}</Text>
                    <Text style={{ color: T.textMuted, fontSize: 12 }}>09:30 AM</Text>
                  </View>
                  <Text style={styles.spaceSubtext} numberOfLines={1}>{subtext}</Text>
                </View>
                {unreadCount > 0 && (
                  <View style={{ marginLeft: 8 }}>
                    <View style={styles.spaceBadge}>
                      <Text style={styles.spaceBadgeText}>{unreadCount}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
