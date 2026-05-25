import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import type { UpdateProfileDto } from '@/modules/auth/api/auth.api';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

const C = {
  green:    '#8BC34A',
  dark:     '#2E2E2E',
  bg:       '#F6F5F3',
  white:    '#FFFFFF',
  muted:    '#6B6B6B',
  border:   '#C4C4C4',
  red:      '#C8102E',
  greenLight: 'rgba(139,195,74,0.12)',
};

// ── Single input field ─────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  iconName?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}

function Field({ label, value, onChangeText, placeholder, iconName, keyboardType = 'default', autoCapitalize = 'words' }: FieldProps) {
  return (
    <View style={f.group}>
      <Text style={f.label}>{label}</Text>
      <View style={f.inputWrap}>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor="rgba(46,46,46,0.4)"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {iconName && (
          <View style={f.icon}>
            <MaterialCommunityIcons name={iconName as any} size={18} color={C.green} />
          </View>
        )}
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  group:     { marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6 },
  inputWrap: { position: 'relative' },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    paddingRight: 44, fontSize: 15, color: C.dark,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  icon: {
    position: 'absolute', right: 14, top: 0, bottom: 0,
    justifyContent: 'center',
  },
});

// ── EditProfileScreen ──────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [phone,    setPhone]    = useState(user?.phone ?? '');
  const [bio,      setBio]      = useState(user?.bio ?? '');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    setError('');
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      const dto: UpdateProfileDto = {
        fullName: fullName.trim(),
        phone:    phone.trim() || undefined,
        bio:      bio.trim()   || undefined,
      };
      await updateProfile(dto);
      Alert.alert('Saved ✅', 'Your profile has been updated!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} id="edit-back-btn">
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.dark} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <TouchableOpacity style={s.headerBtn} id="edit-notif-btn">
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Photo ──────────────────────────────────────────────────── */}
          <View style={s.photoSection}>
            <View style={s.photoWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' }}
                style={s.photo}
              />
              <TouchableOpacity style={s.cameraBtn} id="edit-camera-btn">
                <MaterialCommunityIcons name="camera" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.changePhotoBtn} id="edit-change-photo-btn">
              <MaterialCommunityIcons name="image-plus" size={16} color={C.dark} />
              <Text style={s.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <View style={s.divider} />

          {/* ── Form ───────────────────────────────────────────────────── */}
          <View style={s.form}>
            {/* Error banner */}
            {!!error && (
              <View style={s.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.red} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <Field
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              iconName="check-circle-outline"
            />
            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              iconName="email-check-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+216 XX XXX XXX"
              iconName="phone-check-outline"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            {/* Bio */}
            <View style={{ marginBottom: 28 }}>
              <Text style={f.label}>Bio</Text>
              <TextInput
                style={[f.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the community something about yourself..."
                placeholderTextColor="rgba(46,46,46,0.4)"
                multiline
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.75 }]}
              onPress={handleSave}
              disabled={saving}
              id="edit-save-btn"
            >
              {saving ? (
                <MaterialCommunityIcons name="loading" size={22} color={C.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={20} color={C.white} />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Nav */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Home')} id="edit-nav-home">
          <MaterialCommunityIcons name="home-outline" size={24} color={C.dark} />
          <Text style={s.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navBtn} id="edit-nav-events">
          <MaterialCommunityIcons name="calendar-outline" size={24} color={C.dark} />
          <Text style={s.navLabel}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.fab} id="edit-nav-fab">
          <MaterialCommunityIcons name="plus" size={28} color={C.white} />
        </TouchableOpacity>

        <TouchableOpacity style={s.navBtn} id="edit-nav-reels">
          <MaterialCommunityIcons name="play-circle-outline" size={24} color={C.dark} />
          <Text style={s.navLabel}>Reels</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navBtn}
          onPress={() => {
            if (user?.profileType === 'pro_commerce') {
              navigation.navigate('SellerProfile');
            } else {
              navigation.navigate('Profile');
            }
          }}
          id="edit-nav-profile"
        >
          <MaterialCommunityIcons name="account" size={24} color={C.green} />
          <Text style={[s.navLabel, { color: C.green }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    paddingTop: 12, paddingBottom: 8,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.dark },

  scroll: { paddingHorizontal: 20, paddingTop: 10 },

  // Photo
  photoSection: { alignItems: 'center', paddingVertical: 24 },
  photoWrap:    { position: 'relative', marginBottom: 16 },
  photo: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 4, borderColor: C.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  cameraBtn: {
    position: 'absolute', bottom: 6, right: 6,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.white,
  },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECECEC', borderRadius: 30,
    paddingHorizontal: 18, paddingVertical: 10,
    elevation: 1,
  },
  changePhotoText: { fontSize: 13, fontWeight: '500', color: C.dark },

  divider: { height: 1, backgroundColor: 'rgba(46,46,46,0.08)', marginBottom: 24 },
  form:    {},

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(200,16,46,0.08)', borderWidth: 1,
    borderColor: 'rgba(200,16,46,0.3)', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: C.red, fontWeight: '500' },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.green, borderRadius: 14,
    paddingVertical: 15, marginBottom: 10,
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: C.white },

  // Bottom Nav
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: C.white, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-around', paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  navBtn:   { alignItems: 'center', gap: 2, minWidth: 48 },
  navLabel: { fontSize: 8, fontWeight: '500', color: C.dark, marginTop: 2 },
  fab: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 4, borderColor: C.bg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
  },
});
