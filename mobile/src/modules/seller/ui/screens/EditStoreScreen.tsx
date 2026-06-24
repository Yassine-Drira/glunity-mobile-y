import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Easing,
  Switch,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import type { UpdateProfileDto } from '@/modules/auth/api/auth.api';
import { MapWebView } from '@/modules/map/ui/components/MapWebView';

type Props = NativeStackScreenProps<AppStackParamList, 'EditStore'>;

// ── Beautiful input card component ────────────────────────────────────────────
interface InputCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  multiline?: boolean;
  hint?: string;
  suffix?: string;
  rightElement?: React.ReactNode;
}

function InputCard({
  icon,
  iconColor,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  hint,
  suffix,
  rightElement,
}: InputCardProps) {
  const { theme: T } = useTheme();
  const { t, isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: false }).start();
  };

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [T.border, iconColor ?? T.green],
  });

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{
        fontSize: 11, fontWeight: '700', fontFamily: 'Poppins_700Bold',
        color: focused ? (iconColor ?? T.green) : T.textMuted,
        marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase',
        textAlign: isRTL ? 'right' : 'left', width: '100%',
      }}>
        {t(label)}
      </Text>
      <Animated.View style={{
        borderWidth: 1.5, borderColor, borderRadius: 16, backgroundColor: T.surface,
        overflow: 'hidden',
        shadowColor: focused ? (iconColor ?? T.green) : '#000',
        shadowOffset: { width: 0, height: focused ? 4 : 1 },
        shadowOpacity: focused ? 0.15 : 0.04, shadowRadius: focused ? 8 : 3, elevation: focused ? 4 : 1,
      }}>
        <View style={{
          flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: multiline ? 'flex-start' : 'center',
          paddingHorizontal: 16, paddingVertical: multiline ? 14 : 0, minHeight: multiline ? 100 : 54,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: focused ? (iconColor ? `${iconColor}22` : `${T.green}22`) : T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
          }}>
            <Feather name={icon as any} size={17} color={focused ? (iconColor ?? T.green) : T.textMuted} />
          </View>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ? t(placeholder) : ''}
            placeholderTextColor={T.textMuted}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
              flex: 1, fontSize: 15, color: T.text, fontFamily: 'Poppins_400Regular',
              textAlign: isRTL ? 'right' : 'left',
              textAlignVertical: multiline ? 'top' : 'center',
              paddingVertical: multiline ? 0 : 16, lineHeight: multiline ? 22 : undefined,
            }}
          />
          {suffix && !multiline && (
            <Text style={{
              fontSize: 12, color: T.textMuted, fontFamily: 'Poppins_400Regular',
              marginLeft: isRTL ? 0 : 4,
              marginRight: isRTL ? 4 : 0,
            }}>
              {t(suffix)}
            </Text>
          )}
          {rightElement}
        </View>
      </Animated.View>
      {hint && (
        <Text style={{
          fontSize: 10, color: T.textMuted, fontFamily: 'Poppins_400Regular', marginTop: 5,
          marginLeft: isRTL ? 0 : 4,
          marginRight: isRTL ? 4 : 0,
          textAlign: isRTL ? 'right' : 'left',
        }}>
          {t(hint)}
        </Text>
      )}
    </View>
  );
}

function SectionHeader({ icon, title, subtitle, color }: { icon: string; title: string; subtitle?: string; color: string }) {
  const { theme: T } = useTheme();
  const { t, isRTL } = useLanguage();
  return (
    <View style={{
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center', marginBottom: 18, marginTop: 8,
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 13, backgroundColor: `${color}20`,
        alignItems: 'center', justifyContent: 'center',
        marginRight: isRTL ? 0 : 12,
        marginLeft: isRTL ? 12 : 0,
      }}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text, textAlign: isRTL ? 'right' : 'left' }}>{t(title)}</Text>
        {subtitle && <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_400Regular', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>{t(subtitle)}</Text>}
      </View>
    </View>
  );
}

// ── Default Schedule Template ──────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type DaySchedule = { active: boolean; open: string; close: string };
type WeekSchedule = Record<string, DaySchedule>;

function parseSchedule(str: string): WeekSchedule {
  const s: WeekSchedule = {};
  DAYS.forEach(d => s[d] = { active: false, open: '08:00', close: '18:00' });
  // If it's empty, default Mon-Fri open
  if (!str) {
    ['Mon','Tue','Wed','Thu','Fri'].forEach(d => s[d].active = true);
    return s;
  }
  // Try to naively see if a day is mentioned, else leave fallback
  DAYS.forEach(d => {
    if (str.includes(d) || str.toLowerCase().includes('7 day') || str.toLowerCase().includes('everyday')) {
      s[d].active = true;
    }
  });
  return s;
}

function serializeSchedule(sched: WeekSchedule): string {
  const activeDays = DAYS.filter(d => sched[d].active);
  if (activeDays.length === 0) return 'Closed';
  if (activeDays.length === 7) return `Open 7 days • ${sched['Mon'].open} - ${sched['Mon'].close}`;
  if (activeDays.length === 5 && activeDays.includes('Mon') && activeDays.includes('Fri') && !activeDays.includes('Sat')) {
    return `Open Mon-Fri • ${sched['Mon'].open} - ${sched['Mon'].close}`;
  }
  if (activeDays.length === 6 && activeDays.includes('Mon') && activeDays.includes('Sat')) {
    return `Open Mon-Sat • ${sched['Mon'].open} - ${sched['Mon'].close}`;
  }
  // Custom mixed string
  const parts = DAYS.filter(d => sched[d].active).map(d => `${d} ${sched[d].open}-${sched[d].close}`);
  return parts.join(', ');
}


// ── EditStoreScreen ─────────────────────────────────────────────────────────────
export default function EditStoreScreen({ navigation, route }: Props) {
  const { user, updateProfile } = useAuth();
  const { theme: T } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const isSeller = user?.profileType === 'pro_commerce';

  // Support changing the page language via route params
  useEffect(() => {
    const l = route.params?.lang;
    if (l) {
      const cleanLang = String(l).toLowerCase();
      if (cleanLang === 'fr' && language !== 'fr') {
        setLanguage('fr');
      } else if ((cleanLang === 'ar' || cleanLang === 'arab') && language !== 'ar') {
        setLanguage('ar');
      } else if ((cleanLang === 'en' || cleanLang === 'eng') && language !== 'en') {
        setLanguage('en');
      }
    }
  }, [route.params?.lang, language]);

  const storeInfo = user?.storeInfo || {};
  const [storeName, setStoreName] = useState(storeInfo.storeName ?? '');
  const [description, setDescription] = useState(storeInfo.description ?? '');
  const [address, setAddress] = useState(storeInfo.address ?? '');
  const [operatingHours, setOperatingHours] = useState(storeInfo.operatingHours ?? '');
  const [phone, setPhone] = useState(storeInfo.phone ?? '');
  const [imageUrl, setImageUrl] = useState(storeInfo.imageUrl ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{lat: number, lng: number} | null>(null);

  async function pickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(t("Permission Denied ❌"), t("You must allow photo library access to upload a cover photo."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setImageUrl(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setImageUrl(asset.uri);
      }
    }
  }

  // Time Picker State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>(() => parseSchedule(storeInfo.operatingHours ?? ''));

  const successScale = useRef(new Animated.Value(0.6)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const openSuccess = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(successScale, { toValue: 0.8, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(successOpacity, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => {
        setShowSuccess(false);
        navigation.goBack();
      });
    }, 2000);
  };

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const dto: any = {
        storeInfo: {
          storeName: storeName.trim() || undefined,
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          operatingHours: operatingHours.trim() || undefined,
          phone: phone.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        }
      };
      await updateProfile(dto);
      openSuccess();
    } catch {
      setError(t('Failed to save store info. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const s = React.useMemo(() => StyleSheet.create({
    scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    heroBanner: {
      borderRadius: 20, backgroundColor: T.green, padding: 20,
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 28, marginTop: 8,
    },
    heroBannerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginBottom: 4, textAlign: isRTL ? 'right' : 'left' },
    heroBannerSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.82)', lineHeight: 17, textAlign: isRTL ? 'right' : 'left' },
    heroBannerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 },
    divider: { height: 1, backgroundColor: T.border, marginBottom: 28, marginTop: 8 },
    errorBox: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, backgroundColor: T.redLight, borderWidth: 1, borderColor: T.red, borderRadius: 12, padding: 14, marginBottom: 20 },
    errorText: { flex: 1, fontSize: 13, color: T.red, fontFamily: 'Poppins_500Medium', textAlign: isRTL ? 'right' : 'left' },
    
    // Pickers
    mapModalContainer: { flex: 1, backgroundColor: T.bg },
    mapModalHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.border, paddingTop: 50 },
    mapModalTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: T.text },
    mapModalConfirmBtn: { backgroundColor: T.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    mapModalConfirmText: { color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

    schedModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    schedModalBody: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '80%' },
    schedRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
    schedDayText: { flex: 1, fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: T.text, textAlign: isRTL ? 'right' : 'left' },
    schedTimeBox: { backgroundColor: T.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: T.border, minWidth: 64, alignItems: 'center' },
    schedTimeText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: T.text },

    saveBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: T.green, borderRadius: 18, paddingVertical: 17,
      shadowColor: T.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },
    saveBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
    
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    successCard: { width: '78%', backgroundColor: T.surface, borderRadius: 28, paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
    successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: T.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    successTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text, textAlign: 'center', marginBottom: 8 },
    successSub: { fontSize: 13, color: T.textMuted, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 19 },
  }), [T, isRTL]);

  if (!isSeller) {
    return (
      <AppScaffold title={t("Error")} activeTab="profile" onBack={() => navigation.goBack()} contentStyle={{ backgroundColor: T.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: T.text }}>{t("You are not authorized to view this page.")}</Text>
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold title={t("Edit Store Info")} activeTab="profile" onBack={() => navigation.goBack()} contentStyle={{ backgroundColor: T.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.heroBanner}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroBannerTitle}>{t("Store Information")}</Text>
              <Text style={s.heroBannerSub}>{t("Keep your address, hours and\ncontact details up to date.")}</Text>
            </View>
            <View style={s.heroBannerIcon}>
              <Feather name="home" size={24} color="#FFFFFF" />
            </View>
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={18} color={T.red} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <SectionHeader icon="star" title="Basics" subtitle="Public store identity" color={T.green} />

          <InputCard icon="tag" iconColor={T.green} label="Store Name" value={storeName} onChangeText={setStoreName} placeholder="e.g. 100% Gluten-Free Bakery" hint="Leave blank to use your personal name as the store name" />
          <InputCard icon="info" iconColor={T.green} label="Description" value={description} onChangeText={setDescription} placeholder="e.g. Certified safe for celiacs since 2018..." multiline hint="Tell customers what makes your store special" />

          <View style={s.divider} />

          <SectionHeader icon="phone" title="Contact" subtitle="How customers can reach your store" color="#3B82F6" />
          <InputCard icon="phone" iconColor="#3B82F6" label="Store Phone Number" value={phone} onChangeText={setPhone} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" autoCapitalize="none" hint="Include country code for international customers" />

          <View style={s.divider} />

          <SectionHeader icon="map-pin" title="Location & Hours" subtitle="Where and when customers can visit" color="#EF4444" />
          <InputCard 
            icon="map-pin" iconColor="#EF4444" label="Store Address" value={address} onChangeText={setAddress} 
            placeholder="e.g. 125 Rue Casablanca, Tunis" multiline 
            hint="Enter your full street address including city"
            rightElement={
              <TouchableOpacity onPress={() => setShowMapPicker(true)} style={{ position: 'absolute', left: isRTL ? 12 : undefined, right: isRTL ? undefined : 12, top: 12, backgroundColor: '#EF444420', padding: 8, borderRadius: 8 }}>
                <Feather name="map" size={16} color="#EF4444" />
              </TouchableOpacity>
            }
          />

          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 11, fontWeight: '700', fontFamily: 'Poppins_700Bold',
              color: T.textMuted, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase',
              textAlign: isRTL ? 'right' : 'left', width: '100%'
            }}>
              {t("Store Cover Image")}
            </Text>
            {imageUrl ? (
              <View style={{ borderRadius: 16, overflow: 'hidden', height: 160, borderWidth: 1.5, borderColor: T.border, position: 'relative' }}>
                <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                <TouchableOpacity 
                  onPress={pickImage} 
                  style={{
                    position: 'absolute', 
                    left: isRTL ? 12 : undefined,
                    right: isRTL ? undefined : 12, 
                    bottom: 12, 
                    backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 8, paddingHorizontal: 12, 
                    borderRadius: 10, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6
                  }}
                >
                  <Feather name="camera" size={13} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'Poppins_600SemiBold' }}>{t("Change Photo")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={pickImage}
                style={{
                  borderWidth: 2, borderStyle: 'dashed', borderColor: T.border, borderRadius: 16,
                  height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceAlt,
                  gap: 6
                }}
              >
                <Feather name="image" size={24} color={T.textMuted} style={{ marginBottom: 2 }} />
                <Text style={{ fontSize: 13, color: T.textSub, fontFamily: 'Poppins_600SemiBold' }}>{t("Upload Store Cover Image")}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted, fontFamily: 'Poppins_400Regular' }}>{t("Tap to browse device photo library")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <InputCard 
            icon="link" iconColor="#EF4444" label="Store Image URL" value={imageUrl} onChangeText={setImageUrl} 
            placeholder="Or paste a direct image URL..." 
            hint="You can either upload an image from your device or paste a web URL link"
          />

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.textMuted, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left', width: '100%' }}>{t("Working Hours")}</Text>
            <View style={{ borderWidth: 1.5, borderColor: T.border, borderRadius: 16, backgroundColor: T.surface, overflow: 'hidden' }}>
              <TextInput 
                value={operatingHours} 
                onChangeText={setOperatingHours} 
                placeholder={t("e.g. Open today • 08:00 - 19:00")} 
                placeholderTextColor={T.textMuted} 
                autoCapitalize="none" 
                style={{ 
                  fontSize: 15, color: T.text, fontFamily: 'Poppins_400Regular', 
                  paddingHorizontal: 16, 
                  paddingLeft: isRTL ? 120 : 16, 
                  paddingRight: isRTL ? 16 : 120,
                  textAlign: isRTL ? 'right' : 'left',
                  paddingVertical: 16 
                }} 
              />
              <TouchableOpacity 
                onPress={() => setShowTimePicker(true)} 
                style={{ 
                  position: 'absolute', 
                  left: isRTL ? 8 : undefined, 
                  right: isRTL ? undefined : 8, 
                  top: 8, bottom: 8, 
                  backgroundColor: `#F59E0B22`, 
                  borderRadius: 10, paddingHorizontal: 12, 
                  alignItems: 'center', justifyContent: 'center', 
                  flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4 
                }}
              >
                <Feather name="calendar" size={13} color="#F59E0B" />
                <Text style={{ fontSize: 11, color: '#F59E0B', fontFamily: 'Poppins_600SemiBold', fontWeight: '600' }}>{t('Builder')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 10, color: T.textMuted, fontFamily: 'Poppins_400Regular', marginTop: 5, marginLeft: 4, textAlign: isRTL ? 'right' : 'left' }}>{t("Tap \"Builder\" to flexibly select your days and hours")}</Text>
          </View>

          <View style={{ height: 16 }} />

          <TouchableOpacity id="edit-save-btn" style={[s.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? (
              <MaterialCommunityIcons name="loading" size={22} color="#FFFFFF" />
            ) : (
              <>
                <Feather name={isRTL ? "arrow-left" : "check"} size={20} color="#FFFFFF" />
                <Text style={s.saveBtnText}>{t("Save Store Details")}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Map Picker Modal ─────────────────────────────────────────── */}
      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <View style={s.mapModalContainer}>
          <View style={s.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(false)}>
              <Feather name="x" size={24} color={T.text} />
            </TouchableOpacity>
            <Text style={s.mapModalTitle}>{t("Tap on the map")}</Text>
            <TouchableOpacity 
              style={[s.mapModalConfirmBtn, !pickedLocation && { opacity: 0.5 }]} 
              disabled={!pickedLocation}
              onPress={() => {
                if (pickedLocation) {
                  setAddress(`${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`);
                }
                setShowMapPicker(false);
              }}
            >
              <Text style={s.mapModalConfirmText}>{t("Confirm")}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, backgroundColor: '#F6F5F3' }}>
            <MapWebView 
              locations={[]}
              onMapPress={(lat, lng) => setPickedLocation({ lat, lng })}
              userLocation={pickedLocation} 
            />
          </View>
        </View>
      </Modal>

      {/* ── Schedule Builder Modal ─────────────────────────────────────────── */}
      <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <View style={s.schedModalOverlay}>
          <View style={s.schedModalBody}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Poppins_700Bold', color: T.text }}>{t("Schedule Builder")}</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}><Feather name="x" size={24} color={T.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DAYS.map(day => (
                <View key={day} style={s.schedRow}>
                  <Text style={s.schedDayText}>{t(day)}</Text>
                  <Switch 
                    value={schedule[day].active} 
                    onValueChange={v => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], active: v } }))} 
                    trackColor={{ false: T.border, true: T.green }}
                  />
                  {schedule[day].active && (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}>
                      <TextInput 
                        style={s.schedTimeBox} 
                        value={schedule[day].open} 
                        onChangeText={t => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], open: t } }))}
                        placeholder="08:00"
                        placeholderTextColor={T.textMuted}
                      />
                      <Text style={{ color: T.textMuted }}>-</Text>
                      <TextInput 
                        style={s.schedTimeBox} 
                        value={schedule[day].close} 
                        onChangeText={t => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], close: t } }))}
                        placeholder="18:00"
                        placeholderTextColor={T.textMuted}
                      />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={[s.saveBtn, { marginTop: 24 }]} 
              onPress={() => {
                setOperatingHours(serializeSchedule(schedule));
                setShowTimePicker(false);
              }}
            >
              <Text style={s.saveBtnText}>{t("Apply Schedule")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ─────────────────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.successOverlay}>
          <Animated.View style={[s.successCard, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <View style={s.successIconCircle}>
              <Feather name="check" size={36} color={T.green} />
            </View>
            <Text style={s.successTitle}>{t("Store updated! 🏪")}</Text>
            <Text style={s.successSub}>{t("Your store details have been updated and are now visible to customers.")}</Text>
          </Animated.View>
        </View>
      </Modal>

    </AppScaffold>
  );
}
