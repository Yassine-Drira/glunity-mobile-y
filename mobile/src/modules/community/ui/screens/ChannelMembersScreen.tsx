import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Platform, TextInput } from 'react-native';
import http from '../../../../core/network/http.client';
import messagingHttp from '../../../../core/network/messaging-http.client';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { resolveMessagingServiceUrl } from '../../../../core/network/messaging-service-url';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmationModal } from '../components/ConfirmationModal';
import InfoModal from '../components/InfoModal';

// Optional native BlurView
let BlurView: any = null;
try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }

const CORE_API_URL = API_BASE_URL;
const MSG_SERVICE_URL = resolveMessagingServiceUrl(API_BASE_URL);

// Gets clean 1 or 2 letter initials
const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function ChannelMembersScreen({ route, navigation }: any) {
  const { channelId } = route.params || {};
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const [members, setMembers] = useState<any[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m =>
      m.fullName?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const fetchMembersAndChannel = async () => {
    setLoading(true);
    try {
      // 1. Fetch channel details to know participants structure
      const chRes = await messagingHttp.get(`/channels/${channelId}`);
      const chData = chRes.data?.data || chRes.data;
      setChannel(chData);

      const rawParticipants = chData?.participants || [];
      if (rawParticipants.length > 0) {
        // Resolve user ids to user profiles (names, avatars)
        const ids = rawParticipants.map((m: any) => String(m.userId || m._id || m.id));
        const ures = await http.get(`${CORE_API_URL}/users?ids=${encodeURIComponent(ids.join(','))}`);
        const users = ures.data?.data || ures.data || [];

        // Merge profiles with their participant roles
        const merged = rawParticipants.map((part: any) => {
          const uProfile = users.find((u: any) => String(u._id || u.id) === String(part.userId));
          return {
            _id: part.userId,
            fullName: uProfile?.fullName || uProfile?.name || 'Anonymous User',
            avatarUrl: uProfile?.avatarUrl || uProfile?.avatar || null,
            role: part.role || 'member',
          };
        });

        setMembers(merged);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.warn('fetchMembers failed', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersAndChannel();
  }, [channelId]);

  const isOwner = useMemo(() => {
    if (!channel || !user) return false;
    return String(channel.createdById) === String(user._id) || channel.myRole === 'owner';
  }, [channel, user]);

  const overlayFallback = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)';
  const modalBg = isDark ? 'rgba(10,10,10,0.6)' : 'rgba(255,255,255,0.88)';

  const showAlert = (title: string, msg: string) => {
    setInfoTitle(title);
    setInfoMessage(msg);
    setInfoVisible(true);
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'writer' | 'member') => {
    setActionLoading(targetUserId);
    try {
      const res = await messagingHttp.patch(`/channels/${channelId}/participants/${targetUserId}/role`, { role: newRole });

      // Update local state role
      setMembers(prev => prev.map(m =>
        String(m._id) === String(targetUserId) ? { ...m, role: newRole } : m
      ));

      showAlert(t('Success'), t('Member role updated successfully'));
    } catch (err: any) {
      console.warn('handleRoleChange failed', err);
      showAlert(t('Error'), err?.response?.data?.error || t('Failed to update role'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    const performRemove = async () => {
      setActionLoading(targetUserId);
      try {
        await messagingHttp.delete(`/channels/${channelId}/members/${targetUserId}`);
        setMembers(prev => prev.filter(m => String(m._id) !== String(targetUserId)));
        showAlert(t('Success'), t('Member removed successfully'));
      } catch (err: any) {
        console.warn('handleRemoveMember failed', err);
        showAlert(t('Error'), err?.response?.data?.error || t('Failed to remove member'));
      } finally {
        setActionLoading(null);
      }
    };
    // Show confirmation modal (works on web and native)
    setConfirmTargetId(targetUserId);
    setConfirmVisible(true);
    // performRemove will be called from ConfirmationModal onConfirm
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      height: 56,
      borderBottomWidth: 1,
      borderBottomColor: T.divider,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor: T.surface,
    },
    headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: isRTL ? 0 : 8,
      marginRight: isRTL ? 8 : 0,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    headerSubtitle: { fontSize: 12, color: T.textMuted, marginTop: 1 },
    searchContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.surfaceAlt,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 8,
    },
    searchIcon: {
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    },
    searchInput: {
      flex: 1,
      color: T.text,
      fontSize: 14,
      paddingVertical: 6,
      textAlign: isRTL ? 'right' : 'left',
    },
    clearButton: {
      padding: 2,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    card: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.divider,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    avatarPlaceholderText: {
      color: T.textSub,
      fontSize: 14,
      fontWeight: '600',
    },
    info: { flex: 1, justifyContent: 'center' },
    nameRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    name: { color: T.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
    ownerText: { color: T.textMuted, fontSize: 13 },
    writerText: { color: T.textMuted, fontSize: 13 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    actionTextButton: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    actionTextGrant: {
      fontSize: 13,
      fontWeight: '600',
      color: T.text,
    },
    actionTextRevoke: {
      fontSize: 13,
      fontWeight: '600',
      color: T.textSub,
    },
    actionIconButton: {
      padding: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '600',
      color: T.text,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 13,
      color: T.textMuted || '#8A8A8E',
      marginTop: 4,
      textAlign: 'center',
    },
  }), [T, isRTL]);

  const renderItem = ({ item }: { item: any }) => {
    const isTargetMe = String(item._id) === String(user?._id);
    const isTargetOwner = item.role === 'owner';
    const isTargetWriter = item.role === 'writer';
    const showActions = isOwner && !isTargetMe && !isTargetOwner;

    return (
      <View style={styles.card}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>{getInitials(item.fullName)}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
            {isTargetOwner && (
              <Text style={styles.ownerText}>• {t('owner')}</Text>
            )}
            {isTargetWriter && (
              <Text style={styles.writerText}>• {t('writer')}</Text>
            )}
          </View>
        </View>

        {actionLoading === String(item._id) ? (
          <ActivityIndicator size="small" color={T.textMuted} style={{ padding: 8 }} />
        ) : (
          showActions && (
            <View style={styles.actions}>
              {isTargetWriter ? (
                <TouchableOpacity
                  style={styles.actionTextButton}
                  onPress={() => handleRoleChange(item._id, 'member')}
                >
                  <Text style={styles.actionTextRevoke}>{t('Revoke')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionTextButton}
                  onPress={() => handleRoleChange(item._id, 'writer')}
                >
                  <Text style={styles.actionTextGrant}>{t('Grant Write')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => handleRemoveMember(item._id)}
              >
                <Ionicons name="trash-outline" size={18} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={T.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('Search members...')}
          placeholderTextColor={T.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (members.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color={T.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>{t('No members in this channel.')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={40} color={T.textMuted} style={{ marginBottom: 12 }} />
        <Text style={styles.emptyText}>{t('No matching members found.')}</Text>
        <Text style={styles.emptySubtext}>{t("Try searching for something else")}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('Channel Members')}</Text>
          {channel && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {channel.name} • {members.length} {members.length === 1 ? t('member') : t('members')}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={T.textMuted} />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(i) => String(i._id)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
        />
      )}

      {/* Confirmation modal for removals */}
      <ConfirmationModal
        visible={confirmVisible}
        onClose={() => { setConfirmVisible(false); setConfirmTargetId(null); }}
        title={'Remove Member'}
        message={t('Are you sure you want to remove this member from the channel?')}
        confirmLabel={'Remove'}
        cancelLabel={'Cancel'}
        onConfirm={async () => {
          if (!confirmTargetId) return;
          setConfirmVisible(false);
          const target = confirmTargetId;
          setConfirmTargetId(null);
          setActionLoading(target);
          try {
            await messagingHttp.delete(`/channels/${channelId}/members/${target}`);
            setMembers(prev => prev.filter(m => String(m._id) !== String(target)));
            showAlert(t('Success'), t('Member removed successfully'));
          } catch (err: any) {
            console.warn('handleRemoveMember failed', err);
            showAlert(t('Error'), err?.response?.data?.error || t('Failed to remove member'));
          } finally {
            setActionLoading(null);
          }
        }}
        loading={false}
        isDestructive={true}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      {/* Info modal for success/error messages */}
      <InfoModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        title={infoTitle}
        message={infoMessage}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />
    </SafeAreaView>
  );
}
