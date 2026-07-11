import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
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
  if (!str) {
    ['Mon','Tue','Wed','Thu','Fri'].forEach(d => s[d].active = true);
    return s;
  }

  const clean = str.trim();

  // "Open 7 days • 08:00 - 18:00"
  if (clean.toLowerCase().includes('7 days') || clean.toLowerCase().includes('everyday')) {
    const match = clean.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const open = match ? match[1] : '08:00';
    const close = match ? match[2] : '18:00';
    DAYS.forEach(d => { s[d] = { active: true, open, close }; });
    return s;
  }

  // "Open Mon-Fri • 08:00 - 18:00"
  if (clean.toLowerCase().includes('mon-fri')) {
    const match = clean.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const open = match ? match[1] : '08:00';
    const close = match ? match[2] : '18:00';
    ['Mon','Tue','Wed','Thu','Fri'].forEach(d => { s[d] = { active: true, open, close }; });
    return s;
  }

  // "Open Mon-Sat • 08:00 - 18:00"
  if (clean.toLowerCase().includes('mon-sat')) {
    const match = clean.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const open = match ? match[1] : '08:00';
    const close = match ? match[2] : '18:00';
    ['Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { s[d] = { active: true, open, close }; });
    return s;
  }

  // Mixed individual list: "Tue 08:00-18:00, Thu 08:00-18:00"
  const parts = clean.split(',');
  parts.forEach(part => {
    const trimmed = part.trim();
    const match = trimmed.match(/^([A-Za-z]{3})\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (match) {
      const day = match[1];
      const open = match[2];
      const close = match[3];
      const matchedDay = DAYS.find(d => d.toLowerCase() === day.toLowerCase());
      if (matchedDay) {
        s[matchedDay] = { active: true, open, close };
      }
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
// ── Time Wheel Picker ─────────────────────────────────────────────────────────
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_H  = 44;

function TimeWheel({ values, selected, onSelect, accentColor }: {
  values: string[]; selected: string; onSelect: (v: string) => void; accentColor: string;
}) {
  const { theme: T } = useTheme();
  const listRef = React.useRef<any>(null);
  const idx = values.indexOf(selected);
  const safeIdx = idx >= 0 ? idx : 0;

  return (
    <View style={{ height: ITEM_H * 3, overflow: 'hidden', position: 'relative' }}>
      {/* Top + bottom fades */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H, backgroundColor: T.surface, opacity: 0.85, zIndex: 1 }} pointerEvents="none" />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H, backgroundColor: T.surface, opacity: 0.85, zIndex: 1 }} pointerEvents="none" />
      {/* Selection highlight */}
      <View style={{ position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H, borderRadius: 12, backgroundColor: `${accentColor}18`, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: `${accentColor}40`, zIndex: 0 }} pointerEvents="none" />
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={v => v}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        onLayout={() => {
          setTimeout(() => {
            try {
              listRef.current?.scrollToIndex({ index: safeIdx, animated: false, viewPosition: 0.5 });
            } catch (e) {}
          }, 80);
        }}
        onScroll={e => {
          const y = e.nativeEvent.contentOffset.y;
          const index = Math.round(y / ITEM_H);
          const clamped = Math.max(0, Math.min(index, values.length - 1));
          const val = values[clamped];
          if (val && val !== selected) {
            onSelect(val);
          }
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)} activeOpacity={0.7} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: item === selected ? 22 : 16, fontFamily: item === selected ? 'Poppins_700Bold' : 'Poppins_400Regular', color: item === selected ? accentColor : T.textMuted }}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export default function EditStoreScreen({ navigation, route }: Props) {
  const { user, updateProfile } = useAuth();
  const { theme: T, isDark } = useTheme();
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  // Schedule Builder state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>(() => parseSchedule(storeInfo.operatingHours ?? ''));
  // Which day is expanded for the wheel picker
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const openTimePicker = () => {
    // Sync schedule builder list state with the latest string input
    setSchedule(parseSchedule(operatingHours));
    setExpandedDay(null);
    setShowTimePicker(true);
  };

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

    schedModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    schedModalBody: { backgroundColor: T.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 44, height: '80%' },
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

          {/* ── Working Hours — Premium redesign ─────────────────────── */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 11, fontWeight: '700', fontFamily: 'Poppins_700Bold',
              color: T.textMuted, marginBottom: 8, letterSpacing: 0.8,
              textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left',
            }}>
              {t('Working Hours')}
            </Text>

            {/* Premium card */}
            <View style={{
              borderRadius: 18,
              backgroundColor: T.surface,
              shadowColor: T.green,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.10,
              shadowRadius: 12,
              elevation: 3,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: operatingHours ? `${T.green}33` : T.border,
            }}>

              {/* Card header */}
              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: T.border,
                gap: 10,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: `${T.green}18`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather name="clock" size={18} color={T.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 14, fontFamily: 'Poppins_600SemiBold',
                    color: T.text,
                  }}>
                    {t('Business Hours')}
                  </Text>
                  <Text style={{
                    fontSize: 11, fontFamily: 'Poppins_400Regular',
                    color: T.textMuted, marginTop: 1,
                  }}>
                    {operatingHours
                      ? t('Your schedule is configured')
                      : t('Not configured yet')}
                  </Text>
                </View>
                {/* Status pill */}
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: operatingHours ? '#22C55E18' : `${T.green}18`,
                }}>
                  <Text style={{
                    fontSize: 10, fontFamily: 'Poppins_700Bold',
                    color: operatingHours ? '#22C55E' : T.green,
                    letterSpacing: 0.4,
                  }}>
                    {operatingHours ? t('Active') : t('Set up')}
                  </Text>
                </View>
              </View>

              {/* Schedule preview — parsed day chips */}
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
                {operatingHours ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {operatingHours.split(',').map((slot, idx) => {
                      const parts = slot.trim().split(' ');
                      const day = parts[0] || '';
                      const hours = parts.slice(1).join(' ');
                      return (
                        <View key={idx} style={{
                          flexDirection: 'row', alignItems: 'center',
                          backgroundColor: `${T.green}12`,
                          borderRadius: 10,
                          paddingHorizontal: 10, paddingVertical: 6,
                          gap: 5,
                          borderWidth: 1,
                          borderColor: `${T.green}28`,
                        }}>
                          <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: T.green }}>
                            {day}
                          </Text>
                          {!!hours && (
                            <Text style={{ fontSize: 11, fontFamily: 'Poppins_400Regular', color: T.text, opacity: 0.8 }}>
                              {hours}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{
                    alignItems: 'center', paddingVertical: 16,
                    gap: 6,
                  }}>
                    <Feather name="calendar" size={28} color={T.border} />
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: T.textMuted, textAlign: 'center' }}>
                      {t('No hours defined yet')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Hidden raw text input for raw editing (accessible via Builder) */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                <TextInput
                  value={operatingHours}
                  onChangeText={setOperatingHours}
                  placeholder={t('e.g. Mon 08:00-18:00, Tue 08:00-18:00')}
                  placeholderTextColor={T.textMuted}
                  autoCapitalize="none"
                  style={{
                    fontSize: 12, color: T.textMuted,
                    fontFamily: 'Poppins_400Regular',
                    textAlign: isRTL ? 'right' : 'left',
                    paddingVertical: 8,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: T.border,
                  }}
                />
              </View>

              {/* Edit Schedule CTA */}
              <TouchableOpacity
                onPress={openTimePicker}
                activeOpacity={0.85}
                style={{
                  margin: 12,
                  marginTop: 4,
                  borderRadius: 12,
                  backgroundColor: T.green,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 13,
                  gap: 8,
                  shadowColor: T.green,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Feather name="edit-3" size={15} color="#FFF" />
                <Text style={{
                  fontSize: 13, fontFamily: 'Poppins_700Bold',
                  color: '#FFF', letterSpacing: 0.3,
                }}>
                  {t('Edit Schedule')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{
              fontSize: 10, color: T.textMuted, fontFamily: 'Poppins_400Regular',
              marginTop: 6, marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0,
              textAlign: isRTL ? 'right' : 'left',
            }}>
              {t('Use the schedule builder or type directly above')}
            </Text>
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

      {/* ── Schedule Builder Modal — Premium Redesign ──────────────────────── */}
      <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <View style={s.schedModalOverlay}>
          <View style={s.schedModalBody}>

            {/* ── Header ── */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${T.green}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="clock" size={18} color={T.green} />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontFamily: 'Poppins_700Bold', color: T.text }}>{t('Schedule Builder')}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Poppins_400Regular', color: T.textMuted }}>{t('Tap a day to set its hours')}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#FFFFFF12' : '#0000000A', alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={18} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Quick select row ── */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, marginTop: 12 }}>
              {[['Mon-Fri', ['Mon','Tue','Wed','Thu','Fri']], ['All week', DAYS], ['Weekend', ['Sat','Sun']]].map(([label, days]) => (
                <TouchableOpacity
                  key={label as string}
                  activeOpacity={0.75}
                  onPress={() => {
                    const arr = days as string[];
                    setSchedule(prev => {
                      const next = { ...prev };
                      DAYS.forEach(d => { next[d] = { ...prev[d], active: arr.includes(d) }; });
                      return next;
                    });
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: `${T.green}18`, borderWidth: 1, borderColor: `${T.green}30` }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: T.green }}>{t(label as string)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {DAYS.map(day => {
                const isActive = schedule[day].active;
                const isExpanded = expandedDay === day;
                const [openH, openM] = (schedule[day].open || '08:00').split(':');
                const [closeH, closeM] = (schedule[day].close || '18:00').split(':');

                return (
                  <View key={day} style={{
                    marginBottom: 8,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isActive ? `${T.green}40` : T.border,
                    backgroundColor: isActive ? (isDark ? `${T.green}08` : `${T.green}0A`) : T.surfaceAlt,
                    overflow: 'hidden',
                  }}>
                    {/* Day toggle row */}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => {
                        if (!isActive) {
                          setSchedule(prev => ({ ...prev, [day]: { ...prev[day], active: true } }));
                          setExpandedDay(day);
                        } else if (isExpanded) {
                          setExpandedDay(null);
                        } else {
                          setExpandedDay(day);
                        }
                      }}
                      style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 10 }}
                    >
                      {/* Day pill */}
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isActive ? T.green : (isDark ? '#FFFFFF10' : '#0000000A'), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: isActive ? '#FFF' : T.textMuted }}>
                          {t(day)}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        {isActive ? (
                          <Text style={{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: T.text }}>
                            {schedule[day].open} – {schedule[day].close}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: T.textMuted }}>
                            {t('Closed')}
                          </Text>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* On/Off toggle */}
                        <Switch
                          value={isActive}
                          onValueChange={v => {
                            setSchedule(prev => ({ ...prev, [day]: { ...prev[day], active: v } }));
                            if (v) setExpandedDay(day); else if (expandedDay === day) setExpandedDay(null);
                          }}
                          trackColor={{ false: T.border, true: T.green }}
                          thumbColor="#FFFFFF"
                        />
                        {isActive && (
                          <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={T.green} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded time wheels */}
                    {isActive && isExpanded && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
                        <View style={{ height: 1, backgroundColor: `${T.green}20`, marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          {/* Open time */}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: T.green, textAlign: 'center', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
                              {t('Opens')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? '#FFFFFF06' : `${T.green}06`, borderRadius: 12, borderWidth: 1, borderColor: `${T.green}20`, padding: 4 }}>
                              <View style={{ flex: 1 }}>
                                <TimeWheel
                                  values={HOURS}
                                  selected={openH || '08'}
                                  accentColor={T.green}
                                  onSelect={h => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], open: `${h}:${openM || '00'}` } }))}
                                />
                              </View>
                              <Text style={{ fontSize: 20, fontFamily: 'Poppins_700Bold', color: T.green, opacity: 0.5 }}>:</Text>
                              <View style={{ flex: 1 }}>
                                <TimeWheel
                                  values={MINUTES}
                                  selected={openM || '00'}
                                  accentColor={T.green}
                                  onSelect={m => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], open: `${openH || '08'}:${m}` } }))}
                                />
                              </View>
                            </View>
                          </View>

                          {/* Separator */}
                          <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 22 }}>
                            <Feather name="arrow-right" size={16} color={T.textMuted} />
                          </View>

                          {/* Close time */}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: T.green, textAlign: 'center', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
                              {t('Closes')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? '#FFFFFF06' : `${T.green}06`, borderRadius: 12, borderWidth: 1, borderColor: `${T.green}20`, padding: 4 }}>
                              <View style={{ flex: 1 }}>
                                <TimeWheel
                                  values={HOURS}
                                  selected={closeH || '18'}
                                  accentColor={T.green}
                                  onSelect={h => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], close: `${h}:${closeM || '00'}` } }))}
                                />
                              </View>
                              <Text style={{ fontSize: 20, fontFamily: 'Poppins_700Bold', color: T.green, opacity: 0.5 }}>:</Text>
                              <View style={{ flex: 1 }}>
                                <TimeWheel
                                  values={MINUTES}
                                  selected={closeM || '00'}
                                  accentColor={T.green}
                                  onSelect={m => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], close: `${closeH || '18'}:${m}` } }))}
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* ── Apply Button ── */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                marginTop: 16, borderRadius: 14,
                backgroundColor: T.green,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center', justifyContent: 'center',
                paddingVertical: 15, gap: 8,
                shadowColor: T.green, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
              }}
              onPress={() => {
                setOperatingHours(serializeSchedule(schedule));
                setExpandedDay(null);
                setShowTimePicker(false);
              }}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={{ fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: 0.3 }}>{t('Apply Schedule')}</Text>
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
