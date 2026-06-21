import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import http from '../../../../core/network/http.client';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { Ionicons } from '@expo/vector-icons';

const CORE_API_URL = API_BASE_URL;

export default function CommunityMembersList({ route, navigation }: any) {
  const { channelId } = route.params || {};
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { t } = useLanguage();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // 1. Try to fetch from the populated members endpoint first
      try {
        const res = await http.get(`${CORE_API_URL}/channels/${channelId}/members`);
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          // Verify that returned members are populated
          const first = list[0];
          if (first && (first.fullName || first.name || first.displayName)) {
            setMembers(list.map((u: any) => ({
              _id: u._id || u.id,
              fullName: u.fullName || u.name,
              avatarUrl: u.avatarUrl || u.avatar,
              role: u.role || 'member'
            })));
            return;
          }
        }
      } catch (e) { }

      // 2. Fall back to channel details if members endpoint wasn't populated or failed
      try {
        const ch = await http.get(`${CORE_API_URL}/channels/${channelId}`);
        const data = ch.data?.data || ch.data;
        const raw = data?.participants || data?.members || data?.userIds || [];
        if (Array.isArray(raw) && raw.length > 0) {
          // If they are objects, check if they are populated (have name/fullName)
          if (typeof raw[0] === 'object') {
            const first = raw[0];
            if (first && (first.fullName || first.name || first.displayName)) {
              const normalized = raw.map((m: any) => ({
                _id: m._id || m.id,
                fullName: m.fullName || m.name || m.displayName,
                avatarUrl: m.avatarUrl || m.avatar,
                role: m.role || (m.isAdmin ? 'admin' : 'member')
              }));
              setMembers(normalized);
              return;
            } else {
              // Not populated (only contains userId, role, etc.) -> extract IDs and fetch
              const ids = raw.map((m: any) => String(m.userId || m._id || m.id));
              try {
                const ures = await http.get(`${CORE_API_URL}/users?ids=${encodeURIComponent(ids.join(','))}`);
                const users = ures.data?.data || ures.data || [];
                const ms = users.map((u: any) => ({
                  _id: u._id || u.id,
                  fullName: u.fullName || u.name || u.displayName,
                  avatarUrl: u.avatarUrl || u.avatar,
                  role: 'member'
                }));
                setMembers(ms);
                return;
              } catch (ee) { }
            }
          }

          // raw are ids -> attempt users?ids= fallback
          try {
            const ures = await http.get(`${CORE_API_URL}/users?ids=${encodeURIComponent(raw.join(','))}`);
            const users = ures.data?.data || ures.data || [];
            const ms = users.map((u: any) => ({ _id: u._id || u.id, fullName: u.fullName || u.name || u.displayName, avatarUrl: u.avatarUrl || u.avatar, role: u.role || u.profileType }));
            setMembers(ms);
            return;
          } catch (e) {
            // fallback to fetching all users and filter
            const all = await http.get(`${CORE_API_URL}/users`);
            const users = all.data?.data || all.data || [];
            const ms = users.filter((u: any) => raw.includes(String(u._id) || String(u.id))).map((u: any) => ({ _id: u._id || u.id, fullName: u.fullName || u.name, avatarUrl: u.avatarUrl || u.avatar, role: u.role }));
            setMembers(ms);
            return;
          }
        }
        setMembers([]);
        return;
      } catch (e) {
        setMembers([]);
      }
    } catch (err) {
      console.warn('fetchMembers list failed', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [channelId]);

  const isAdmin = (m: any) => (m.role || '').toLowerCase().includes('admin') || (m.isAdmin || false);

  const removeMember = (memberId: string) => {
    if (!user) return;
    Alert.alert(t('Remove member'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Remove'), style: 'destructive', onPress: async () => {
        try {
          let ok = false;
          try {
            await http.delete(`${CORE_API_URL}/channels/${channelId}/members/${memberId}`);
            ok = true;
          } catch (e) {}
          if (!ok) {
            try {
              await http.post(`${CORE_API_URL}/channels/${channelId}/remove-member`, { memberId });
              ok = true;
            } catch (e) {}
          }
          if (!ok) {
            Alert.alert(t('Notice'), t('Server did not accept remove request; local update applied'));
            setMembers(prev => prev.filter(m => String(m._id || m.id) !== String(memberId)));
            return;
          }
          await fetchMembers();
        } catch (err) {
          console.warn('removeMember failed', err);
          Alert.alert(t('Error'), t('Failed to remove member'));
        }
      } }
    ]);
  };

  const toggleAdmin = async (member: any) => {
    if (!user) return;
    try {
      const id = member._id || member.id;
      let ok = false;
      const attempts = [
        { url: `${CORE_API_URL}/channels/${channelId}/members/${id}/promote`, body: { memberId: id } },
        { url: `${CORE_API_URL}/channels/${channelId}/members/${id}/demote`, body: { memberId: id } },
        { url: `${CORE_API_URL}/channels/${channelId}/promote-member`, body: { memberId: id } },
        { url: `${CORE_API_URL}/channels/${channelId}/demote-member`, body: { memberId: id } },
        { url: `${CORE_API_URL}/channels/${channelId}/members/promote`, body: { memberId: id } },
        { url: `${CORE_API_URL}/channels/${channelId}/members/demote`, body: { memberId: id } }
      ];
      for (const a of attempts) {
        try {
          const shouldCall = (a.url.includes('promote') && !isAdmin(member)) || (a.url.includes('demote') && isAdmin(member));
          if (!shouldCall) continue;
          await http.post(a.url, a.body);
          ok = true; break;
        } catch (e) {
          // try next
        }
      }
      if (!ok) throw new Error('No promote/demote endpoint responded');
      await fetchMembers();
    } catch (err) {
      console.warn('toggleAdmin failed', err);
      Alert.alert(t('Error'), t('Failed to change role'));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider }}>
      <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: T.text, fontWeight: '700' }}>{item.fullName || item.name}</Text>
        <Text style={{ color: T.textMuted, fontSize: 12 }}>{isAdmin(item) ? 'ADMIN' : 'MEMBRE'}</Text>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: item._id || item.id })} style={{ padding: 8 }}>
        <Ionicons name="person" size={18} color={T.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => toggleAdmin(item)} style={{ padding: 8, marginLeft: 6 }}>
        <Ionicons name={isAdmin(item) ? 'remove-circle' : 'add-circle'} size={18} color={isAdmin(item) ? '#F39C12' : '#2ECC71'} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => removeMember(item._id || item.id)} style={{ padding: 8, marginLeft: 6 }}>
        <Ionicons name="trash" size={18} color="#D9534F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ height: 64, borderBottomWidth: 1, borderBottomColor: T.divider, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', marginLeft: 8, color: T.text }}>{t('Membres')}</Text>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        <FlatList data={members} keyExtractor={(i) => String(i._id || i.id)} renderItem={renderItem} />
      )}
    </View>
  );
}
