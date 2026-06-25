import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import type { UpdateProfileDto } from '@/modules/auth/api/auth.api';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

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
  const { theme: T } = useTheme();
  
  const f = React.useMemo(() => StyleSheet.create({
    group:     { marginBottom: 20 },
    label:     { fontSize: 13, fontWeight: '600', color: T.textSub, marginBottom: 6, fontFamily: 'Poppins_600SemiBold' },
    inputWrap: { position: 'relative' },
    input: {
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
      paddingRight: 44, fontSize: 15, color: T.text, fontFamily: 'Poppins_400Regular',
    },
    icon: {
      position: 'absolute', right: 14, top: 0, bottom: 0,
      justifyContent: 'center',
    },
  }), [T]);

  return (
    <View style={f.group}>
      <Text style={f.label}>{label}</Text>
      <View style={f.inputWrap}>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={T.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {iconName && (
          <View style={f.icon}>
            <MaterialCommunityIcons name={iconName as any} size={18} color={T.green} />
          </View>
        )}
      </View>
    </View>
  );
}

// ── EditProfileScreen ──────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [phone,    setPhone]    = useState(user?.phone ?? '');
  const [bio,      setBio]      = useState(user?.bio ?? '');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },

    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', paddingHorizontal: 20,
      paddingTop: 12, paddingBottom: 8,
    },

    headerBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
      elevation: 2,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: T.text, fontFamily: 'Poppins_700Bold' },

    scroll: { paddingHorizontal: 20, paddingTop: 10 },

    // Photo
    photoSection: { alignItems: 'center', paddingVertical: 24 },
    photoWrap:    { position: 'relative', marginBottom: 16 },
    photo: {
      width: 130, height: 130, borderRadius: 65,
      borderWidth: 4, borderColor: T.surface,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
    cameraBtn: {
      position: 'absolute', bottom: 6, right: 6,
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: T.green, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: T.surface,
    },
    changePhotoBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: T.surfaceAlt, borderRadius: 30,
      paddingHorizontal: 18, paddingVertical: 10,
      elevation: 1,
    },
    changePhotoText: { fontSize: 13, fontWeight: '500', color: T.text, fontFamily: 'Poppins_500Medium' },

    divider: { height: 1, backgroundColor: T.border, marginBottom: 24 },
    form:    {},

    // Field/Input Styles used for Bio
    fieldLabel: { fontSize: 13, fontWeight: '600', color: T.textSub, marginBottom: 6, fontFamily: 'Poppins_600SemiBold' },
    fieldInput: {
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
      fontSize: 15, color: T.text, fontFamily: 'Poppins_400Regular',
    },

    // Error
    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: T.redLight, borderWidth: 1,
      borderColor: T.red, borderRadius: 10,
      padding: 12, marginBottom: 16,
    },
    errorText: { flex: 1, fontSize: 13, color: T.red, fontWeight: '500', fontFamily: 'Poppins_500Medium' },

    // Save
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: T.green, borderRadius: 14,
      paddingVertical: 15, marginBottom: 10,
      shadowColor: T.green, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins_700Bold' },

    // Bottom Nav
    bottomNav: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
      backgroundColor: T.surface, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-around', paddingBottom: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
    },
    navBtn:   { alignItems: 'center', gap: 2, minWidth: 48 },
    navLabel: { fontSize: 8, fontWeight: '500', color: T.text, marginTop: 2, fontFamily: 'Poppins_500Medium' },
    fab: {
      width: 60, height: 60, borderRadius: 30, backgroundColor: T.green,
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      borderWidth: 4, borderColor: T.bg,
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
    },

    // Custom Success Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(46,46,46,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCard: {
      width: '80%',
      backgroundColor: T.surface,
      borderRadius: 20,
      paddingVertical: 30,
      paddingHorizontal: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    modalIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: T.greenLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: T.text,
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: 'Poppins_700Bold',
    },
    modalSubtitle: {
      fontSize: 13,
      color: T.textMuted,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 18,
      fontFamily: 'Poppins_400Regular',
    },
    modalOkayBtn: {
      width: '100%',
      backgroundColor: T.green,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    modalOkayBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: 'Poppins_700Bold',
    },
  }), [T]);

  async function pickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(t('Permission Denied'), t('You must allow photo library access to change your profile picture.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setLocalAvatar(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setLocalAvatar(asset.uri);
      }
    }
  }

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
      if (localAvatar && localAvatar.startsWith('data:')) {
        dto.avatarUrl = localAvatar;
      }
      await updateProfile(dto);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }, 1800);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScaffold
      title="Edit Profile"
      activeTab="profile"
      onBack={() => navigation.goBack()}
      rightIcon="bell-outline"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => {
        if (user?.profileType === 'pro_commerce') {
          navigation.navigate('SellerProProfile');
        } else {
          navigation.navigate('Profile');
        }
      }}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Photo ──────────────────────────────────────────────────── */}
          <View style={[s.photoSection, { backgroundColor: T.bg }]}>
            <View style={s.photoWrap}>
              <Image
                source={{ uri: localAvatar || user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' }}
                style={s.photo}
              />
              <TouchableOpacity style={s.cameraBtn} id="edit-camera-btn" onPress={pickImage}>
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.changePhotoBtn, { backgroundColor: T.surfaceAlt }]} id="edit-change-photo-btn" onPress={pickImage}>
              <MaterialCommunityIcons name="image-plus" size={16} color={T.green} />
              <Text style={[s.changePhotoText, { color: T.text }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <View style={s.divider} />

          {/* ── Form ───────────────────────────────────────────────────── */}
          <View style={s.form}>
            {/* Error banner */}
            {!!error && (
              <View style={s.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={T.red} />
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
              <Text style={s.fieldLabel}>Bio</Text>
              <TextInput
                style={[s.fieldInput, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the community something about yourself..."
                placeholderTextColor={T.textMuted}
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
                <MaterialCommunityIcons name="loading" size={22} color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={20} color="#FFFFFF" />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sleek Success Feedback Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconCircle}>
              <MaterialCommunityIcons name="check-circle" size={44} color={T.green} />
            </View>
            <Text style={s.modalTitle}>Profile Updated! 🎉</Text>
            <Text style={s.modalSubtitle}>Your changes have been saved successfully.</Text>
            <TouchableOpacity
              style={s.modalOkayBtn}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={s.modalOkayBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </AppScaffold>
  );
}


