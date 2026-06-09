import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Animated, Clipboard, Dimensions, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import messagingEvents from '../../../../shared/utils/messagingEvents';

const CORE_API_URL = API_BASE_URL;
const MSG_SERVICE_URL = API_BASE_URL.replace(':5000', ':5001');
const MSG_SERVICE_SOCKET_URL = MSG_SERVICE_URL.replace('/api', '');

export default function CommunityMessaging({ initialChannel, initialChannelId, navigation }: any) {

  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  // Use native animated driver only on native platforms (web often lacks native Animated module)
  const nativeAnimDriver = Platform.OS !== 'web';
  // Darker translucent overlay fallback to avoid white wash on backdrop
  const overlayFallback = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)';
  // Modal background translucent to avoid stark white cards
  const modalBg = isDark ? 'rgba(10,10,10,0.6)' : 'rgba(255,255,255,0.88)';

  const [channel, setChannel] = useState<any>(initialChannel || null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [reactionEmojis] = useState(['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '✅']);
  const [popEmoji, setPopEmoji] = useState<string | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<any>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  // dynamic require of expo-av to avoid native module crash when not available
  let ExpoAV: any = null;
  try { ExpoAV = require('expo-av'); } catch (e) { ExpoAV = null; }
  const socketRef = useRef<any>(null);
  const listRef = useRef<FlatList>(null);
  const { width: windowWidth } = useWindowDimensions();

  // UI states for menu and bottom sheets
  const [menuVisible, setMenuVisible] = useState(false);
  const [membersSheetVisible, setMembersSheetVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);

  // Enhanced modal / edit states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const editModalAnim = useRef(new Animated.Value(0)).current; // scale/opacity for centered modal

  // optional native modules (expo) — load dynamically to avoid runtime crashes when not installed
  let BlurView: any = null;
  try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }
  let ImageManipulator: any = null;
  try { ImageManipulator = require('expo-image-manipulator'); } catch (e) { ImageManipulator = null; }

  const SHEET_HEIGHT = Dimensions.get('window').height * 0.8; // 75-85% preferred
  const sheetAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const pan = useRef(new Animated.Value(0)).current;

  // admin check (best-effort based on available fields)
  const isAdmin = useMemo(() => {
    if (!channel || !user) return false;
    if (channel.ownerId && String(channel.ownerId) === String(user._id)) return true;
    if (channel.createdBy && String(channel.createdBy) === String(user._id)) return true;
    if (Array.isArray(channel.admins) && channel.admins.some((a: any) => String(a) === String(user._id))) return true;
    const parts = channel.participants || channel.members;
    if (Array.isArray(parts)) {
      const me = parts.find((p: any) => (p && (p._id || p.id)) && String(p._id || p.id) === String(user._id));
      if (me && (me.role === 'admin' || me.role === 'owner')) return true;
    }
    return false;
  }, [channel, user]);

  const isCreator = useMemo(() => {
    if (!channel || !user) return false;
    if (channel.ownerId && String(channel.ownerId) === String(user._id)) return true;
    if (channel.createdBy && String(channel.createdBy) === String(user._id)) return true;
    return false;
  }, [channel, user]);

  const hasChanges = useMemo(() => {
    if (!channel) return false;
    const nameChanged = (editName || '').trim() !== (channel?.name || '').trim();
    const currentAvatar = channel?.avatarUrl || channel?.icon || '';
    const photoChanged = !!editPhotoUri && String(editPhotoUri) !== String(currentAvatar);
    return nameChanged || photoChanged;
  }, [channel, editName, editPhotoUri]);

  useEffect(() => {
    setEditName(channel?.name || '');
    setEditPhotoUri(channel?.avatarUrl || channel?.icon || null);
  }, [channel]);

  // PanResponder for bottom sheet swipe down-to-close
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) pan.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120) {
        // close whichever sheet is open
        if (membersSheetVisible) closeMembersSheet();
        if (editSheetVisible) closeEditSheet();
      } else {
        Animated.timing(pan, { toValue: 0, duration: 200, useNativeDriver: nativeAnimDriver }).start();
      }
    }
  })).current;

  // removed showUserAlert to avoid blocking window alerts in UI

  const openMembersSheet = () => {
    setMenuVisible(false);
    setMembersSheetVisible(true);
    pan.setValue(0);
    Animated.timing(sheetAnim, { toValue: 1, duration: 280, useNativeDriver: nativeAnimDriver }).start();
  };

  const closeMembersSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: nativeAnimDriver }).start(() => {
      setMembersSheetVisible(false);
      setShowAddList(false);
      setSelectedToAdd([]);
      pan.setValue(0);
    });
  };

  const openEditSheet = () => {
    setMenuVisible(false);
    setEditSheetVisible(true);
    // prepare modal content
    setEditName(channel?.name || '');
    setEditPhotoUri(channel?.avatarUrl || channel?.icon || null);
    editModalAnim.setValue(0);
    Animated.timing(editModalAnim, { toValue: 1, duration: 320, useNativeDriver: nativeAnimDriver }).start();
  };

  const closeEditSheet = () => {
    Animated.timing(editModalAnim, { toValue: 0, duration: 240, useNativeDriver: nativeAnimDriver }).start(() => {
      setEditSheetVisible(false);
    });
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      // Try many possible keys that backend might use for participants
      const candidateKeys = ['participants','members','userIds','participantIds','memberIds','membersList','participantsList','users','usersList','participants_ids','member_ids','participant_ids','members_ids'];
      let raw: any = null;
      for (const k of candidateKeys) {
        if (channel && channel[k]) { raw = channel[k]; break; }
      }
      // Some APIs nest under data
      if (!raw && channel && channel.data) {
        for (const k of candidateKeys) { if (channel.data[k]) { raw = channel.data[k]; break; } }
      }

      // If raw is still empty, attempt to call several members endpoints
      const token = await TokenStore.getAccessToken();
      const membersEndpoints = [`/channels/${channel?.id || channel?._id}/members`, `/channels/${channel?.id || channel?._id}/participants`, `/channels/${channel?.id || channel?._id}/users`, `/channels/${channel?.id || channel?._id}/members-list`];
      if ((!raw || (Array.isArray(raw) && raw.length === 0))) {
        for (const ep of membersEndpoints) {
          try {
            const res = await axios.get(`${CORE_API_URL}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = res.data?.data || res.data;
            if (Array.isArray(data) && data.length > 0) { raw = data; break; }
            // sometimes returned as { members: [...] }
            if (data && Array.isArray(data.members) && data.members.length > 0) { raw = data.members; break; }
            if (data && Array.isArray(data.participants) && data.participants.length > 0) { raw = data.participants; break; }
          } catch (e) {
            // continue trying other endpoints
          }
        }
      }

      // Final fallback: if still nothing, fetch all users and try to infer membership by common channel references on user objects
      if (!raw || (Array.isArray(raw) && raw.length === 0)) {
        try {
          const usersRes = await axios.get(`${CORE_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
          const users = usersRes.data?.data || usersRes.data || [];
          // possible user fields that may reference channel membership
          const userChannelKeys = ['channelIds','channels','groups','memberOf','participatingChannels','channelsIds'];
          const matched = users.filter((u: any) => {
            for (const k of userChannelKeys) {
              const v = u[k];
              if (!v) continue;
              if (Array.isArray(v) && v.some((x: any) => String(x) === String(channel?.id || channel?._id))) return true;
              if (typeof v === 'string' && String(v) === String(channel?.id || channel?._id)) return true;
            }
            return false;
          });
          if (matched.length > 0) {
            const ms = matched.map((u: any) => ({ _id: u._id || u.id, fullName: u.fullName || u.name || u.displayName || u.username, avatarUrl: u.avatarUrl || u.avatar || u.profilePicture, role: u.role || u.profileType }));
            setMembers(ms);
            setMembersLoading(false);
            return;
          }
        } catch (e) {
          // ignore and fall through to empty
        }
      }

      if (!raw || (Array.isArray(raw) && raw.length === 0)) {
        setMembers([]);
        return;
      }

      // If items are objects, normalize and return
      if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
        const normalized = raw.map((m: any) => ({ _id: m._id || m.id || m.userId, fullName: m.fullName || m.name || m.displayName || m.username, avatarUrl: m.avatarUrl || m.avatar || m.profilePicture, role: m.role || (m.isAdmin ? 'admin' : (m.roleName || 'member')) }));
        setMembers(normalized);
        return;
      }

      // If items are ids -> resolve via /users?ids=... or fallback to /users
      if (Array.isArray(raw) && (typeof raw[0] === 'string' || typeof raw[0] === 'number')) {
        const ids = raw.map((r: any) => String(r));
        let fetched: any[] = [];
        try {
          const res = await axios.get(`${CORE_API_URL}/users?ids=${encodeURIComponent(ids.join(','))}`, { headers: { Authorization: `Bearer ${token}` } });
          fetched = res.data?.data || res.data || [];
        } catch (e) {
          try {
            const res2 = await axios.get(`${CORE_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
            const users = res2.data?.data || res2.data || [];
            fetched = users.filter((u: any) => ids.includes(String(u._id) || String(u.id)));
          } catch (ee) {
            fetched = [];
          }
        }
        const ms = (fetched || []).map((u: any) => ({ _id: u._id || u.id, fullName: u.fullName || u.name || u.displayName || u.username, avatarUrl: u.avatarUrl || u.avatar || u.profilePicture, role: u.role || u.profileType }));
        setMembers(ms);
        return;
      }

      // unexpected shape
      setMembers([]);
    } catch (err) {
      console.warn('fetchMembers failed', err);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // Refresh members when channel updates elsewhere
  useEffect(() => {
    const handler = (updated: any) => {
      try {
        if (!updated) return;
        if ((updated.id || updated._id) && channel && String(updated.id || updated._id) === String(channel.id || channel._id)) {
          setChannel(prev => ({ ...(prev || {}), ...(updated || {}) }));
          if (membersSheetVisible) fetchMembers();
        }
      } catch (e) {}
    };
    try { messagingEvents.on && messagingEvents.on('channel:updated', handler); } catch (e) {}
    return () => { try { messagingEvents.off && messagingEvents.off('channel:updated', handler); } catch (e) {} };
  }, [channel, membersSheetVisible]);

  useEffect(() => {
    if (membersSheetVisible) fetchMembers();
  }, [membersSheetVisible]);

  const toggleSelectToAdd = (id: string) => {
    setSelectedToAdd(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const addMembers = async () => {
    if (!isAdmin) { Alert.alert('Permission denied', 'Only admins can add members'); return; }
    if (!selectedToAdd || selectedToAdd.length === 0) return;
    setAdding(true);
    try {
      const token = await TokenStore.getAccessToken();
      let ok = false;
      try {
        await axios.post(`${CORE_API_URL}/channels/${channel.id || channel._id}/members`, { members: selectedToAdd }, { headers: { Authorization: `Bearer ${token}` } });
        ok = true;
      } catch (e) {}
      if (!ok) {
        try {
          await axios.post(`${CORE_API_URL}/channels/${channel.id || channel._id}/add-members`, { members: selectedToAdd }, { headers: { Authorization: `Bearer ${token}` } });
          ok = true;
        } catch (e) {}
      }

      // If server doesn't support adding members, perform optimistic local update
      if (!ok) {
        const added = (allUsers || []).filter(u => selectedToAdd.includes(String(u._id || u.id)));
        setMembers(prev => [...prev, ...added]);
        setChannel((prev: any) => ({ ...prev, participants: [...(prev?.participants || []), ...added] }));
        messagingEvents.emit('channel:updated', { ...channel, participants: [...(channel?.participants || []), ...added] });
      } else {
        // refresh members list from server
        await fetchMembers();
      }

      setSelectedToAdd([]);
      setShowAddList(false);
    } catch (err) {
      console.warn('addMembers failed', err);
      Alert.alert('Error', 'Failed to add members');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = (memberId: string) => {
    if (!isAdmin) { Alert.alert('Permission denied', 'Only admins can remove members'); return; }
    Alert.alert('Remove member', 'Are you sure you want to remove this member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const token = await TokenStore.getAccessToken();
          let ok = false;
          try {
            await axios.delete(`${CORE_API_URL}/channels/${channel.id || channel._id}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
            ok = true;
          } catch (e) {}
          if (!ok) {
            try {
              await axios.post(`${CORE_API_URL}/channels/${channel.id || channel._id}/remove-member`, { memberId }, { headers: { Authorization: `Bearer ${token}` } });
              ok = true;
            } catch (e) {}
          }

          if (!ok) {
            // local fallback
            setMembers(prev => prev.filter(m => String(m._id || m.id) !== String(memberId)));
            setChannel((prev: any) => ({ ...prev, participants: (prev?.participants || []).filter((p: any) => String(p._id || p.id) !== String(memberId)) }));
            messagingEvents.emit('channel:updated', { ...channel, participants: (channel?.participants || []).filter((p: any) => String(p._id || p.id) !== String(memberId)) });
            return;
          }

          // refresh
          await fetchMembers();
        } catch (err) {
          console.warn('removeMember failed', err);
          Alert.alert('Error', 'Failed to remove member');
        }
      } }
    ]);
  };

  const uploadImageForEdit = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const token = await TokenStore.getAccessToken();
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

      const res = await fetch(`${CORE_API_URL}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }
      const body = await res.json();
      const data = body?.data;
      if (!data || !data.url) throw new Error('Invalid upload response');
      setEditPhotoUri(data.url);
      return data.url;
    } catch (err) {
      console.warn('uploadImage failed', err);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Compress image using expo-image-manipulator when available
  const compressImage = async (uri: string) => {
    try {
      if (!ImageManipulator) return uri;
      const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
      return result?.uri || uri;
    } catch (e) {
      return uri;
    }
  };

  const capturePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission Denied', 'You must allow camera access to take a photo.'); return; }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
      const uri = res?.assets && res.assets.length > 0 ? res.assets[0].uri : (res as any).uri;
      if (!uri) return;
      const compressed = await compressImage(uri);
      // show local preview then upload in background
      setEditPhotoUri(compressed);
      try {
        const uploaded = await uploadImageForEdit(compressed);
        if (!uploaded) Alert.alert('Upload failed', 'Unable to upload selected photo');
      } catch (e) {
        console.warn('capture upload failed', e);
      }
    } catch (err) {
      console.warn('capturePhoto failed', err);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const copyChannelLink = async () => {
    try {
      const link = `${CORE_API_URL}/channels/${channel?.id || channel?._id}`;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else if ((Clipboard as any) && typeof (Clipboard as any).setString === 'function') {
        (Clipboard as any).setString(link);
      } else if (typeof navigator !== 'undefined' && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
        await (navigator as any).clipboard.writeText(link);
      } else {
        throw new Error('No clipboard available');
      }
      Alert.alert(t('Copied'), t('Link copied to clipboard'));
    } catch (e) {
      console.warn('copyChannelLink failed', e);
      Alert.alert(t('Error'), t('Failed to copy link'));
    }
  };

  const showImageOptions = () => {
    console.log('[CommunityMessaging] showImageOptions invoked', Platform.OS);
    // On web Alert.alert with multiple buttons doesn't render actionable buttons.
    // Directly open picker on web for better UX.
    if (Platform.OS === 'web') {
      pickEditImage().catch((e) => console.warn('pickEditImage failed', e));
      return;
    }

    Alert.alert('', t('Change photo'), [
      { text: t('Take Photo'), onPress: () => capturePhoto() },
      { text: t('Choose From Library'), onPress: () => pickEditImage() },
      { text: t('Cancel'), style: 'cancel' }
    ]);
  };

  const pickEditImage = async () => {
    try {
      // On web, skip permission request flow (not needed) and directly open picker
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission Denied', 'You must allow photo library access to upload a photo.');
          return;
        }
      }

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true });
      const uri = res?.assets && res.assets.length > 0 ? res.assets[0].uri : (res as any).uri;
      if (!uri) return;
      const compressed = await compressImage(uri);
      // show preview then upload
      setEditPhotoUri(compressed);
      try {
        const uploaded = await uploadImageForEdit(compressed);
        if (!uploaded) Alert.alert('Upload failed', 'Unable to upload selected photo');
      } catch (e) {
        console.warn('pick upload failed', e);
      }
    } catch (err) {
      console.warn('pickEditImage failed', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveGroupEdits = async () => {
    if (!isAdmin && !isCreator) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[CommunityMessaging] Bypassing admin/creator check in __DEV__ for testing');
        // continue in dev for testing
      } else {
        Alert.alert('Permission denied', 'Only admins or the group creator can edit the group');
        return;
      }
    }
    if (!editName || editName.trim() === '') { Alert.alert(t('Validation Error'), t('Group name cannot be empty')); return; }
    console.log('[CommunityMessaging] saveGroupEdits invoked', { isAdmin, isCreator, hasChanges, editName, editPhotoUri });
    setSaving(true);
    try {
      const token = await TokenStore.getAccessToken();
      const payload: any = {};
      if (editName && editName.trim() !== (channel?.name || '')) payload.name = editName.trim();

      // If photo is a local URI (not http), upload it first
      let finalIcon = editPhotoUri;
      if (finalIcon && !/^https?:\/\//i.test(finalIcon)) {
        const uploadedUrl = await uploadImageForEdit(finalIcon);
        if (!uploadedUrl) {
          throw new Error('Image upload failed');
        }
        finalIcon = uploadedUrl;
      }
      if (finalIcon) {
        payload.icon = finalIcon;
        payload.avatarUrl = finalIcon;
      }

      let ok = false;
      try {
        await axios.patch(`${CORE_API_URL}/channels/${channel.id || channel._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        ok = true;
      } catch (e) {
        // ignore and try alternate
      }
      if (!ok) {
        try {
          await axios.post(`${CORE_API_URL}/channels/${channel.id || channel._id}/update`, payload, { headers: { Authorization: `Bearer ${token}` } });
          ok = true;
        } catch (e) {}
      }

      const updated = { ...(channel || {}), name: payload.name || channel?.name, avatarUrl: payload.avatarUrl || channel?.avatarUrl, icon: payload.icon || channel?.icon };
      setChannel(updated);
      messagingEvents.emit('channel:updated', updated);
      closeEditSheet();
      if (ok) {
        Alert.alert(t('Success'), t('Group updated'));
      } else {
        Alert.alert(t('Notice'), t('Server did not accept update; changes applied locally.'));
      }
    } catch (err) {
      console.warn('saveGroupEdits failed', err, (err as any)?.response?.data || '');
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || t('Failed to save changes');
      Alert.alert(t('Error'), msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = () => {
    if (!isCreator) { Alert.alert('Permission denied', 'Only the group creator can delete the group'); return; }
    setConfirmDeleteVisible(true);
  };

  const performDeleteGroup = async () => {
    if (!isCreator) { Alert.alert('Permission denied', 'Only the group creator can delete the group'); return; }
    setDeleting(true);
    try {
      const token = await TokenStore.getAccessToken();
      let ok = false;
      try {
        await axios.delete(`${CORE_API_URL}/channels/${channel.id || channel._id}`, { headers: { Authorization: `Bearer ${token}` } });
        ok = true;
      } catch (e) {}
      if (!ok) {
        try {
          await axios.post(`${CORE_API_URL}/channels/${channel.id || channel._id}/delete`, {}, { headers: { Authorization: `Bearer ${token}` } });
          ok = true;
        } catch (e) {}
      }

      messagingEvents.emit('channel:deleted', channel.id || channel._id);
      navigation.goBack();
      if (!ok) Alert.alert(t('Notice'), t('Server did not delete group; client navigated back.'));
    } catch (err) {
      console.warn('performDeleteGroup failed', err);
      Alert.alert(t('Error'), t('Failed to delete group'));
    } finally {
      setDeleting(false);
      setConfirmDeleteVisible(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = await TokenStore.getAccessToken();
      const res = await axios.get(`${CORE_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
      setAllUsers(res.data?.data || []);
    } catch (err) {
      console.warn('fetchAllUsers failed', err);
      setAllUsers([]);
    }
  };

  useEffect(() => {
    if (showAddList) fetchAllUsers();
  }, [showAddList]);

  useEffect(() => {
    let mounted = true;
    async function loadChannel() {
      if (initialChannel) {
        setChannel(initialChannel);
        return;
      }
      if (!initialChannelId) return;
      try {
        const token = await TokenStore.getAccessToken();
        if (!token) {
          console.warn('[community] no auth token, cannot load channel');
          return;
        }
        try {
          const res = await axios.get(`${CORE_API_URL}/channels/${initialChannelId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (mounted) setChannel(res.data?.data || res.data || null);
        } catch (err) {
          // Fallback: some backends don't expose GET /channels/:id. Try listing channels and find the channel by id.
          try {
            const listRes = await axios.get(`${CORE_API_URL}/channels`, { headers: { Authorization: `Bearer ${token}` } });
            const list = listRes.data?.data || listRes.data || [];
            const found = Array.isArray(list) ? list.find((c: any) => String(c._id || c.id) === String(initialChannelId)) : null;
            if (mounted && found) {
              console.debug('[community] loaded channel from list, keys=', Object.keys(found || {}));
              setChannel(found);
              return;
            }
            console.warn('[community] channel not found in channels list for id', initialChannelId);
          } catch (ee) {
            console.warn('[community] failed to fetch channels list as fallback', ee);
          }
        }
      } catch (err) {
        console.warn('[community] failed to fetch channel', err);
      }
    }
    loadChannel();
    return () => { mounted = false; };
  }, [initialChannel, initialChannelId]);

  useEffect(() => {
    if (!channel) return;
    let mounted = true;
    async function loadHistory() {
      setLoading(true);
      try {
        const token = await TokenStore.getAccessToken();
        if (!token) {
          console.warn('[community] no auth token, skipping loadHistory');
          setMessages([]);
          setLoading(false);
          return;
        }
        const res = await axios.get(`${MSG_SERVICE_URL}/channels/${channel.id || channel._id}/messages?limit=60`, { headers: { Authorization: `Bearer ${token}` } });
        if (!mounted) return;
        setMessages(res.data?.data || []);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
      } catch (err) {
        // Include request URL and error message to aid debugging (network/CORS/server down)
        console.warn('[community] loadHistory failed', String((err as any)?.message || err), 'url=', `${MSG_SERVICE_URL}/channels/${channel.id || channel._id}/messages?limit=60`);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();

    // Mark channel as opened locally so the list clears the badge instantly
    (async () => {
      try {
        messagingEvents.emit('channel:opened', channel.id || channel._id || channel._id);
      } catch (e) {}
    })();

    return () => { mounted = false; };
  }, [channel]);

  const pinnedMessages = useMemo(() => messages.filter(m => m.pinned && !m.deletedAt), [messages]);

  // Helper: derive display name and avatar for DM channels
  const getChatDisplay = (ch: any) => {
    if (!ch) return { name: ch?.name || t('Chat'), avatar: ch?.avatarUrl || null };

    const desc: string | undefined = ch.description || ch.desc;
    const dmPrefix = 'Direct Message between ';
    if (desc && desc.startsWith(dmPrefix)) {
      const namesStr = desc.substring(dmPrefix.length);
      const parts = namesStr.split(' and ');
      if (parts.length === 2) {
        const otherName = parts[0] === user?.fullName ? parts[1] : parts[0];
        return { name: otherName, avatar: ch.avatarUrl || null };
      }
    }

    // If participants contains objects, find the other participant
    const parts = ch.participants || ch.members || ch.userIds || ch.participantIds;
    if (Array.isArray(parts) && parts.length > 0) {
      // If array of objects
      const obj = parts.find((p: any) => p && (p._id || p.id) && String(p._id || p.id) !== String(user?._id));
      if (obj) return { name: obj.fullName || obj.name || obj.displayName || String(obj._id || obj.id), avatar: obj.avatarUrl || obj.avatar || ch.avatarUrl || null };

      // If array of ids
      const otherId = parts.find((p: any) => String(p) !== String(user?._id));
      if (otherId) return { name: String(otherId), avatar: ch.avatarUrl || null };
    }

    // Fallback: use channel display name or the raw description
    if (ch.name && typeof ch.name === 'string' && ch.name.startsWith('DM-')) {
      // prefer description if present
      return { name: desc || ch.name, avatar: ch.avatarUrl || null };
    }

    return { name: ch.name || ch.displayName || desc || t('Chat'), avatar: ch.avatarUrl || null };
  };

  useEffect(() => {
    if (!channel) return;
    let active = true;
    (async () => {
      const token = await TokenStore.getAccessToken();
      if (!token) return;
      if (socketRef.current) socketRef.current.disconnect();
      const s = io(MSG_SERVICE_SOCKET_URL, { auth: { token } });
      s.on('connect', () => {});
      s.on('connect_error', (err: any) => console.warn('[community] socket connect_error', err));
      s.on('disconnect', (reason: any) => console.warn('[community] socket disconnected', reason));
      s.on('message:new', ({ message }: any) => {
        if (!active) return;
        if (message.channelId === (channel.id || channel._id)) {
          setMessages((prev) => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
        }
      });
      s.on('reaction:updated', ({ messageId, emoji, count }: any) => {
        if (!active) return;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== messageId) return m;
          const updated = { ...m };
          updated.reactionCounts = updated.reactionCounts || {};
          if (count > 0) updated.reactionCounts[emoji] = count;
          else delete updated.reactionCounts[emoji];
          return updated;
        }));
      });
      s.on('message:edited', ({ messageId, content, editedAt }: any) => {
        if (!active) return;
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content, editedAt } : m));
      });
      s.on('message:deleted', ({ messageId }: any) => {
        if (!active) return;
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m));
      });
      socketRef.current = s;
    })();

    return () => { active = false; if (socketRef.current) socketRef.current.disconnect(); };
  }, [channel]);

  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !channel) return;
    if (editingMsgId) {
      socketRef.current.emit('message:edit', { messageId: editingMsgId, content: input.trim() }, (res: any) => {
        if (res?.ok) {
          setMessages((prev) => prev.map(m => m.id === editingMsgId ? { ...m, content: input.trim(), editedAt: new Date().toISOString() } : m));
          setEditingMsgId(null);
          setInput('');
        } else {
          Alert.alert('Error', res?.error || 'Failed to edit message');
        }
      });
      return;
    }

    const payload = { channelId: channel.id || channel._id, content: input.trim(), type: 'text' };
    socketRef.current.emit('message:send', payload, (res: any) => {
      if (res?.ok) {
        setMessages((prev) => (prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]));
        // notify list screen immediately so conversation moves to top
        try { messagingEvents.emit('message:new', res.data); } catch (e) { /* ignore */ }
        setInput('');
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current) return;
    // Animate pop
    setPopEmoji(emoji);
    popAnim.setValue(0);
    // snappier spring then fade
    Animated.sequence([
      Animated.spring(popAnim, { toValue: 1, friction: 6, useNativeDriver: nativeAnimDriver }),
      Animated.timing(popAnim, { toValue: 0, duration: 360, useNativeDriver: nativeAnimDriver }),
    ]).start(() => setPopEmoji(null));

    // Optimistic UI: toggle locally for instant feedback
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const updated = { ...m };
      updated.reactionCounts = { ...(updated.reactionCounts || {}) };
      const cur = updated.reactionCounts[emoji] || 0;
      if (cur > 0) {
        const next = cur - 1;
        if (next > 0) updated.reactionCounts[emoji] = next;
        else delete updated.reactionCounts[emoji];
      } else {
        updated.reactionCounts[emoji] = 1;
      }
      return updated;
    }));

    socketRef.current.emit('reaction:toggle', { messageId, emoji }, (res: any) => {
      if (!res?.ok) console.warn('Reaction toggle failed', res?.error);
    });
  };

  // --- Audio recording (press-and-hold) ---
  const startRecording = async () => {
    if (!ExpoAV) {
      Alert.alert('Audio not available', 'Audio module is not installed in this runtime.');
      return;
    }
    try {
      // prevent preparing a new Recording while one exists
      if (recordingInstance) {
        console.warn('startRecording aborted: recording already in progress');
        return;
      }
      const { status } = await ExpoAV.Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission Denied ❌'), t('You must allow microphone access to record audio.'));
        return;
      }

      await ExpoAV.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new ExpoAV.Audio.Recording();
      await recording.prepareToRecordAsync(ExpoAV.Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      setRecordingInstance(recording);
      setIsRecording(true);
    } catch (err) {
      console.warn('startRecording failed', err);
      Alert.alert('Error', t('Failed to start recording'));
    }
  };

  const uploadAudioAndSend = async (uri: string, durationSec?: number) => {
    try {
      const token = await TokenStore.getAccessToken();
      const filename = uri.split('/').pop() || 'voice.m4a';
      const form = new FormData();

      // On web (or when uri is a blob:) fetch the blob and append a real File/Blob
      if (Platform.OS === 'web' || (typeof uri === 'string' && uri.startsWith('blob:'))) {
        try {
          const blobResp = await fetch(uri);
          const blob = await blobResp.blob();
          // Use File when available for better filename support
          const fileObj: any = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'audio/m4a' }) : blob;
          form.append('file', fileObj);
        } catch (e) {
          console.warn('Failed to fetch blob URI for upload', e);
          // fallback: try to append uri object (for native RN)
          form.append('file', { uri, name: filename, type: 'audio/m4a' } as any);
        }
      } else {
        // React Native: append RN file object
        form.append('file', { uri, name: filename, type: 'audio/m4a' } as any);
      }

      const res = await fetch(`${CORE_API_URL}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn('uploadAudio failed', res.status, text);
        throw new Error(`Upload failed: ${res.status}`);
      }
      const body = await res.json();
      const data = body?.data;
      if (!data || !data.url) throw new Error('Invalid upload response');

      if (!socketRef.current || !channel) return;
      const attachments: any = [{ url: data.url, type: 'audio', filename: data.filename || filename, size: data.size }];
      if (typeof durationSec === 'number') attachments[0].duration = durationSec;
      socketRef.current.emit('message:send', { channelId: channel.id || channel._id, content: '', type: 'media', attachments }, (res2: any) => {
        if (res2?.ok) setMessages(prev => (prev.some(m => m.id === res2.data.id) ? prev : [...prev, res2.data]));
      });
    } catch (err) {
      console.warn('uploadAudio failed', err);
      Alert.alert('Error', t('Failed to upload audio'));
    }
  };

  const stopRecordingAndSend = async () => {
    if (!ExpoAV) return;
    try {
      const recording = recordingInstance;
      if (!recording) return;

      // get duration BEFORE unloading
      let durationSec: number | undefined = undefined;
      try {
        const status = await recording.getStatusAsync();
        if (status && typeof status.durationMillis === 'number') {
          durationSec = Math.max(0, Math.round((status.durationMillis || 0) / 1000));
        }
      } catch (e) {
        // ignore
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecordingInstance(null);
      if (uri) await uploadAudioAndSend(uri, durationSec);
    } catch (err) {
      console.warn('stopRecording failed', err);
      Alert.alert('Error', t('Failed to stop recording'));
    }
  };

  // --- Playback for audio attachments ---
  const playAudio = async (message: any) => {
    if (!ExpoAV) { Alert.alert('Audio not available'); return; }
    try {
      if (playingId === message.id) {
        // stop current
        setPlayingId(null);
        return;
      }
      setPlayingId(message.id);
      const soundObj = new ExpoAV.Audio.Sound();
      await soundObj.loadAsync({ uri: message.attachments[0].url });
      await soundObj.playAsync();
      soundObj.setOnPlaybackStatusUpdate((status: any) => {
        if (status?.didJustFinish) {
          setPlayingId(null);
          soundObj.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.warn('playAudio failed', err);
      setPlayingId(null);
    }
  };

  const formatDuration = (seconds: number | undefined | null) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  };

  const handlePressMessage = (message: any) => {
    const now = Date.now();
    if (lastTapRef.current.id === message.id && (now - lastTapRef.current.time) < 350) {
      // double tap -> quick heart
      lastTapRef.current = { id: null, time: 0 };
      handleToggleReaction(message.id, '❤️');
      return;
    }
    lastTapRef.current = { id: message.id, time: now };
    // clear after short window
    setTimeout(() => {
      if (Date.now() - lastTapRef.current.time >= 350) lastTapRef.current = { id: null, time: 0 };
    }, 400);
  };

  const handleTogglePin = async (messageId: string) => {
    if (!channel) return;
    try {
      const token = await TokenStore.getAccessToken();
      const targetId = channel.id || channel._id;
      // find message to see if pinned
      const msg = messages.find((m) => m.id === messageId);
      const isPinned = !!msg?.pinned;
      if (isPinned) {
        await axios.delete(`${MSG_SERVICE_URL}/channels/${targetId}/messages/${messageId}/pin`, { headers: { Authorization: `Bearer ${token}` } });
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, pinned: false } : m));
      } else {
        await axios.post(`${MSG_SERVICE_URL}/channels/${targetId}/messages/${messageId}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, pinned: true } : m));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to toggle pin');
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMsgId(message.id);
    setInput(message.content || '');
    setReactionMsgId(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:delete', { messageId }, (res: any) => {
      if (res?.ok) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m));
      } else {
        Alert.alert('Error', res?.error || 'Failed to delete message');
      }
    });
    setReactionMsgId(null);
  };

  const handleReplyTo = (message: any) => {
    setReplyingTo({ id: message.id, senderName: message.senderName, preview: message.content });
    setReactionMsgId(null);
  };

  const handleCopy = (text: string) => {
    try {
      Clipboard.setString(text || '');
    } catch (e) {}
    setReactionMsgId(null);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { height: 64, borderBottomWidth: 1, borderBottomColor: T.divider, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' },
    headerLeft: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    title: { fontSize: 16, fontWeight: '700', color: T.text },
    subtitle: { fontSize: 12, color: T.textMuted },
    // reduce bottom padding so messages fill the screen and sit just above input
    listContent: { padding: 16, paddingBottom: 24 },
    row: { marginVertical: 6, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end' },
    // bubble constraints: responsive max width and allow shrinking to prevent overflow
    bubbleLeft: { backgroundColor: T.surface, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, maxWidth: windowWidth * 0.65, minWidth: 72, alignSelf: 'flex-start', flexShrink: 1, marginHorizontal: 6, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ wordBreak: 'break-word', overflowWrap: 'break-word' } as any) : {}) },
    bubbleRight: { backgroundColor: isDark ? '#2E4C1F' : '#2ECC71', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, maxWidth: windowWidth * 0.65, minWidth: 72, alignSelf: 'flex-end', flexShrink: 1, marginHorizontal: 6, overflow: 'hidden', alignItems: 'flex-start', ...(Platform.OS === 'web' ? ({ wordBreak: 'break-word', overflowWrap: 'break-word' } as any) : {}) },
    msgText: { color: T.text, fontSize: 15, flexWrap: 'wrap', flexShrink: 1, minWidth: 0, ...(Platform.OS === 'web' ? ({ wordBreak: 'break-word', overflowWrap: 'break-word' } as any) : {}) },
    timeText: { fontSize: 11, color: T.textMuted, marginTop: 6 },
    // container for bubble + timestamp so timestamp sits under the bubble
    messageBlock: { flexDirection: 'column', alignItems: 'flex-start' },
    inputBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.divider },
    inputRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    textInput: { flex: 1, marginHorizontal: 8, backgroundColor: T.surfaceAlt, paddingVertical: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 12, borderRadius: 24, color: T.text },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#1E7A4D' : '#2ECC71', justifyContent: 'center', alignItems: 'center' },
  }), [T, isDark, isRTL, windowWidth]);

  const renderItem = ({ item }: { item: any }) => {
    const isMe = String(item.senderId) === String(user?._id);
    return (
      <>
      <View style={[styles.row, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}
      >
        {/* left avatar for incoming messages */}
        {!isMe && item.senderAvatarUrl ? <Image source={{ uri: item.senderAvatarUrl }} style={styles.avatar} /> : null}

        <View style={[styles.messageBlock, isMe ? { alignItems: 'flex-end' } : undefined]}>
          <TouchableOpacity
            activeOpacity={0.95}
            onLongPress={() => setReactionMsgId(item.id)}
            onPress={() => handlePressMessage(item)}
            style={isMe ? ((item.attachments && item.attachments.length > 0 && item.attachments[0].type === 'audio') ? { backgroundColor: 'transparent', padding: 0 } : styles.bubbleRight) : styles.bubbleLeft}
          >
            {item.attachments && item.attachments.length > 0 && item.attachments[0].type === 'audio' ? (
              <TouchableOpacity onPress={() => playAudio(item)} style={[isMe ? styles.bubbleRight : styles.bubbleLeft, isMe ? { backgroundColor: '#2ECC71' } : undefined, { paddingVertical: 10, paddingHorizontal: 12, minWidth: 160 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name={playingId === item.id ? 'pause' : 'play'} size={18} color={isMe ? '#fff' : T.text} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 10, marginRight: 8, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 28 }}>
                      {[6,10,14,20,14,10,8,12].map((h, idx) => (
                        <Animated.View key={idx} style={{ width: 4, marginHorizontal: 2, backgroundColor: isMe ? '#fff' : T.text, height: h, borderRadius: 2, opacity: playingId === item.id ? 1 : 0.85 }} />
                      ))}
                    </View>
                  </View>

                  <Text style={{ color: isMe ? '#fff' : T.text, fontSize: 12 }}>{formatDuration(item.attachments[0]?.duration || item.duration)}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.msgText, isMe ? { color: '#fff', textAlign: 'justify' } : undefined]}>{item.content}</Text>
            )}

            {item.reactionCounts && Object.keys(item.reactionCounts).length > 0 ? (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                {Object.entries(item.reactionCounts).map(([emoji, count]: any) => (
                  <TouchableOpacity key={emoji} onPress={() => handleToggleReaction(item.id, emoji)} style={{ backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 6 }}>
                    <Text>{emoji} {count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </TouchableOpacity>

          {/* timestamp below the bubble */}
          <Text style={[styles.timeText, isMe ? { textAlign: 'right' } : { textAlign: 'left' }]}>
            {new Date(item.createdAt || item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* right avatar for my messages (hidden to give more room to bubbles) */}
      </View>

      {/* Options Menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        {BlurView ? (
          <Pressable onPress={() => setMenuVisible(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setMenuVisible(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
        )}

        <View style={{ position: 'absolute', right: 12, top: (insets?.top || 0) + 56 }}>
          <Animated.View style={{ width: 220, backgroundColor: T.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 }}>
            <TouchableOpacity onPress={() => { setMenuVisible(false); openMembersSheet(); }} style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
              <Text style={{ color: T.text, fontWeight: '700' }}>Informations du groupe</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMenuVisible(false); openEditSheet(); }} style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
              <Text style={{ color: T.text, fontWeight: '700' }}>Modifier les informations du groupe</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Members Bottom Sheet */}
      <Modal visible={membersSheetVisible} transparent animationType="none">
        {BlurView ? (
          <Pressable onPress={() => closeMembersSheet()} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          </Pressable>
        ) : (
          <Pressable onPress={() => closeMembersSheet()} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
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
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 12,
            transform: [{ translateY: Animated.add(sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] }), pan) }]
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: T.divider }} />
          </View>

          {/* Header: Group photo + main info */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 }}>
              {channel?.avatarUrl || channel?.icon ? (
                <Image source={{ uri: channel.avatarUrl || channel.icon }} style={{ width: 96, height: 96 }} />
              ) : (
                <Ionicons name="people" size={44} color={T.textMuted} />
              )}
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: T.text, marginTop: 10 }}>{channel?.name || t('Group')}</Text>
            {channel?.description ? <Text style={{ color: T.textMuted, textAlign: 'center', marginTop: 6 }}>{channel.description}</Text> : null}
            <Text style={{ color: T.textMuted, marginTop: 6 }}>{members.length} membres</Text>
          </View>

          {/* Quick action buttons */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => { if (isAdmin) setShowAddList(true); else Alert.alert(t('Permission denied')); }} style={{ flex: 1, marginRight: 8, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>➕</Text>
              <Text style={{ color: T.text, fontWeight: '700', marginTop: 6 }}>Ajouter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openEditSheet()} style={{ flex: 1, marginHorizontal: 8, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>✏️</Text>
              <Text style={{ color: T.text, fontWeight: '700', marginTop: 6 }}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => copyChannelLink()} style={{ flex: 1, marginLeft: 8, padding: 10, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>🔗</Text>
              <Text style={{ color: T.text, fontWeight: '700', marginTop: 6 }}>Partager</Text>
            </TouchableOpacity>
          </View>

          {/* Members summary card + full list */}
          <View style={{ backgroundColor: T.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: T.textMuted, fontWeight: '800', marginBottom: 8 }}>MEMBRES</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: T.text }}>Membres : {members.length}</Text>
              <Text style={{ color: T.text }}>Administrateurs : {(members || []).filter((m:any) => (m.role||'').toLowerCase().includes('admin')).length}</Text>
            </View>
          </View>

          <Text style={{ color: T.textMuted, marginBottom: 8 }}>Liste des membres</Text>
          {membersLoading ? <ActivityIndicator /> : (
            members && members.length > 0 ? (
              <FlatList
                data={members}
                keyExtractor={(i) => String(i._id || i.id)}
                style={{ flex: 1 }}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider }}>
                    <Image source={{ uri: item.avatarUrl || item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: T.text, fontWeight: '700' }}>{item.fullName || item.name || item.displayName || item._id}</Text>
                      <Text style={{ color: T.textMuted, fontSize: 12 }}>{item.role || item.profileType || 'Membre'}</Text>
                    </View>
                    {isAdmin && String(item._id || item.id) !== String(user?._id) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => removeMember(item._id || item.id)} style={{ padding: 8 }}>
                          <Ionicons name="trash" size={18} color="#D9534F" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                )}
              />
            ) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: T.textMuted, marginBottom: 8 }}>Aucun membre listé pour ce groupe.</Text>
                <Text style={{ color: T.textMuted, fontSize: 12, marginBottom: 12 }}>Channel keys: {channel ? Object.keys(channel).join(', ') : 'n/a'}</Text>
                <TouchableOpacity onPress={() => fetchMembers()} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#2ECC71' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Rafraîchir</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          <View style={{ paddingVertical: 8 }}>
            {isAdmin ? (
              <>
                {!showAddList ? (
                  <TouchableOpacity onPress={() => setShowAddList(true)} style={{ backgroundColor: '#8BC34A', padding: 12, borderRadius: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Ajouter des membres</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ height: 220 }}>
                    <FlatList
                      data={(allUsers || []).filter(u => !(members || []).some((m:any) => String(m._id || m.id) === String(u._id || u.id)))}
                      keyExtractor={(i) => String(i._id || i.id)}
                      renderItem={({ item }) => {
                        const isSel = selectedToAdd.includes(String(item._id || item.id));
                        return (
                          <TouchableOpacity onPress={() => toggleSelectToAdd(String(item._id || item.id))} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                            <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: T.text, fontWeight: '700' }}>{item.fullName || item.name}</Text>
                              <Text style={{ color: T.textMuted, fontSize: 12 }}>{item.profileType || ''}</Text>
                            </View>
                            <View style={{ width: 44, alignItems: 'center' }}>
                              <TouchableOpacity onPress={() => toggleSelectToAdd(String(item._id || item.id))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isSel ? '#8BC34A' : T.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}>
                                {isSel ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Ionicons name="add" size={18} color={T.text} />}
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <TouchableOpacity onPress={() => { setShowAddList(false); setSelectedToAdd([]); }} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: T.surfaceAlt, alignItems: 'center', marginRight: 8 }}>
                        <Text style={{ color: T.text }}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={addMembers} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#2ECC71', alignItems: 'center' }} disabled={adding}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>{adding ? '...' : 'Ajouter'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </Animated.View>
      </Modal>

      {/* Edit Group Modal (centered with blur backdrop) */}
      <Modal visible={editSheetVisible} transparent animationType="none" onRequestClose={closeEditSheet}>
        {BlurView ? (
          <Pressable onPress={() => closeEditSheet()} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          </Pressable>
        ) : (
          <Pressable onPress={() => closeEditSheet()} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
        )}

        <Animated.View style={{
          width: '92%',
          alignSelf: 'center',
          marginTop: 80,
          borderRadius: 24,
          padding: 20,
          backgroundColor: modalBg,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 12,
          transform: [
            { scale: editModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            { translateY: editModalAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
          ],
          opacity: editModalAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.9, 1] })
        }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: T.divider }} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 12 }}>Modifier les informations du groupe</Text>

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => showImageOptions()} activeOpacity={0.85} style={{ width: 110, height: 110, borderRadius: 55, overflow: 'hidden', backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center' }} accessibilityLabel={t('Change Photo')}>
              {uploadingPhoto ? <ActivityIndicator /> : (
                editPhotoUri ? <Image source={{ uri: editPhotoUri }} style={{ width: 110, height: 110 }} /> : <Ionicons name="person-circle" size={64} color={T.textMuted} />
              )}

              <TouchableOpacity onPress={() => showImageOptions()} hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }} style={{ position: 'absolute', right: -6, bottom: -6, width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.divider }} accessibilityLabel={t('Change Photo') }>
                <Ionicons name="camera" size={18} color={T.text} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Floating label input */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ position: 'relative' }}>
              <Animated.Text pointerEvents="none" style={{ position: 'absolute', left: 14, top: nameFocused || editName ? 6 : 16, fontSize: nameFocused || editName ? 12 : 16, color: nameFocused ? T.text : T.textMuted, fontWeight: '600' }}>
                {t('Group name')}
              </Animated.Text>
              <TextInput
                value={editName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                onChangeText={setEditName}
                placeholder={nameFocused ? '' : t('Group name')}
                placeholderTextColor={T.textMuted}
                style={{ backgroundColor: T.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingTop: 22, paddingBottom: 12, color: T.text }}
              />
            </View>
          </View>

          <TouchableOpacity onPress={() => {
            // Debug-friendly save handler: log state, then proceed if changes exist
            if (saving) { console.warn('Save already in progress'); return; }
            console.log('[CommunityMessaging] Save button pressed', { isAdmin, isCreator, hasChanges, editName, editPhotoUri });
            if (!hasChanges) return;
            saveGroupEdits();
          }} style={{ backgroundColor: (!hasChanges || saving) ? 'rgba(46,204,113,0.35)' : '#2ECC71', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 }} accessibilityLabel={t('Save Changes')} accessibilityState={{ disabled: saving || !hasChanges }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{t('Enregistrer les modifications')}</Text>}
          </TouchableOpacity>

          {saving ? (
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }} pointerEvents="auto">
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : null}

          <View style={{ height: 1, backgroundColor: T.divider, marginVertical: 12 }} />

          {isCreator ? (
            <>
              <Text style={{ color: '#D9534F', fontWeight: '700', marginBottom: 8 }}>{t('Zone dangereuse')}</Text>
              <TouchableOpacity onPress={() => setConfirmDeleteVisible(true)} style={{ backgroundColor: '#FDECEA', padding: 12, borderRadius: 10, alignItems: 'center' }} accessibilityLabel={t('Delete Group')}>
                <Text style={{ color: '#A94442', fontWeight: '700' }}>{t('Supprimer le groupe')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal visible={confirmDeleteVisible} transparent animationType="none" onRequestClose={() => setConfirmDeleteVisible(false)}>
        {BlurView ? (
          <Pressable onPress={() => setConfirmDeleteVisible(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setConfirmDeleteVisible(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
        )}

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={{ width: '86%', backgroundColor: modalBg, padding: 18, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 8 }}>{t('Are you sure?')}</Text>
            <Text style={{ color: T.textMuted, marginBottom: 16 }}>{t('This action cannot be undone.')}</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => setConfirmDeleteVisible(false)} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: T.surfaceAlt, alignItems: 'center', marginRight: 8 }}>
                <Text style={{ color: T.text }}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={performDeleteGroup} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#E74C3C', alignItems: 'center' }}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{t('Delete')}</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      </>
    );
  };

  const selectedMsg = messages.find((m) => m.id === reactionMsgId);

  if (!channel) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>{t('Loading channel...')}</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={22} color={T.text} />
          </TouchableOpacity>
          {(() => {
            const display = getChatDisplay(channel);
            return (
              <>
                {display.avatar ? <Image source={{ uri: display.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: T.surfaceAlt }]} />}
                <View>
                  <Text style={styles.title}>{display.name}</Text>
                  <Text style={styles.subtitle}>{t('Online')}</Text>
                </View>
              </>
            );
          })()}
        </View>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => setMenuVisible(true)} accessibilityLabel="Options">
            <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      {pinnedMessages.length > 0 && (
        <TouchableOpacity onPress={() => {
          // scroll to last pinned
          const lastPinned = pinnedMessages[pinnedMessages.length - 1];
          const index = messages.findIndex(m => m.id === lastPinned.id);
          if (index >= 0) try { listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); } catch (e) {}
        }} style={{ position: 'absolute', top: (insets?.top || 0) + 64, left: 12, right: 12, backgroundColor: T.surface, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', zIndex: 20 }}>
          <Ionicons name="pin" size={14} color={T.green} />
          <Text numberOfLines={1} style={{ marginLeft: 8, color: T.text, fontWeight: '600' }}>{pinnedMessages[pinnedMessages.length - 1].content || t('[Attachment]')}</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(i) => i.id || i._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}

      {/* Reaction / Action Modal */}
      <Modal visible={!!reactionMsgId} transparent animationType="fade">
        {BlurView ? (
          <Pressable onPress={() => setReactionMsgId(null)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setReactionMsgId(null)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: overlayFallback }} />
        )}

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: modalBg, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12 }}>
              {reactionEmojis.map((emoji) => (
                <TouchableOpacity key={emoji} onPress={() => { if (reactionMsgId) handleToggleReaction(reactionMsgId, emoji); setReactionMsgId(null); }} style={{ paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 1, backgroundColor: '#EFEFEF' }} />

            <TouchableOpacity onPress={() => { if (reactionMsgId) handleReplyTo(selectedMsg); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#222', fontSize: 16 }}>{t('Reply')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { if (selectedMsg) handleCopy(selectedMsg.content || ''); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#222', fontSize: 16 }}>{t('Copy Text')}</Text>
            </TouchableOpacity>

            {selectedMsg?.senderId === user?._id && !selectedMsg?.deletedAt ? (
              <>
                <TouchableOpacity onPress={() => { if (selectedMsg) handleStartEdit(selectedMsg); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: '#222', fontSize: 16 }}>{t('Edit Message')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { if (selectedMsg) handleDeleteMessage(selectedMsg.id); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: '#D9534F', fontSize: 16 }}>{t('Delete Message')}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <View style={{ height: 8, backgroundColor: '#F8F8F8' }} />

            <TouchableOpacity onPress={() => { if (reactionMsgId) handleTogglePin(reactionMsgId); setReactionMsgId(null); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#222', fontSize: 16 }}>{selectedMsg?.pinned ? t('Unpin Message') : t('Pin Message')}</Text>
            </TouchableOpacity>

            <View style={{ height: 8, backgroundColor: '#F8F8F8' }} />

            <TouchableOpacity onPress={() => setReactionMsgId(null)} style={{ paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: T.textMuted }}>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emoji pop animation */}
      {popEmoji ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 36, bottom: 120, transform: [{ scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.15] }) }], opacity: popAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }) }}>
          <Text style={{ fontSize: 40 }}>{popEmoji}</Text>
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90 + insets.bottom}>
        <View style={[styles.inputBar, { bottom: insets.bottom }] }>
          {replyingTo ? (
            <View style={{ backgroundColor: T.surface, padding: 8, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.textMuted, fontSize: 12 }}>{t('Replying to')} <Text style={{ color: T.text, fontWeight: '700' }}>{replyingTo.senderName}</Text></Text>
                <Text style={{ color: T.textMuted, fontSize: 12 }} numberOfLines={1}>{replyingTo.preview}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 8 }}>
                <Ionicons name="close" size={18} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => {}} style={{ padding: 8 }}>
              <Ionicons name="add" size={20} color={T.text} />
            </TouchableOpacity>
            <TouchableOpacity onPressIn={() => startRecording()} onPressOut={() => stopRecordingAndSend()} style={{ padding: 8, marginLeft: 6 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isRecording ? '#D9534F' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="mic" size={18} color={isRecording ? '#fff' : T.text} />
              </View>
            </TouchableOpacity>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('Message')}
              placeholderTextColor={T.textMuted}
              style={styles.textInput}
              multiline
            />
            <TouchableOpacity onPress={() => { handleSend(); setReplyingTo(null); }} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
