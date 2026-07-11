import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Alert,
  FlatList,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { eventsApi } from '../../../home/api/events.api';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/modules/auth/state/auth.context';
import { MapWebView } from '@/modules/map/ui/components/MapWebView';

type Props = NativeStackScreenProps<AppStackParamList, 'AddEvent'>;

const EVENT_TYPES = [
  { value: 'meetup', label: 'Celiac Meetup' },
  { value: 'class', label: 'Cooking Class' },
  { value: 'webinar', label: 'Online Webinar' },
  { value: 'market', label: 'Gluten-Free Market' },
  { value: 'other', label: 'Other Event' },
];

// ── Custom Wheel Picker Column ────────────────────────────────────────────────
const ITEM_H = 44;

interface WheelColumnProps {
  values: string[];
  selected: string;
  onSelect: (v: string) => void;
  accentColor: string;
  width?: any;
  labelExtractor?: (v: string) => string;
}

function WheelColumn({
  values,
  selected,
  onSelect,
  accentColor,
  width,
  labelExtractor,
}: WheelColumnProps) {
  const { theme: T } = useTheme();
  const listRef = useRef<any>(null);
  const idx = values.indexOf(selected);
  const safeIdx = idx >= 0 ? idx : 0;

  const lastSelectedByScrollRef = useRef<string | null>(null);

  useEffect(() => {
    if (selected === lastSelectedByScrollRef.current) {
      // Avoid scroll position fight loops when state matches scroll offset
      return;
    }
    const targetIdx = values.indexOf(selected);
    if (targetIdx >= 0 && targetIdx < values.length) {
      try {
        listRef.current?.scrollToIndex({ index: targetIdx, animated: true, viewPosition: 0.5 });
      } catch (e) {}
    }
  }, [selected, values]);

  const scrollTimeoutRef = useRef<any>(null);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(index, values.length - 1));
    const val = values[clamped];
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (val && val !== selected) {
        lastSelectedByScrollRef.current = val;
        onSelect(val);
      }
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(index, values.length - 1));
    const val = values[clamped];
    if (val && val !== selected) {
      lastSelectedByScrollRef.current = val;
      onSelect(val);
    }
  };

  return (
    <View style={{ height: ITEM_H * 3, overflow: 'hidden', position: 'relative', flex: width ? undefined : 1, width: width }}>
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
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        style={Platform.OS === 'web' ? { scrollSnapType: 'y mandatory' } as any : undefined}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        onLayout={() => {
          setTimeout(() => {
            try {
              listRef.current?.scrollToIndex({ index: safeIdx, animated: false, viewPosition: 0.5 });
            } catch (e) {}
          }, 80);
        }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          const displayLabel = labelExtractor ? labelExtractor(item) : item;
          return (
            <TouchableOpacity
              onPress={() => {
                lastSelectedByScrollRef.current = null;
                onSelect(item);
                const targetIdx = values.indexOf(item);
                if (targetIdx >= 0) {
                  try {
                    listRef.current?.scrollToIndex({ index: targetIdx, animated: true, viewPosition: 0.5 });
                  } catch (e) {}
                }
              }}
              activeOpacity={0.7}
              style={[
                { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
                Platform.OS === 'web' ? { scrollSnapAlign: 'center' } as any : undefined
              ]}
            >
              <Text style={{
                fontSize: isSelected ? 18 : 14,
                fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_400Regular',
                color: isSelected ? accentColor : T.textMuted,
              }}>
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Custom Input Card (matching EditStore) ────────────────────────────────────
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

export default function AddEventScreen({ navigation }: Props) {
  const { theme: T } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const bottomInset = Math.max(insets.bottom, 8) + 110;

  // We can initialize to current local date
  const initDate = useMemo(() => new Date(), []);
  const defaultYear = useMemo(() => String(initDate.getFullYear()), [initDate]);
  const defaultMonth = useMemo(() => String(initDate.getMonth() + 1).padStart(2, '0'), [initDate]);
  const defaultDay = useMemo(() => String(initDate.getDate()).padStart(2, '0'), [initDate]);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('meetup');
  const [description, setDescription] = useState('');

  // Date Wheel Picker States
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  // Time Wheel Picker States
  const [selectedHour, setSelectedHour] = useState('11');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState('AM');

  // Location Details states (single address input box + map picker, matching EditStoreScreen)
  const [locAddress, setLocAddress] = useState('');
  const [locAddressError, setLocAddressError] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // The rest of the states
  const [maxCapacity, setMaxCapacity] = useState('20');
  const [capacityError, setCapacityError] = useState(false);
  const [price, setPrice] = useState('0');
  const [priceError, setPriceError] = useState(false);
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Static options
  const MONTHS = useMemo(() => ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], []);
  const MONTH_NAMES: Record<string, string> = useMemo(() => ({
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  }), []);
  const YEARS = useMemo(() => Array.from({ length: 11 }, (_, i) => String(parseInt(defaultYear, 10) + i)), [defaultYear]);
  const HOURS_VALS = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const MINUTES_VALS = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);
  const AMPM_VALS = useMemo(() => ['AM', 'PM'], []);

  // Dynamic day calculation
  const daysInSelectedMonth = useMemo(() => {
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10);
    return new Date(y, m, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const DAYS = useMemo(() => {
    return Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [daysInSelectedMonth]);

  // Adjust selected day if it exceeds the new month's days
  useEffect(() => {
    const dayVal = parseInt(selectedDay, 10);
    if (dayVal > daysInSelectedMonth) {
      setSelectedDay(String(daysInSelectedMonth).padStart(2, '0'));
    }
  }, [daysInSelectedMonth, selectedDay]);

  // Validation: Date/time in the future
  const isFutureDateSelected = useMemo(() => {
    let h = parseInt(selectedHour, 10);
    if (selectedAmPm === 'PM' && h < 12) h += 12;
    if (selectedAmPm === 'AM' && h === 12) h = 0;
    const mins = parseInt(selectedMinute, 10);
    const y = parseInt(selectedYear, 10);
    const mm = parseInt(selectedMonth, 10);
    const d = parseInt(selectedDay, 10);
    const dt = new Date(y, mm - 1, d, h, mins, 0);
    return dt.getTime() > Date.now();
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute, selectedAmPm]);

  // Status State
  const [titleError, setTitleError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [dateErrorMsg, setDateErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDateErrorModal, setShowDateErrorModal] = useState(false);

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    content: { paddingHorizontal: 24, paddingTop: 16 },

    // Back Row
    navRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: T.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    navTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
      flex: 1,
      textAlign: 'center',
      marginRight: isRTL ? 0 : 40,
      marginLeft: isRTL ? 40 : 0,
    },

    // Image Upload
    imageUploadContainer: {
      width: '100%',
      height: 160,
      borderRadius: 20,
      backgroundColor: T.surfaceAlt,
      borderWidth: 1,
      borderColor: T.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      overflow: 'hidden',
    },
    imageUploadedBorder: {
      borderStyle: 'solid',
    },
    uploadedImage: {
      width: '100%',
      height: '100%',
    },
    uploadPlaceholder: {
      alignItems: 'center',
      gap: 6,
    },
    uploadText: {
      fontSize: 13,
      fontWeight: '600',
      color: T.green,
      fontFamily: 'Poppins_600SemiBold',
    },
    uploadSubtext: {
      fontSize: 11,
      color: T.textSub,
    },

    // Form inputs
    label: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },
    inputGroup: {
      marginBottom: 20,
      width: '100%',
    },
    pickerContainerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: T.border,
      borderRadius: 18,
      backgroundColor: T.surface,
      overflow: 'hidden',
    },
    pickerDivider: {
      width: 1.5,
      height: '60%',
      backgroundColor: T.border,
    },
    mapModalContainer: { flex: 1, backgroundColor: T.bg },
    mapModalHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    mapModalTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: T.text },
    mapModalConfirmBtn: { backgroundColor: T.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    mapModalConfirmText: { color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    input: {
      width: '100%',
      height: 54,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 16,
      fontSize: 15,
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    inputError: {
      borderColor: T.red || '#EF4444',
      backgroundColor: T.errorLight || 'rgba(200,16,46,0.09)',
    },
    errorText: {
      fontSize: 11,
      color: T.red || '#EF4444',
      marginTop: 4,
      textAlign: isRTL ? 'right' : 'left',
    },
    textArea: {
      height: 100,
      paddingTop: 14,
      textAlignVertical: 'top',
    },

    // Dropdown Select
    selectTrigger: {
      width: '100%',
      height: 54,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectText: {
      fontSize: 15,
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    dropdownList: {
      backgroundColor: T.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.border,
      marginTop: 6,
      overflow: 'hidden',
      maxHeight: 220,
      elevation: 4,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: T.border,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    dropdownItemText: {
      fontSize: 14,
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Location Fields Group
    locationGroup: {
      backgroundColor: T.surfaceAlt,
      borderRadius: 18,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: T.border,
    },
    locationHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    locationTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
    },

    // Inline row
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 12,
      width: '100%',
    },
    timeRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 12,
      width: '100%',
      alignItems: 'flex-start',
      marginTop: 8,
    },
    timeCol: {
      flex: 1,
    },
    col: {
      flex: 1,
    },

    // Buttons
    submitBtn: {
      height: 54,
      borderRadius: 16,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      marginBottom: 40,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },

    // Success Modal Overlay
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: screenWidth * 0.85,
      backgroundColor: T.surface,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      elevation: 10,
    },
    successCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
    },
    modalSub: {
      fontSize: 13,
      color: T.textSub,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 20,
    },
    okBtn: {
      backgroundColor: T.green,
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 12,
    },
    okBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  }), [T, screenWidth, isRTL]);

  const canSubmit = React.useMemo(() => {
    if (!title.trim()) return false;
    if (!isFutureDateSelected) return false;
    if (user?.profileType === 'pro_commerce' && !eventImage) return false;
    if (!locAddress.trim()) return false;
    if (maxCapacity && isNaN(Number(maxCapacity))) return false;
    if (price && isNaN(Number(price))) return false;
    return true;
  }, [title, isFutureDateSelected, eventImage, maxCapacity, price, user, locAddress]);

  // Set default Unsplash image if none picked
  const getPresetImage = (eventCategory: string) => {
    switch (eventCategory) {
      case 'class':
        return 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=600';
      case 'webinar':
        return 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?q=80&w=600';
      case 'market':
        return 'https://images.unsplash.com/photo-1488459718432-36c55e79926e?q=80&w=600';
      default:
        return 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600';
    }
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access library is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setEventImage(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setEventImage(asset.uri);
      }
      setImageError(false);
    }
  };

  function validateAll() {
    let ok = true;
    // title
    if (!title.trim()) {
      setTitleError(true);
      ok = false;
    }
    // date/time check
    if (!isFutureDateSelected) {
      setDateError(true);
      setDateErrorMsg('Event start date/time must be in the future.');
      setShowDateErrorModal(true);
      ok = false;
    }
    // location is strictly required for all users
    if (!locAddress.trim()) {
      setLocAddressError(true);
      ok = false;
    }
    // pro user: require image
    if (user?.profileType === 'pro_commerce') {
      if (!eventImage) {
        setImageError(true);
        ok = false;
      }
    }
    // numeric checks
    if (maxCapacity && isNaN(Number(maxCapacity))) {
      setCapacityError(true);
      ok = false;
    }
    if (price && isNaN(Number(price))) {
      setPriceError(true);
      ok = false;
    }

    return ok;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const ok = validateAll();
    if (!ok) {
      setIsSubmitting(false);
      return;
    }

    try {
      let h = parseInt(selectedHour, 10);
      if (selectedAmPm === 'PM' && h < 12) h += 12;
      if (selectedAmPm === 'AM' && h === 12) h = 0;
      const mins = parseInt(selectedMinute, 10);
      const y = parseInt(selectedYear, 10);
      const mm = parseInt(selectedMonth, 10);
      const d = parseInt(selectedDay, 10);
      const dt = new Date(y, mm - 1, d, h, mins, 0);

      if (isNaN(dt.getTime())) {
        setDateError(true);
        setDateErrorMsg('Invalid date.');
        setShowDateErrorModal(true);
        setIsSubmitting(false);
        return;
      }

      // startsAt must be in the future
      if (dt.getTime() <= Date.now()) {
        setDateError(true);
        setDateErrorMsg('Event start date/time must be in the future.');
        setShowDateErrorModal(true);
        setIsSubmitting(false);
        return;
      }

      const payload = {
        title: title.trim(),
        type,
        description: description.trim(),
        startsAt: dt.toISOString(),
        location: {
          name: locAddress.trim() || 'Tunis',
          address: locAddress.trim() || 'Avenue Habib Bourguiba',
          city: 'Tunis',
          country: 'Tunisia',
          lat: pickedLocation ? pickedLocation.lat : undefined,
          lng: pickedLocation ? pickedLocation.lng : undefined,
        },
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : 0,
        price: price ? parseFloat(price) : 0,
        imageUrl: eventImage || getPresetImage(type),
      };

      await eventsApi.create(payload as any);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(err.message || 'Error occurred while creating event.');
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const isDirty = title.trim() || description.trim() || locAddress.trim();
      if (!isDirty || isSubmitting || showSuccessModal) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        'Discard draft?',
        'You have unsaved changes. Are you sure you want to discard them and leave?',
        [
          { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, title, description, locAddress, isSubmitting, showSuccessModal]);

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.navigate('Events');
  };

  const selectedTypeObj = EVENT_TYPES.find(t => t.value === type);

  return (
    <AppScaffold title="New Event" activeTab="events">
      <ScrollView style={s.safe} contentContainerStyle={[s.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        
        {/* Navigation Row */}
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Feather name="arrow-left" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Organize Event</Text>
        </View>

        {/* Image Picker */}
        <TouchableOpacity
          onPress={handleImagePick}
          activeOpacity={0.9}
          style={[s.imageUploadContainer, eventImage ? s.imageUploadedBorder : null]}
        >
          {eventImage ? (
            <Image source={{ uri: eventImage }} style={s.uploadedImage} resizeMode="cover" />
          ) : (
            <View style={s.uploadPlaceholder}>
              <Feather name="image" size={32} color={T.green} />
              <Text style={s.uploadText}>Add Cover Photo</Text>
              <Text style={s.uploadSubtext}>Recommend landscape 16:9 ratio</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Event Title */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Event Title *</Text>
          <TextInput
            placeholder="e.g. Gluten-Free Cooking Workshop"
            placeholderTextColor={T.textMuted}
            value={title}
            onChangeText={setTitle}
            style={[s.input, titleError ? s.inputError : null]}
          />
          {titleError && <Text style={s.errorText}>Event title is required.</Text>}
        </View>

        {/* Event Type Select */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Event Type</Text>
          <TouchableOpacity
            style={s.selectTrigger}
            activeOpacity={0.85}
            onPress={() => setShowTypeDropdown(!showTypeDropdown)}
          >
            <Text style={s.selectText}>{selectedTypeObj?.label}</Text>
            <Feather name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={T.text} />
          </TouchableOpacity>

          {showTypeDropdown && (
            <View style={s.dropdownList}>
              {EVENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={s.dropdownItem}
                  onPress={() => {
                    setType(t.value);
                    setShowTypeDropdown(false);
                  }}
                >
                  <Text style={s.dropdownItemText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date / Time Wheel Pickers */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Starts At *</Text>
          
          <View style={[s.pickerContainerRow, (!isFutureDateSelected || dateError) ? s.inputError : null]}>
            <WheelColumn
              values={MONTHS}
              selected={selectedMonth}
              onSelect={setSelectedMonth}
              accentColor={T.green}
              labelExtractor={(v) => MONTH_NAMES[v]}
            />
            <View style={s.pickerDivider} />
            <WheelColumn
              values={DAYS}
              selected={selectedDay}
              onSelect={setSelectedDay}
              accentColor={T.green}
            />
            <View style={s.pickerDivider} />
            <WheelColumn
              values={YEARS}
              selected={selectedYear}
              onSelect={setSelectedYear}
              accentColor={T.green}
            />
          </View>
          
          <View style={{ height: 12 }} />
          
          <View style={[s.pickerContainerRow, (!isFutureDateSelected || dateError) ? s.inputError : null]}>
            <WheelColumn
              values={HOURS_VALS}
              selected={selectedHour}
              onSelect={setSelectedHour}
              accentColor={T.green}
            />
            <View style={s.pickerDivider} />
            <WheelColumn
              values={MINUTES_VALS}
              selected={selectedMinute}
              onSelect={setSelectedMinute}
              accentColor={T.green}
            />
            <View style={s.pickerDivider} />
            <WheelColumn
              values={AMPM_VALS}
              selected={selectedAmPm}
              onSelect={setSelectedAmPm}
              accentColor={T.green}
            />
          </View>
          {!isFutureDateSelected && (
            <Text style={s.errorText}>Event time cannot be in the past.</Text>
          )}
          {isFutureDateSelected && dateError && (
            <Text style={s.errorText}>{dateErrorMsg || 'Event start date/time must be in the future.'}</Text>
          )}
        </View>

        {/* Location Details (Store Address & Map Picker, matching EditStoreScreen) */}
        <View style={{ marginBottom: 12 }}>
          <InputCard 
            icon="map-pin" 
            iconColor="#EF4444" 
            label="Store Address" 
            value={locAddress} 
            onChangeText={(v) => { setLocAddress(v); setLocAddressError(false); }} 
            placeholder="e.g. 125 Rue Casablanca, Tunis" 
            multiline 
            hint="Enter event address manually or tap the map icon to pin it"
            rightElement={
              <TouchableOpacity 
                onPress={() => setShowMapPicker(true)} 
                style={{ 
                  position: 'absolute', 
                  left: isRTL ? 12 : undefined, 
                  right: isRTL ? undefined : 12, 
                  top: 12, 
                  backgroundColor: '#EF444420', 
                  padding: 8, 
                  borderRadius: 8 
                }}
              >
                <Feather name="map" size={16} color="#EF4444" />
              </TouchableOpacity>
            }
          />
          {locAddressError && <Text style={s.errorText}>Address is required.</Text>}
        </View>

        {/* Capacity and Price row */}
        <View style={s.row}>
          <View style={[s.inputGroup, s.col]}>
            <Text style={s.label}>Max Capacity</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="20"
              placeholderTextColor={T.textMuted}
              value={maxCapacity}
              onChangeText={(v) => { setMaxCapacity(v); setCapacityError(false); }}
              style={s.input}
            />
            {capacityError && <Text style={s.errorText}>Enter a valid number for capacity.</Text>}
          </View>
          <View style={[s.inputGroup, s.col]}>
            <Text style={s.label}>Price (TND)</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="0 (Free)"
              placeholderTextColor={T.textMuted}
              value={price}
              onChangeText={(v) => { setPrice(v); setPriceError(false); }}
              style={s.input}
            />
            {priceError && <Text style={s.errorText}>Enter a valid price (numbers only).</Text>}
          </View>
        </View>

        {/* Description */}
        <View style={s.inputGroup}>
          <Text style={s.label}>About the Event</Text>
          <TextInput
            placeholder="Describe what attendees can expect, what to bring, etc."
            placeholderTextColor={T.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={[s.input, s.textArea]}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || isSubmitting) ? { opacity: 0.6 } : null]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.submitBtnText}>Create Event</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.successCircle}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </View>
            <Text style={s.modalTitle}>Event Created!</Text>
            <Text style={s.modalSub}>Your gluten-free event is now published and visible to the community.</Text>
            <TouchableOpacity style={s.okBtn} onPress={handleSuccessClose} activeOpacity={0.85}>
              <Text style={s.okBtnText}>Go to Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Error Modal */}
      <Modal visible={showDateErrorModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Invalid date</Text>
            <Text style={s.modalSub}>{dateErrorMsg || 'Event start date/time must be in the future.'}</Text>
            <TouchableOpacity style={s.okBtn} onPress={() => setShowDateErrorModal(false)} activeOpacity={0.85}>
              <Text style={s.okBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Map Picker Modal (matching EditStoreScreen) */}
      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <View style={s.mapModalContainer}>
          <View style={s.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(false)}>
              <Feather name="x" size={24} color={T.text} />
            </TouchableOpacity>
            <Text style={s.mapModalTitle}>Tap on the map</Text>
            <TouchableOpacity 
              style={[s.mapModalConfirmBtn, !pickedLocation && { opacity: 0.5 }]} 
              disabled={!pickedLocation}
              onPress={() => {
                if (pickedLocation) {
                  setLocAddress(`${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`);
                  setLocAddressError(false);
                }
                setShowMapPicker(false);
              }}
            >
              <Text style={s.mapModalConfirmText}>Confirm</Text>
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

    </AppScaffold>
  );
}
