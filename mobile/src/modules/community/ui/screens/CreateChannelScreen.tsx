import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import http from '../../../../core/network/http.client';
import messagingHttp from '../../../../core/network/messaging-http.client';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { useAuth } from '../../../auth/state/auth.context';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CORE_API_URL = API_BASE_URL;

export default function CreateChannelScreen({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [creating, setCreating] = useState(false);

  const pickImage = async (type: 'avatar' | 'cover') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('Permission Denied ❌'), t('You must allow photo library access to upload media.'));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
      });
      const uri = res?.assets && res.assets.length > 0 ? res.assets[0].uri : (res as any).uri;
      if (!uri) return;

      if (type === 'avatar') {
        setAvatarUri(uri);
        await uploadImage(uri, 'avatar');
      } else {
        setCoverUri(uri);
        await uploadImage(uri, 'cover');
      }
    } catch (err) {
      console.warn('pickImage failed', err);
      Alert.alert('Error', t('Failed to pick image'));
    }
  };

  const uploadImage = async (uri: string, type: 'avatar' | 'cover') => {
    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const filename = uri.split('/').pop() || `${type}.jpg`;
      const form = new FormData();

      if (Platform.OS === 'web' || (typeof uri === 'string' && uri.startsWith('blob:'))) {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const fileObj: any = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'image/jpeg' }) : blob;
        form.append('file', fileObj);
      } else {
        form.append('file', { uri, name: filename, type: 'image/jpeg' } as any);
      }

      const uploadRes = await http.post(`${CORE_API_URL}/uploads`, form, {
        timeout: 60000,
      });
      const body = uploadRes.data;
      const data = body?.data;
      if (!data || !data.url) throw new Error('Invalid upload response');

      if (type === 'avatar') {
        setUploadedAvatarUrl(data.url);
      } else {
        setUploadedCoverUrl(data.url);
      }
    } catch (err) {
      console.warn('uploadImage failed', err);
      Alert.alert('Error', t('Failed to upload image'));
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    if (!channelName.trim()) {
      Alert.alert(t('Validation Error'), t('Please enter a channel name.'));
      return;
    }
    setCreating(true);

    try {
      // Connect to messaging-service endpoints directly (which is on port 5001 or uses custom client /channels/channel)
      const payload: any = {
        name: channelName.trim(),
        description: description.trim() || undefined,
        avatarUrl: uploadedAvatarUrl || undefined,
        coverImageUrl: uploadedCoverUrl || undefined,
      };

      // Create channel via backend REST API
      const res = await messagingHttp.post('/channels/channel', payload);
      const ch = res.data?.data || res.data;
      console.debug('[CreateChannelScreen] created channel response:', ch);
      setCreating(false);
      navigation.navigate('CommunityChat', {
        initialChannel: ch,
        channelId: String(ch.id || ch._id)
      });
    } catch (err: any) {
      console.warn('create channel request failed', err);
      setCreating(false);
      Alert.alert(
        t('Error'),
        err?.response?.data?.error || err?.message || t('Failed to create channel')
      );
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    title: { fontSize: 20, fontWeight: '900', color: T.text, marginLeft: 8 },
    scroll: { flex: 1 },
    content: { padding: 18 },
    label: { color: T.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
    input: { backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: T.text, marginBottom: 20, borderWidth: 1, borderColor: T.divider, fontSize: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    avatarSection: { alignItems: 'center', marginBottom: 24, position: 'relative' },
    avatarWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: T.divider, overflow: 'hidden' },
    avatarImg: { width: 90, height: 90 },
    coverSection: { width: '100%', height: 140, borderRadius: 12, backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 24, overflow: 'hidden', borderStyle: 'dashed', borderWidth: coverUri ? 0 : 1.5, borderColor: T.divider },
    coverImg: { width: '100%', height: 140 },
    cameraIcon: { position: 'absolute', bottom: 0, right: screenWidth / 2 - 45 - 2, width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.divider },
    btnCreate: { backgroundColor: '#8BC34A', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#8BC34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, marginTop: 10 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
  }), [T, isRTL, screenWidth, coverUri]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Create Channel')}</Text>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.content}>
          
          {/* Cover image picker */}
          <Text style={styles.label}>{t('Channel Cover Image')}</Text>
          <TouchableOpacity style={styles.coverSection} onPress={() => pickImage('cover')} activeOpacity={0.8}>
            {uploadingCover ? <ActivityIndicator size="small" color={T.green} /> : (
              coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImg} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="image-outline" size={32} color={T.textMuted} />
                  <Text style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>{t('Upload cover image (16:9)')}</Text>
                </View>
              )
            )}
          </TouchableOpacity>

          {/* Avatar image picker */}
          <Text style={styles.label}>{t('Channel Avatar')}</Text>
          <TouchableOpacity style={styles.avatarSection} onPress={() => pickImage('avatar')} activeOpacity={0.8}>
            <View style={styles.avatarWrap}>
              {uploadingAvatar ? <ActivityIndicator size="small" color={T.green} /> : (
                avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="camera-outline" size={32} color={T.textMuted} />
                )
              )}
            </View>
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color={T.text} />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>{t('Channel Name')}</Text>
          <TextInput
            placeholder={t('Enter channel name')}
            placeholderTextColor={T.textMuted}
            value={channelName}
            onChangeText={setChannelName}
            style={styles.input}
            maxLength={100}
          />

          <Text style={styles.label}>{t('Description')}</Text>
          <TextInput
            placeholder={t('What is this channel about?')}
            placeholderTextColor={T.textMuted}
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <TouchableOpacity style={styles.btnCreate} onPress={handleCreate} disabled={creating || uploadingAvatar || uploadingCover}>
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t('Create Channel')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
