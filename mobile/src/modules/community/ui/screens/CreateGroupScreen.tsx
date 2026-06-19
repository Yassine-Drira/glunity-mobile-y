import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, FlatList, ScrollView, ActivityIndicator, Alert, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import http from '../../../../core/network/http.client';
import * as ImagePicker from 'expo-image-picker';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { useAuth } from '../../../auth/state/auth.context';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CORE_API_URL = API_BASE_URL;

export default function CreateGroupScreen({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await http.get(`${CORE_API_URL}/users`);
        if (!mounted) return;
        // Exclude self
        const list = (res.data?.data || []).filter((u: any) => String(u._id) !== String(user?._id));
        setUsers(list);
      } catch (err) {
        setUsers([]);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter(u => (u.fullName || u.name || '').toLowerCase().includes(s));
  }, [users, search]);

  const toggleSelect = (u: any) => {
    if (selected.some(s => String(s._id || s.id) === String(u._id || u.id))) {
      setSelected(prev => prev.filter(p => String(p._id || p.id) !== String(u._id || u.id)));
    } else {
      setSelected(prev => [...prev, u]);
    }
  };

  const removeSelected = (id: string) => setSelected(prev => prev.filter(p => String(p._id || p.id) !== String(id)));

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('Permission Denied ❌'), t('You must allow photo library access to upload a cover photo.'));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
      // New API puts assets array
      // @ts-ignore
      const uri = res?.assets && res.assets.length > 0 ? res.assets[0].uri : (res as any).uri;
      if (!uri) return;
      setLocalPhotoUri(uri);
      await uploadImage(uri);
    } catch (err) {
      console.warn('pickImage failed', err);
      Alert.alert('Error', t('Failed to pick image'));
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const filename = uri.split('/').pop() || 'group.jpg';
      const form = new FormData();

      if (Platform.OS === 'web' || (typeof uri === 'string' && uri.startsWith('blob:'))) {
        try {
          const blobResp = await fetch(uri);
          const blob = await blobResp.blob();
          const fileObj: any = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'image/jpeg' }) : blob;
          form.append('file', fileObj);
        } catch (e) {
          form.append('file', { uri, name: filename, type: 'image/jpeg' } as any);
        }
      } else {
        form.append('file', { uri, name: filename, type: 'image/jpeg' } as any);
      }

      const uploadRes = await http.post(`${CORE_API_URL}/uploads`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const body = uploadRes.data;
      const data = body?.data;
      if (!data || !data.url) throw new Error('Invalid upload response');
      setUploadedPhotoUrl(data.url);
    } catch (err) {
      console.warn('uploadImage failed', err);
      Alert.alert('Error', t('Failed to upload image'));
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    if (selected.length === 0) {
      Alert.alert(t('Select Members'), t('Please select at least one member to create a group.'));
      return;
    }
    setCreating(true);
    const name = (groupName || selected.map(s => s.fullName || s.name).slice(0, 4).join(', ')).trim();
    const participantIds = selected.map(s => s._id || s.id);
    try {
      // Try to call existing server endpoint (may not be available on all deployments)
      const payload: any = { name, description: `Group created by ${user?.fullName || 'user'}`, participants: participantIds };
      if (uploadedPhotoUrl) payload.icon = uploadedPhotoUrl;
      const res = await http.post(`${CORE_API_URL}/channels`, payload);
      const ch = res.data?.data || res.data;
      setCreating(false);
      navigation.navigate('CommunityChat', { initialChannel: ch });
    } catch (err) {
      // If backend route not available, fallback to client-side channel and navigate
      console.warn('create group request failed', err);
      const fallback = {
        id: `local-${Date.now()}`,
        _id: `local-${Date.now()}`,
        name,
        description: '',
        participants: selected.map(s => ({ _id: s._id || s.id, fullName: s.fullName || s.name, avatarUrl: s.avatarUrl || null })),
        avatarUrl: uploadedPhotoUrl || null,
      };
      setCreating(false);
      navigation.navigate('CommunityChat', { initialChannel: fallback });
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    inner: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
    header: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '800', color: T.text },
    search: { backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: T.text, marginBottom: 12, height: 44, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    chipsContainer: { marginBottom: 12, minHeight: 54 },
    chip: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
    chipAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
    groupRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 },
    groupAvatarWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: T.divider },
    groupAvatarImg: { width: 96, height: 96, borderRadius: 48 },
    cameraBadge: { position: 'absolute', bottom: -4, right: -4, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: T.divider },
    groupNameInput: { flex: 1, backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: T.text, height: 52 },
    userCard: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: T.surface, padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
    userInfo: { flex: 1 },
    name: { color: T.text, fontSize: 16, fontWeight: '700' },
    role: { color: T.textMuted, fontSize: 12, marginTop: 4 },
    actionWrap: { width: 56, alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: T.divider, justifyContent: 'center', alignItems: 'center' },
    addBtnActive: { backgroundColor: '#8BC34A', borderColor: '#8BC34A' },
    createContainer: { position: 'absolute', left: 16, right: 16, bottom: 16 + insets.bottom, height: 56 },
    createBtn: { flex: 1, backgroundColor: '#8BC34A', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    createText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    emptyText: { color: T.textMuted, textAlign: 'center', marginTop: 20 },
  }), [T, isRTL, insets.bottom]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Create Group')}</Text>
        </View>

        <TextInput
          placeholder={t('Search users')}
          placeholderTextColor={T.textMuted}
          style={styles.search as any}
          value={search}
          onChangeText={setSearch}
          accessible
          accessibilityLabel={t('Search users')}
        />

        {selected.length > 0 && (
          <View style={styles.chipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingVertical: 4 }}>
              {selected.map((s) => (
                <View key={String(s._id || s.id)} style={styles.chip as any}>
                  <Image source={{ uri: s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || s.name || 'U')}&background=8BC34A&color=fff` }} style={styles.chipAvatar as any} />
                  <Text style={{ color: T.text, fontWeight: '700', marginRight: 8 }}>{(s.fullName || s.name || '').split(' ')[0]}</Text>
                  <TouchableOpacity onPress={() => removeSelected(s._id || s.id)} style={{ padding: 6 }} accessibilityLabel={t('Remove member')}>
                    <Ionicons name="close" size={16} color={T.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Group info: avatar + name */}
        <View style={styles.groupRow as any}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.groupAvatarWrap as any} accessibilityLabel={t('Pick group photo')}>
            {uploading ? <ActivityIndicator /> : (
              uploadedPhotoUrl ? <Image source={{ uri: uploadedPhotoUrl }} style={styles.groupAvatarImg as any} /> : localPhotoUri ? <Image source={{ uri: localPhotoUri }} style={styles.groupAvatarImg as any} /> : (
                <Ionicons name="camera" size={28} color={T.textMuted} />
              )
            )}
            <View style={styles.cameraBadge as any}>
              <Ionicons name="camera" size={16} color={T.text} />
            </View>
          </TouchableOpacity>

          <TextInput placeholder={t('Group name (optional)')} placeholderTextColor={T.textMuted} value={groupName} onChangeText={setGroupName} style={styles.groupNameInput as any} />
        </View>

        {/* User list */}
        {loadingUsers ? <ActivityIndicator /> : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i._id || i.id)}
            renderItem={({ item }) => {
              const isSel = selected.some(s => String(s._id || s.id) === String(item._id || item.id));
              return (
                <View style={styles.userCard as any}>
                  <TouchableOpacity onPress={() => toggleSelect(item)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
                    <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={styles.avatar as any} />
                    <View style={styles.userInfo as any}>
                      <Text style={styles.name as any}>{item.fullName || item.name}</Text>
                      <Text style={styles.role as any}>{item.profileType || ''}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.actionWrap as any}>
                    <TouchableOpacity onPress={() => toggleSelect(item)} style={[styles.addBtn as any, isSel ? styles.addBtnActive : undefined]} accessibilityRole="button" accessibilityLabel={isSel ? t('Remove') : t('Add') }>
                      {isSel ? <Ionicons name="checkmark" size={20} color="#fff" /> : <Ionicons name="add" size={20} color={T.text} />}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        )}

      </View>

      {/* Fixed create button */}
      <View style={styles.createContainer as any} pointerEvents="box-none">
        <TouchableOpacity onPress={handleCreate} style={styles.createBtn as any} disabled={creating} accessibilityRole="button" accessibilityLabel={t('Create Group') }>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText as any}>{t('Create Group')}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
