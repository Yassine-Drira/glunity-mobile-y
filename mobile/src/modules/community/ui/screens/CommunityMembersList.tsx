import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  Modal, 
  Platform 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import http from '../../../../core/network/http.client';
import messagingHttp from '../../../../core/network/messaging-http.client';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { Ionicons } from '@expo/vector-icons';

const CORE_API_URL = API_BASE_URL;

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

const getRoleBadge = (role: string, t: (s: string) => string) => {
  switch (role) {
    case 'owner':
      return { text: t('Owner') || 'Owner', color: '#2ECC71', dot: '🟢' };
    case 'writer':
      return { text: t('Writer') || 'Writer', color: '#3498DB', dot: '🔵' };
    default:
      return { text: t('Reader') || 'Reader', color: '#95A5A6', dot: '⚪' };
  }
};

// ── Virtualized Item Component ───────────────────────────────────────────────
const MemberRowItem = React.memo(({ item, onSelect, T, t }: any) => {
  const badge = getRoleBadge(item.role, t);
  const avatarUri = item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff`;

  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onSelect(item);
      }}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: pressed ? (Platform.OS === 'ios' ? 'rgba(0,0,0,0.03)' : 'transparent') : 'transparent',
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <Image 
        source={{ uri: avatarUri }} 
        style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }} 
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: T.text, fontWeight: '700', fontSize: 15 }}>{item.fullName || item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: badge.color, fontSize: 12, fontWeight: '600' }}>
            {badge.dot} {badge.text}
          </Text>
          {item.createdAt && (
            <Text style={{ color: T.textMuted, fontSize: 11, marginLeft: 8 }}>
              • {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="ellipsis-horizontal" size={18} color={T.textMuted} />
    </Pressable>
  );
});

// ── Main Screen Component ───────────────────────────────────────────────────
export default function CommunityMembersList({ route, navigation }: any) {
  const { channelId } = route.params || {};
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { t } = useLanguage();
  const isDark = T.dark || false;

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await messagingHttp.get(`/channels/${channelId}`);
      const ch = res.data?.data || res.data;
      if (ch) {
        const rawParticipants = ch.participants || ch.members || [];
        const participantIds = rawParticipants.map((p: any) => String(p.userId || p._id || p.id));
        
        if (participantIds.length > 0) {
          // Batch fetch profiles
          const ures = await http.post(`${CORE_API_URL}/users/batch`, { ids: participantIds });
          const users = ures.data?.data || ures.data || [];
          
          const ms = users.map((u: any) => {
            const part = rawParticipants.find((p: any) => String(p.userId || p._id || p.id) === String(u._id || u.id));
            return {
              _id: u._id || u.id,
              fullName: u.fullName || u.name || u.displayName,
              avatarUrl: u.avatarUrl || u.avatar,
              role: part?.role || 'member',
              createdAt: u.createdAt || u.created_at,
              isActive: u.isActive
            };
          });
          
          // Sort: Owner -> Writers -> Readers
          const roleOrder: { [key: string]: number } = { owner: 0, admin: 1, writer: 2, member: 3 };
          ms.sort((a: any, b: any) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
          
          setMembers(ms);
          return;
        }
      }
      setMembers([]);
    } catch (err) {
      console.warn('fetchMembers failed', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [channelId]);

  // Derive roles
  const myMemberEntry = useMemo(() => {
    return members.find(m => String(m._id) === String(user?._id));
  }, [members, user?._id]);

  const myRole = myMemberEntry?.role || 'member';
  const hasModerationRights = myRole === 'owner' || myRole === 'admin';

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      (m.fullName || m.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const handleSelectMember = useCallback((member: any) => {
    setSelectedMember(member);
    setSheetVisible(true);
  }, []);

  const handleBan = () => {
    if (!selectedMember) return;
    const targetId = selectedMember._id;
    const targetName = selectedMember.fullName;
    
    Alert.alert(
      t('Ban Member') || 'Ban Member',
      `${t('Ban this member?') || 'Ban this member?'} ${t('This member will immediately lose access to the channel.') || 'This member will immediately lose access to the channel.'}`,
      [
        { text: t('Cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('Ban') || 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              setSheetVisible(false);
              setLoading(true);
              await messagingHttp.post(`/channels/${channelId}/members/${targetId}/ban`);
              Alert.alert(t('Success') || 'Success', `${targetName} has been banned.`);
              await fetchMembers();
            } catch (err) {
              console.warn('banMember failed', err);
              Alert.alert(t('Error') || 'Error', t('Failed to ban member') || 'Failed to ban member');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRoleChange = async (newRole: 'writer' | 'member') => {
    if (!selectedMember) return;
    const targetId = selectedMember._id;
    try {
      setSheetVisible(false);
      setLoading(true);
      await messagingHttp.patch(`/channels/${channelId}/participants/${targetId}/role`, { role: newRole });
      await fetchMembers();
    } catch (err) {
      console.warn('roleChange failed', err);
      Alert.alert(t('Error') || 'Error', t('Failed to update member role') || 'Failed to update member role');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (!selectedMember) return;
    setSheetVisible(false);
    navigation.navigate('Profile', { userId: selectedMember._id });
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <MemberRowItem item={item} onSelect={handleSelectMember} T={T} t={t} />
  ), [handleSelectMember, T, t]);

  const selectedBadge = selectedMember ? getRoleBadge(selectedMember.role, t) : null;
  const selectedAvatar = selectedMember?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember?.fullName || 'U')}&background=8BC34A&color=fff`;

  // Dynamic Styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: T.bg,
    },
    header: {
      height: 64,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.divider,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      marginLeft: 8,
      color: T.text,
    },
    searchContainer: {
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: isDark ? '#2C3E50' : '#F2F4F4', 
      borderRadius: 12, 
      paddingHorizontal: 12, 
      margin: 16, 
      height: 44 
    },
    searchInput: {
      flex: 1, 
      color: T.text, 
      fontSize: 15, 
      paddingVertical: 8 
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: T.surface || (isDark ? '#1C2833' : '#FFFFFF'),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 44 : 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 5,
    },
    sheetHandle: {
      width: 36,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: T.divider || 'rgba(0,0,0,0.1)',
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    sheetHeader: {
      alignItems: 'center',
      paddingBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.divider,
      marginBottom: 16,
    },
    sheetAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      marginBottom: 12,
    },
    sheetUsername: {
      fontSize: 18,
      fontWeight: '800',
      color: T.text,
      marginBottom: 4,
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      marginVertical: 4,
    },
    sheetOptionIcon: {
      marginRight: 14,
      width: 24,
      alignItems: 'center',
    },
    sheetOptionText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Membres') || 'Members'}</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={T.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          placeholder={t('Search members...') || 'Search members...'}
          placeholderTextColor={T.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={16} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Total Count */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: T.textMuted }}>
          {t('Members count') || 'Members count'}: {members.length}
        </Text>
      </View>

      {/* Scrollable Members List */}
      {loading && members.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={filteredMembers} 
          keyExtractor={(i) => String(i._id || i.id)} 
          renderItem={renderItem}
          initialNumToRender={12}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

      {/* Modern Bottom Actions Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setSheetVisible(false)}
        >
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            
            {/* Header info */}
            {selectedMember && (
              <View style={styles.sheetHeader}>
                <Image source={{ uri: selectedAvatar }} style={styles.sheetAvatar} />
                <Text style={styles.sheetUsername}>{selectedMember.fullName}</Text>
                {selectedBadge && (
                  <Text style={{ color: selectedBadge.color, fontWeight: '700', fontSize: 13 }}>
                    {selectedBadge.dot} {selectedBadge.text}
                  </Text>
                )}
              </View>
            )}

            {/* Actions list */}
            {selectedMember && (
              <View>
                {selectedMember.role === 'owner' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Ionicons name="shield-checkmark" size={24} color="#2ECC71" style={{ marginBottom: 6 }} />
                    <Text style={{ color: T.textMuted, fontSize: 14, fontWeight: '500' }}>
                      {String(selectedMember._id) === String(user?._id)
                        ? t('You are the owner.') || 'You are the owner.'
                        : t('This member is the channel owner.') || 'This member is the channel owner.'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Role Updates */}
                    {hasModerationRights && selectedMember.role === 'member' && (
                      <TouchableOpacity 
                        style={styles.sheetOption} 
                        onPress={() => handleRoleChange('writer')}
                      >
                        <View style={styles.sheetOptionIcon}>
                          <Ionicons name="create-outline" size={22} color={T.green || '#8BC34A'} />
                        </View>
                        <Text style={[styles.sheetOptionText, { color: T.text }]}>
                          {t('Give Write Permission') || 'Give Write Permission'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {hasModerationRights && selectedMember.role === 'writer' && (
                      <TouchableOpacity 
                        style={styles.sheetOption} 
                        onPress={() => handleRoleChange('member')}
                      >
                        <View style={styles.sheetOptionIcon}>
                          <Ionicons name="eye-outline" size={22} color="#F39C12" />
                        </View>
                        <Text style={[styles.sheetOptionText, { color: T.text }]}>
                          {t('Remove Write Permission') || 'Remove Write Permission'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Ban option */}
                    {hasModerationRights && (
                      <TouchableOpacity 
                        style={styles.sheetOption} 
                        onPress={handleBan}
                      >
                        <View style={styles.sheetOptionIcon}>
                          <Ionicons name="ban-outline" size={22} color="#E74C3C" />
                        </View>
                        <Text style={[styles.sheetOptionText, { color: '#E74C3C' }]}>
                          {t('Ban Member') || 'Ban Member'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* View Profile */}
                <TouchableOpacity 
                  style={styles.sheetOption} 
                  onPress={handleViewProfile}
                >
                  <View style={styles.sheetOptionIcon}>
                    <Ionicons name="person-outline" size={22} color={T.text} />
                  </View>
                  <Text style={[styles.sheetOptionText, { color: T.text }]}>
                    {t('View Profile') || 'View Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
