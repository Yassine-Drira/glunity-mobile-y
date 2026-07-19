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
  Platform,
  Animated,
  Switch,
  KeyboardAvoidingView,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';

type Props = NativeStackScreenProps<AppStackParamList, 'AddEvent'>;

const EVENT_TYPES = [
  { value: 'meetup', label: 'Celiac Meetup' },
  { value: 'class', label: 'Cooking Class' },
  { value: 'webinar', label: 'Online Webinar' },
  { value: 'market', label: 'Gluten-Free Market' },
  { value: 'other', label: 'Other Event' },
];

const CURRENCIES = ['TND', 'USD', 'EUR'];

const REFUND_POLICIES = [
  { value: 'no_refunds', label: 'No Refunds' },
  { value: '1_day', label: 'Up to 1 day before' },
  { value: '7_days', label: 'Up to 7 days before' },
];

const PLATFORMS = [
  { value: 'zoom', label: 'Zoom', icon: 'videocam-outline' },
  { value: 'google_meet', label: 'Google Meet', icon: 'logo-google' },
  { value: 'teams', label: 'Microsoft Teams', icon: 'people-outline' },
  { value: 'discord', label: 'Discord', icon: 'chatbubbles-outline' },
  { value: 'custom_link', label: 'Custom Link', icon: 'link-outline' },
];

interface AddEventFormValues {
  title: string;
  type: string;
  description: string;
  eventImage: string | null;
  organizerName: string;
  organizerContact: string;

  format: 'presentiel' | 'online';
  // Presentiel Event Details
  venueName: string;
  address: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  parkingInfo: string;
  maxCapacity: string;

  // Online Event Details
  platform: 'zoom' | 'google_meet' | 'teams' | 'discord' | 'custom_link';
  meetingUrl: string;
  accessCode: string;
  instructions: string;

  // Date & Time
  startsAt: Date;
  endsAt: Date;
  timezone: string;

  // Tickets & Payment
  pricing: 'free' | 'paid';
  paymentMethod: 'online' | 'presentiel';

  // Online Payment Details
  ticketName: string;
  ticketDescription: string;
  price: string;
  currency: string;
  ticketQuantity: string;
  maxTicketsPerParticipant: string;
  salesStart: Date;
  salesEnd: Date;
  refundPolicy: string;
  acceptTerms: boolean;

  // Presentiel Payment Details
  payPlaceName: string;
  payAddress: string;
  payCity: string;
  payCountry: string;
  payLat: number | null;
  payLng: number | null;
  payInstructions: string;
  payDeadline: Date;
}

const getTzString = () => {
  try {
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date();
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const gmtOffset = `GMT${sign}${offsetHours}${minutes > 0 ? `:${minutes}` : ''}`;
    return `${gmtOffset} ${tzName}`;
  } catch (e) {
    return 'GMT+1 Africa/Tunis';
  }
};

const formatFullDateTime = (date: Date) => {
  try {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${weekday}, ${month} ${day}, ${year} at ${hours}:${minutes}`;
  } catch (e) {
    return date.toString();
  }
};

const formatWebValue = (date: Date, mode: 'date' | 'time') => {
  try {
    if (mode === 'date') {
      return date.toISOString().split('T')[0];
    } else {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    return '';
  }
};

const parseWebValue = (val: string, mode: 'date' | 'time', current: Date) => {
  const next = new Date(current);
  if (mode === 'date') {
    const [y, m, d] = val.split('-');
    if (y && m && d) {
      next.setFullYear(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
  } else {
    const [h, min] = val.split(':');
    if (h && min) {
      next.setHours(parseInt(h, 10), parseInt(min, 10));
    }
  }
  return next;
};

export default function AddEventScreen({ navigation }: Props) {
  const { theme: T } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);

  const defaultValues: AddEventFormValues = {
    title: '',
    type: 'meetup',
    description: '',
    eventImage: null,
    organizerName: user?.fullName || '',
    organizerContact: user?.email || '',
    format: 'presentiel',
    venueName: '',
    address: '',
    city: '',
    country: '',
    lat: null,
    lng: null,
    parkingInfo: '',
    maxCapacity: '50',
    platform: 'zoom',
    meetingUrl: '',
    accessCode: '',
    instructions: '',
    startsAt: (() => {
      const d = new Date();
      d.setHours(d.getHours() + 2);
      d.setMinutes(0);
      return d;
    })(),
    endsAt: (() => {
      const d = new Date();
      d.setHours(d.getHours() + 4);
      d.setMinutes(0);
      return d;
    })(),
    timezone: getTzString(),
    pricing: 'free',
    paymentMethod: 'online',
    ticketName: '',
    ticketDescription: '',
    price: '10',
    currency: 'TND',
    ticketQuantity: '50',
    maxTicketsPerParticipant: '5',
    salesStart: new Date(),
    salesEnd: (() => {
      const d = new Date();
      d.setHours(d.getHours() + 1);
      return d;
    })(),
    refundPolicy: 'no_refunds',
    acceptTerms: false,
    payPlaceName: '',
    payAddress: '',
    payCity: '',
    payCountry: '',
    payLat: null,
    payLng: null,
    payInstructions: '',
    payDeadline: (() => {
      const d = new Date();
      d.setHours(d.getHours() + 1);
      return d;
    })(),
  };

  const {
    control,
    handleSubmit: hookSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    reset,
    formState: { errors },
  } = useForm<AddEventFormValues>({
    defaultValues,
  });

  const format = watch('format');
  const pricing = watch('pricing');
  const paymentMethod = watch('paymentMethod');
  const type = watch('type');
  const eventImage = watch('eventImage');
  const platform = watch('platform');
  const currency = watch('currency');
  const refundPolicy = watch('refundPolicy');

  // Stepper State (6 Steps)
  const [step, setStep] = useState(1);
  const progressAnim = useRef(new Animated.Value(0.16)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / 6,
      duration: 300,
      useNativeDriver: false,
    }).start();

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [step]);

  useEffect(() => {
    if (user) {
      if (!getValues('organizerName')) setValue('organizerName', user.fullName || '');
      if (!getValues('organizerContact')) setValue('organizerContact', user.email || '');
    }
  }, [user]);

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showRefundDropdown, setShowRefundDropdown] = useState(false);

  // Map selection states
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<'event' | 'payment'>('event');
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Native Picker configuration
  const [pickerConfig, setPickerConfig] = useState<{
    field: keyof AddEventFormValues;
    mode: 'date' | 'time';
    value: Date;
    minDate?: Date;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Local drafts setup
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@event_draft');
        if (stored) {
          Alert.alert(
            t('Restore Draft?'),
            t('We found a saved draft. Would you like to restore it?'),
            [
              { text: t('Cancel'), style: 'cancel' },
              {
                text: t('Restore'),
                onPress: () => {
                  const data = JSON.parse(stored);
                  if (data.startsAt) data.startsAt = new Date(data.startsAt);
                  if (data.endsAt) data.endsAt = new Date(data.endsAt);
                  if (data.salesStart) data.salesStart = new Date(data.salesStart);
                  if (data.salesEnd) data.salesEnd = new Date(data.salesEnd);
                  if (data.payDeadline) data.payDeadline = new Date(data.payDeadline);
                  reset(data);
                },
              },
            ]
          );
        }
      } catch (e) {}
    })();
  }, []);

  const handleSaveDraft = async () => {
    try {
      const vals = getValues();
      await AsyncStorage.setItem('@event_draft', JSON.stringify(vals));
      Alert.alert(t('Draft Saved'), t('Your event draft has been saved locally.'));
    } catch (e) {
      Alert.alert(t('Draft Error'), t('Could not save event draft.'));
    }
  };

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
      Alert.alert(t('Permission Required'), t('Permission to access library is required!'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setValue('eventImage', `data:image/jpeg;base64,${asset.base64}`);
      } else {
        setValue('eventImage', asset.uri);
      }
    }
  };

  const handleRemoveImage = () => {
    setValue('eventImage', null);
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setPickerConfig(null);
    }
    if (selectedDate && pickerConfig) {
      const fieldName = pickerConfig.field;
      const currentVal = new Date(watch(fieldName) as Date);
      if (pickerConfig.mode === 'date') {
        currentVal.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      } else {
        currentVal.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      }
      setValue(fieldName, currentVal);

      // Validation logic cascades
      if (fieldName === 'startsAt') {
        const ends = watch('endsAt');
        if (ends.getTime() <= currentVal.getTime()) {
          const nextEnds = new Date(currentVal);
          nextEnds.setHours(currentVal.getHours() + 2);
          setValue('endsAt', nextEnds);
        }
      } else if (fieldName === 'salesStart') {
        const salesEnd = watch('salesEnd');
        if (salesEnd.getTime() <= currentVal.getTime()) {
          const nextSalesEnd = new Date(currentVal);
          nextSalesEnd.setHours(currentVal.getHours() + 1);
          setValue('salesEnd', nextSalesEnd);
        }
      }
    }
  };

  const handlePlatformChange = (newPlatform: any) => {
    setValue('platform', newPlatform);
    trigger('meetingUrl');
  };

  const handleFormatChange = (newFormat: 'presentiel' | 'online') => {
    setValue('format', newFormat);
    if (newFormat === 'presentiel') {
      setValue('meetingUrl', '');
      setValue('platform', 'zoom');
      setValue('accessCode', '');
      setValue('instructions', '');
    } else {
      setValue('venueName', '');
      setValue('address', '');
      setValue('city', '');
      setValue('country', '');
      setValue('lat', null);
      setValue('lng', null);
      setValue('parkingInfo', '');
      setValue('maxCapacity', '100');
    }
  };

  const validateMeetingUrl = (val: string) => {
    if (!val || !val.trim()) return t('Meeting URL is required');
    const lowerVal = val.toLowerCase().trim();
    const plat = watch('platform');
    if (plat === 'zoom') {
      if (!lowerVal.includes('zoom.us') && !lowerVal.includes('zoom.com')) {
        return t('Please enter a valid Zoom URL');
      }
    } else if (plat === 'google_meet') {
      if (!lowerVal.includes('meet.google.com')) {
        return t('Please enter a valid Google Meet URL');
      }
    } else if (plat === 'teams') {
      if (!lowerVal.includes('teams.microsoft.com') && !lowerVal.includes('teams.live.com')) {
        return t('Please enter a valid Microsoft Teams URL');
      }
    } else {
      if (!lowerVal.startsWith('http://') && !lowerVal.startsWith('https://')) {
        return t('Please enter a valid URL starting with http:// or https://');
      }
    }
    return true;
  };

  const handleNext = async () => {
    let fieldsToValidate: Array<keyof AddEventFormValues> = [];
    if (step === 1) {
      fieldsToValidate = ['title', 'organizerName', 'organizerContact'];
    } else if (step === 2) {
      fieldsToValidate = ['format'];
    } else if (step === 3) {
      fieldsToValidate = format === 'presentiel'
        ? ['venueName', 'address', 'city', 'country', 'maxCapacity']
        : ['meetingUrl'];
    } else if (step === 4) {
      fieldsToValidate = ['startsAt', 'endsAt'];
    } else if (step === 5) {
      fieldsToValidate = pricing === 'paid'
        ? (paymentMethod === 'online'
          ? ['ticketName', 'price', 'ticketQuantity', 'maxTicketsPerParticipant', 'salesStart', 'salesEnd', 'acceptTerms']
          : ['payPlaceName', 'payAddress', 'payCity', 'payCountry', 'payInstructions', 'payDeadline'])
        : [];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      if (step === 1 && user?.profileType === 'pro_commerce' && !eventImage) {
        Alert.alert(t('Cover Image Required'), t('Please select a cover image for your event.'));
        return;
      }
      if (step === 4) {
        const starts = watch('startsAt');
        const ends = watch('endsAt');
        if (starts.getTime() <= Date.now()) {
          Alert.alert(t('Validation Error'), t('Start date & time must be in the future.'));
          return;
        }
        if (ends.getTime() <= starts.getTime()) {
          Alert.alert(t('Validation Error'), t('End date & time must be after the start date.'));
          return;
        }
      }
      if (step === 5 && pricing === 'paid') {
        const starts = watch('startsAt');
        if (paymentMethod === 'online') {
          const salesStart = watch('salesStart');
          const salesEnd = watch('salesEnd');
          if (salesEnd.getTime() >= starts.getTime()) {
            Alert.alert(t('Validation Error'), t('Ticket sales must end before the event starts.'));
            return;
          }
          if (salesEnd.getTime() <= salesStart.getTime()) {
            Alert.alert(t('Validation Error'), t('Ticket sales end date must be after the sales start date.'));
            return;
          }
          if (!watch('acceptTerms')) {
            Alert.alert(t('Terms Required'), t('You must accept the terms and conditions to create a paid event.'));
            return;
          }
        } else {
          const payDeadline = watch('payDeadline');
          if (payDeadline.getTime() >= starts.getTime()) {
            Alert.alert(t('Validation Error'), t('Payment deadline must be before the event starts.'));
            return;
          }
        }
      }
      setStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (vals: AddEventFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: vals.title.trim(),
        type: vals.type,
        description: vals.description.trim(),
        startsAt: vals.startsAt.toISOString(),
        endsAt: vals.endsAt.toISOString(),
        location: {
          name: vals.format === 'online' ? 'Online' : vals.venueName.trim(),
          address: vals.format === 'online' ? 'Online' : `${vals.address.trim()}, ${vals.city.trim()}, ${vals.country.trim()}`,
          city: vals.format === 'online' ? 'Online' : vals.city.trim(),
          country: vals.format === 'online' ? 'Online' : vals.country.trim(),
          lat: vals.format === 'online' ? undefined : (vals.lat || undefined),
          lng: vals.format === 'online' ? undefined : (vals.lng || undefined),
        },
        organizer: {
          name: vals.organizerName.trim(),
          contact: vals.organizerContact.trim(),
        },
        maxCapacity: vals.format === 'online' ? 100 : (vals.maxCapacity ? parseInt(vals.maxCapacity, 10) : 0),
        price: vals.pricing === 'free' ? 0 : parseFloat(vals.price),
        currency: vals.pricing === 'free' ? 'TND' : vals.currency,
        imageUrl: vals.eventImage || getPresetImage(vals.type),

        format: vals.format,
        meetingUrl: vals.format === 'online' ? vals.meetingUrl.trim() : undefined,
        platform: vals.format === 'online' ? vals.platform : undefined,
        accessCode: vals.format === 'online' ? vals.accessCode.trim() : undefined,
        instructions: vals.format === 'online' ? vals.instructions.trim() : undefined,
        parkingInfo: vals.format === 'presentiel' ? vals.parkingInfo.trim() : undefined,

        // Payment configurations
        paymentMethod: vals.pricing === 'paid' ? vals.paymentMethod : undefined,

        // Online Ticket Config
        ticketName: vals.pricing === 'paid' && vals.paymentMethod === 'online' ? vals.ticketName.trim() : undefined,
        ticketDescription: vals.pricing === 'paid' && vals.paymentMethod === 'online' ? vals.ticketDescription.trim() : undefined,
        maxTicketsPerParticipant: vals.pricing === 'paid' && vals.paymentMethod === 'online' ? parseInt(vals.maxTicketsPerParticipant, 10) : undefined,
        salesStart: vals.pricing === 'paid' && vals.paymentMethod === 'online' ? vals.salesStart.toISOString() : undefined,
        salesEnd: vals.pricing === 'paid' && vals.paymentMethod === 'online' ? vals.salesEnd.toISOString() : undefined,
        refundPolicy: vals.pricing === 'paid' && vals.paymentMethod === 'online' ? vals.refundPolicy.trim() : undefined,

        // Presentiel Payment Config
        payPlaceName: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? vals.payPlaceName.trim() : undefined,
        payAddress: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? vals.payAddress.trim() : undefined,
        payCity: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? vals.payCity.trim() : undefined,
        payCountry: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? vals.payCountry.trim() : undefined,
        payLat: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? (vals.payLat || undefined) : undefined,
        payLng: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? (vals.payLng || undefined) : undefined,
        payInstructions: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? vals.payInstructions.trim() : undefined,
        payDeadline: vals.pricing === 'paid' && vals.paymentMethod === 'presentiel' ? vals.payDeadline.toISOString() : undefined,
      };

      await eventsApi.create(payload as any);
      await AsyncStorage.removeItem('@event_draft');
      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(t('Error'), err.message || t('Error occurred while creating event.'));
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const isDirty = getValues('title').trim() || getValues('description').trim() || getValues('address').trim();
      if (!isDirty || isSubmitting || showSuccessModal) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        t('Discard draft?'),
        t('You have unsaved changes. Would you like to save them as a draft or discard them?'),
        [
          { text: t('Keep Editing'), style: 'cancel', onPress: () => {} },
          {
            text: t('Save Draft'),
            onPress: async () => {
              await handleSaveDraft();
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: t('Discard'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isSubmitting, showSuccessModal]);

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.navigate('Events');
  };

  const selectedTypeObj = EVENT_TYPES.find(t => t.value === type);

  const s = useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: T.bg,
      paddingTop: Math.max(insets.top, 14),
    },
    header: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      backgroundColor: T.surface,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
    },
    saveDraftBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: T.surfaceAlt,
    },
    saveDraftText: {
      fontSize: 12,
      fontWeight: '600',
      color: T.textSub,
      fontFamily: 'Poppins_600SemiBold',
    },
    progressBarBg: {
      height: 5,
      backgroundColor: T.border,
      width: '100%',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: T.green,
    },
    stepIndicatorRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: T.surface,
    },
    stepIndicatorText: {
      fontSize: 12,
      fontWeight: '600',
      color: T.textMuted,
      fontFamily: 'Poppins_600SemiBold',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
      marginBottom: 6,
      textAlign: isRTL ? 'right' : 'left',
    },
    sectionSubtitle: {
      fontSize: 14,
      color: T.textSub,
      fontFamily: 'Poppins_400Regular',
      marginBottom: 24,
      textAlign: isRTL ? 'right' : 'left',
    },
    inputGroup: {
      marginBottom: 22,
      width: '100%',
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      textAlign: isRTL ? 'right' : 'left',
    },
    input: {
      height: 54,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1.5,
      borderColor: T.border,
      paddingHorizontal: 16,
      fontSize: 15,
      color: T.text,
      fontFamily: 'Poppins_400Regular',
      textAlign: isRTL ? 'right' : 'left',
    },
    inputArea: {
      height: 120,
      paddingTop: 14,
      textAlignVertical: 'top',
    },
    errorText: {
      color: T.red || '#EF4444',
      fontSize: 12,
      marginTop: 6,
      fontFamily: 'Poppins_400Regular',
      textAlign: isRTL ? 'right' : 'left',
    },
    coverUploadBox: {
      width: '100%',
      height: 200,
      borderRadius: 18,
      backgroundColor: T.surfaceAlt,
      borderWidth: 2,
      borderColor: T.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    imageControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 12,
    },
    imgActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: T.surfaceAlt,
    },
    imgActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: T.textSub,
      fontFamily: 'Poppins_600SemiBold',
    },
    dropdownTrigger: {
      height: 54,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1.5,
      borderColor: T.border,
      paddingHorizontal: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dropdownText: {
      fontSize: 15,
      color: T.text,
      fontFamily: 'Poppins_400Regular',
    },
    dropdownList: {
      backgroundColor: T.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: T.border,
      marginTop: 6,
      overflow: 'hidden',
      elevation: 4,
    },
    dropdownItem: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: T.border,
    },
    dropdownItemText: {
      fontSize: 15,
      color: T.text,
      fontFamily: 'Poppins_400Regular',
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: T.surfaceAlt,
      borderRadius: 14,
      padding: 5,
      marginBottom: 20,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
    },
    segmentButtonActive: {
      backgroundColor: T.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.textMuted,
    },
    segmentTextActive: {
      color: T.text,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    flex1: {
      flex: 1,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
    },
    switchLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: T.text,
      fontFamily: 'Poppins_600SemiBold',
    },
    switchSub: {
      fontSize: 12,
      color: T.textMuted,
      fontFamily: 'Poppins_400Regular',
      marginTop: 2,
    },
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: T.surface,
      borderTopWidth: 1.5,
      borderTopColor: T.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: Math.max(insets.bottom, 16),
    },
    navBtn: {
      height: 52,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 24,
    },
    backNavBtn: {
      backgroundColor: T.surfaceAlt,
    },
    nextNavBtn: {
      backgroundColor: T.green,
      flex: 1,
      marginLeft: isRTL ? 0 : 16,
      marginRight: isRTL ? 16 : 0,
    },
    navBtnText: {
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
    backNavText: {
      color: T.text,
    },
    nextNavText: {
      color: '#FFFFFF',
    },
    summaryCard: {
      backgroundColor: T.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: T.border,
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: T.textMuted,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    summaryValue: {
      fontSize: 15,
      color: T.text,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600',
    },
    summaryDesc: {
      fontSize: 14,
      color: T.textSub,
      fontFamily: 'Poppins_400Regular',
      lineHeight: 20,
    },
    summaryBox: {
      backgroundColor: T.surfaceAlt,
      borderRadius: 16,
      padding: 18,
      marginTop: 8,
      borderWidth: 1,
      borderColor: T.border,
    },
    summaryBoxTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    summaryTz: {
      fontSize: 12,
      color: T.textMuted,
      marginTop: 4,
      fontFamily: 'Poppins_400Regular',
    },
    iosPickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    iosPickerCard: {
      backgroundColor: T.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
    },
    iosPickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
    },
    iosPickerCancelText: {
      fontSize: 15,
      color: T.textMuted,
      fontFamily: 'Poppins_600SemiBold',
    },
    iosPickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
    },
    iosPickerDoneText: {
      fontSize: 15,
      color: T.green,
      fontFamily: 'Poppins_600SemiBold',
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    platformBtn: {
      width: '48%',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: T.border,
      backgroundColor: T.surface,
      alignItems: 'center',
      gap: 6,
    },
    platformBtnActive: {
      borderColor: T.green,
      backgroundColor: T.surfaceAlt,
    },
    platformText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.textSub,
    },
    platformTextActive: {
      color: T.green,
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      marginBottom: 6,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: T.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: T.green,
      borderColor: T.green,
    },
    termsText: {
      fontSize: 13,
      color: T.textSub,
      fontFamily: 'Poppins_400Regular',
      flex: 1,
    },
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
      fontFamily: 'Poppins_700Bold',
    },
    mapModalHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      backgroundColor: T.surface,
    },
    mapModalTitle: {
      fontSize: 16,
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    mapModalConfirmBtn: {
      backgroundColor: T.green,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    mapModalConfirmText: {
      color: '#FFF',
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
    },
  }), [T, screenWidth, isRTL, insets, format, pricing, paymentMethod]);

  const CustomDateTimePicker = ({
    label,
    value,
    onChange,
    minDate,
    mode,
    field,
  }: {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
    mode: 'date' | 'time';
    field: keyof AddEventFormValues;
  }) => {
    if (Platform.OS === 'web') {
      return (
        <View style={s.inputGroup}>
          <Text style={s.label}>{t(label)}</Text>
          <input
            type={mode === 'date' ? 'date' : 'time'}
            value={formatWebValue(value, mode)}
            min={minDate ? formatWebValue(minDate, mode) : undefined}
            onChange={(e) => {
              const val = e.target.value;
              const next = parseWebValue(val, mode, value);
              onChange(next);

              // Cascading updates
              if (field === 'startsAt') {
                const ends = watch('endsAt');
                if (ends.getTime() <= next.getTime()) {
                  const nextEnds = new Date(next);
                  nextEnds.setHours(next.getHours() + 2);
                  setValue('endsAt', nextEnds);
                }
              } else if (field === 'salesStart') {
                const salesEnd = watch('salesEnd');
                if (salesEnd.getTime() <= next.getTime()) {
                  const nextSalesEnd = new Date(next);
                  nextSalesEnd.setHours(next.getHours() + 1);
                  setValue('salesEnd', nextSalesEnd);
                }
              }
            }}
            style={{
              width: '100%',
              height: '54px',
              borderRadius: '14px',
              border: `1.5px solid ${T.border}`,
              backgroundColor: T.surface,
              color: T.text,
              padding: '0 16px',
              boxSizing: 'border-box',
              fontSize: '15px',
              fontFamily: 'Poppins_400Regular',
            }}
          />
        </View>
      );
    }

    return (
      <View style={s.flex1}>
        <Text style={s.label}>{t(label)}</Text>
        <TouchableOpacity
          onPress={() => setPickerConfig({ field, mode, value, minDate })}
          style={s.dropdownTrigger}
        >
          <Text style={s.dropdownText}>
            {mode === 'date'
              ? value.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
              : value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: false })}
          </Text>
          <Feather name={mode === 'date' ? 'calendar' : 'clock'} size={16} color={T.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AppScaffold title={t('New Event')} activeTab="events" showHeader={false} showBottomNav={false}>
      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Wizard Top Bar */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Feather name="x" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('Create Event')}</Text>
          <TouchableOpacity style={s.saveDraftBtn} onPress={handleSaveDraft} activeOpacity={0.85}>
            <Text style={s.saveDraftText}>{t('Save Draft')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stepper Progress Fill */}
        <View style={s.progressBarBg}>
          <Animated.View
            style={[
              s.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Wizard Panel Indicator */}
        <View style={s.stepIndicatorRow}>
          <Text style={s.stepIndicatorText}>{t(`Step ${step} of 6`)}</Text>
          <Text style={s.stepIndicatorText}>
            {step === 1 && t('Cover & Details')}
            {step === 2 && t('Format Selection')}
            {step === 3 && t('Location details')}
            {step === 4 && t('Date & Schedule')}
            {step === 5 && t('Tickets & Payment')}
            {step === 6 && t('Review & Publish')}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>

            {/* STEP 1: COVER & DETAILS */}
            {step === 1 && (
              <View>
                <Text style={s.sectionTitle}>{t('Event Details')}</Text>
                <Text style={s.sectionSubtitle}>{t('Fill in the basic info and select an event category.')}</Text>

                <View style={[s.inputGroup, { marginBottom: 24 }]}>
                  <Text style={s.label}>{t('Event Cover')}</Text>
                  <TouchableOpacity
                    onPress={handleImagePick}
                    activeOpacity={0.9}
                    style={s.coverUploadBox}
                  >
                    {eventImage ? (
                      <Image source={{ uri: eventImage }} style={s.coverImage} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center', padding: 20 }}>
                        <Feather name="image" size={40} color={T.green} style={{ marginBottom: 12 }} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: T.green, fontFamily: 'Poppins_600SemiBold' }}>
                          {t('Upload Photo')}
                        </Text>
                        <Text style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{t('Recommend landscape 16:9 ratio')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {eventImage && (
                    <View style={s.imageControls}>
                      <TouchableOpacity style={s.imgActionBtn} onPress={handleImagePick}>
                        <Feather name="edit-2" size={14} color={T.textSub} />
                        <Text style={s.imgActionText}>{t('Change')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.imgActionBtn} onPress={handleRemoveImage}>
                        <Feather name="trash-2" size={14} color={T.red} />
                        <Text style={[s.imgActionText, { color: T.red }]}>{t('Remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('Event Title *')}</Text>
                  <Controller
                    control={control}
                    name="title"
                    rules={{
                      required: t('Event title is required'),
                      minLength: { value: 2, message: t('Title must be at least 2 characters') }
                    }}
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        placeholder={t('e.g. Gluten-Free Bread Baking Class')}
                        placeholderTextColor={T.textMuted}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        style={s.input}
                      />
                    )}
                  />
                  {errors.title && <Text style={s.errorText}>{errors.title.message}</Text>}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('Event Category')}</Text>
                  <TouchableOpacity
                    style={s.dropdownTrigger}
                    onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.dropdownText}>{selectedTypeObj?.label}</Text>
                    <Feather name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={T.text} />
                  </TouchableOpacity>

                  {showTypeDropdown && (
                    <View style={s.dropdownList}>
                      {EVENT_TYPES.map((cat) => (
                        <TouchableOpacity
                          key={cat.value}
                          style={s.dropdownItem}
                          onPress={() => {
                            setValue('type', cat.value);
                            setShowTypeDropdown(false);
                          }}
                        >
                          <Text style={s.dropdownItemText}>{cat.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('Organizer Name *')}</Text>
                  <Controller
                    control={control}
                    name="organizerName"
                    rules={{ required: t('Organizer name is required') }}
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        placeholder={t('Organizer Name')}
                        placeholderTextColor={T.textMuted}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        style={s.input}
                      />
                    )}
                  />
                  {errors.organizerName && <Text style={s.errorText}>{errors.organizerName.message}</Text>}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('Organizer Contact (Email/Phone) *')}</Text>
                  <Controller
                    control={control}
                    name="organizerContact"
                    rules={{ required: t('Organizer contact details are required') }}
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        placeholder={t('e.g. contact@bakery.com')}
                        placeholderTextColor={T.textMuted}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        style={s.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    )}
                  />
                  {errors.organizerContact && <Text style={s.errorText}>{errors.organizerContact.message}</Text>}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('About the Event')}</Text>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        placeholder={t('Describe the event program, special guidelines...')}
                        placeholderTextColor={T.textMuted}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        style={[s.input, s.inputArea]}
                        multiline
                        numberOfLines={4}
                      />
                    )}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: FORMAT SELECTOR */}
            {step === 2 && (
              <View>
                <Text style={s.sectionTitle}>{t('Event Format')}</Text>
                <Text style={s.sectionSubtitle}>{t('Choose the location format for your event. Hybrid events are forbidden.')}</Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleFormatChange('presentiel')}
                  style={{
                    backgroundColor: format === 'presentiel' ? T.greenLight : T.surface,
                    borderColor: format === 'presentiel' ? T.green : T.border,
                    borderWidth: 2,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.redLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="map-pin" size={20} color={T.red} />
                  </View>
                  <View style={s.flex1}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, fontFamily: 'Poppins_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                      {t('Presentiel Event')}
                    </Text>
                    <Text style={{ fontSize: 12, color: T.textSub, marginTop: 2, fontFamily: 'Poppins_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                      {t('In-person gathering at a physical venue address.')}
                    </Text>
                  </View>
                  {format === 'presentiel' && <Ionicons name="checkmark-circle" size={24} color={T.green} />}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleFormatChange('online')}
                  style={{
                    backgroundColor: format === 'online' ? T.greenLight : T.surface,
                    borderColor: format === 'online' ? T.green : T.border,
                    borderWidth: 2,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.greenLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="video" size={20} color={T.green} />
                  </View>
                  <View style={s.flex1}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, fontFamily: 'Poppins_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                      {t('Online Event')}
                    </Text>
                    <Text style={{ fontSize: 12, color: T.textSub, marginTop: 2, fontFamily: 'Poppins_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                      {t('Virtual conference or class hosted using a streaming link.')}
                    </Text>
                  </View>
                  {format === 'online' && <Ionicons name="checkmark-circle" size={24} color={T.green} />}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: FORMAT & LOCATION DETAILS */}
            {step === 3 && (
              <View>
                {format === 'presentiel' ? (
                  <View>
                    <Text style={s.sectionTitle}>{t('Venue Location')}</Text>
                    <Text style={s.sectionSubtitle}>{t('Set the physical venue address and seating capacity details.')}</Text>

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Venue Name *')}</Text>
                      <Controller
                        control={control}
                        name="venueName"
                        rules={{ required: t('Venue name is required') }}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            placeholder={t('e.g. Bio-Corner Café')}
                            placeholderTextColor={T.textMuted}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={s.input}
                          />
                        )}
                      />
                      {errors.venueName && <Text style={s.errorText}>{errors.venueName.message}</Text>}
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Street Address *')}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={s.flex1}>
                          <Controller
                            control={control}
                            name="address"
                            rules={{ required: t('Street address is required') }}
                            render={({ field: { value, onChange, onBlur } }) => (
                              <TextInput
                                placeholder={t('e.g. 125 Rue de la Liberté')}
                                placeholderTextColor={T.textMuted}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                style={s.input}
                              />
                            )}
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setMapPickerTarget('event');
                            setPickedLocation(watch('lat') && watch('lng') ? { lat: watch('lat')!, lng: watch('lng')! } : null);
                            setShowMapPicker(true);
                          }}
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 14,
                            backgroundColor: T.redLight,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Feather name="map-pin" size={20} color={T.red} />
                        </TouchableOpacity>
                      </View>
                      {errors.address && <Text style={s.errorText}>{errors.address.message}</Text>}
                    </View>

                    <View style={s.row}>
                      <View style={[s.inputGroup, s.flex1]}>
                        <Text style={s.label}>{t('City *')}</Text>
                        <Controller
                          control={control}
                          name="city"
                          rules={{ required: t('City is required') }}
                          render={({ field: { value, onChange, onBlur } }) => (
                            <TextInput
                              placeholder={t('e.g. Tunis')}
                              placeholderTextColor={T.textMuted}
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              style={s.input}
                            />
                          )}
                        />
                        {errors.city && <Text style={s.errorText}>{errors.city.message}</Text>}
                      </View>
                      <View style={[s.inputGroup, s.flex1]}>
                        <Text style={s.label}>{t('Country *')}</Text>
                        <Controller
                          control={control}
                          name="country"
                          rules={{ required: t('Country is required') }}
                          render={({ field: { value, onChange, onBlur } }) => (
                            <TextInput
                              placeholder={t('e.g. Tunisia')}
                              placeholderTextColor={T.textMuted}
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              style={s.input}
                            />
                          )}
                        />
                        {errors.country && <Text style={s.errorText}>{errors.country.message}</Text>}
                      </View>
                    </View>

                    {watch('lat') && watch('lng') && (
                      <Text style={{ fontSize: 12, color: T.green, fontFamily: 'Poppins_600SemiBold', marginBottom: 16 }}>
                        ✓ {t('Location coordinates pinned successfully.')}
                      </Text>
                    )}

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Event Seating Capacity *')}</Text>
                      <Controller
                        control={control}
                        name="maxCapacity"
                        rules={{
                          required: t('Capacity limit is required'),
                          validate: (v) => {
                            const n = parseInt(v, 10);
                            if (isNaN(n) || n <= 0) return t('Capacity must be a positive number');
                            return true;
                          }
                        }}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            placeholder={t('e.g. 50')}
                            placeholderTextColor={T.textMuted}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="number-pad"
                            style={s.input}
                          />
                        )}
                      />
                      {errors.maxCapacity && <Text style={s.errorText}>{errors.maxCapacity.message}</Text>}
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Parking Information')}</Text>
                      <Controller
                        control={control}
                        name="parkingInfo"
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            placeholder={t('e.g. Free street parking available outside')}
                            placeholderTextColor={T.textMuted}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={s.input}
                          />
                        )}
                      />
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={s.sectionTitle}>{t('Online Meeting Links')}</Text>
                    <Text style={s.sectionSubtitle}>{t('Set the platform details where participants will join.')}</Text>

                    <Text style={s.label}>{t('Select Meeting Platform *')}</Text>
                    <View style={s.platformGrid}>
                      {PLATFORMS.map((plat) => (
                        <TouchableOpacity
                          key={plat.value}
                          activeOpacity={0.8}
                          onPress={() => handlePlatformChange(plat.value as any)}
                          style={[s.platformBtn, platform === plat.value && s.platformBtnActive]}
                        >
                          <Ionicons
                            name={plat.icon as any}
                            size={20}
                            color={platform === plat.value ? T.green : T.textMuted}
                          />
                          <Text style={[s.platformText, platform === plat.value && s.platformTextActive]}>
                            {plat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Meeting Link *')}</Text>
                      <Controller
                        control={control}
                        name="meetingUrl"
                        rules={{
                          required: t('Meeting URL is required'),
                          validate: validateMeetingUrl
                        }}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            placeholder={t('e.g. https://meet.google.com/abc-defg-hij')}
                            placeholderTextColor={T.textMuted}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="none"
                            keyboardType="url"
                            style={s.input}
                          />
                        )}
                      />
                      {errors.meetingUrl && <Text style={s.errorText}>{errors.meetingUrl.message}</Text>}
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Optional Access Code')}</Text>
                      <Controller
                        control={control}
                        name="accessCode"
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            placeholder={t('e.g. Password or passcode')}
                            placeholderTextColor={T.textMuted}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={s.input}
                          />
                        )}
                      />
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.label}>{t('Optional Instructions')}</Text>
                      <Controller
                        control={control}
                        name="instructions"
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            placeholder={t('e.g. Link will activate 10 minutes prior to start time')}
                            placeholderTextColor={T.textMuted}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={[s.input, s.inputArea]}
                            multiline
                            numberOfLines={3}
                          />
                        )}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* STEP 4: DATE & SCHEDULE */}
            {step === 4 && (
              <View>
                <Text style={s.sectionTitle}>{t('Date & Time')}</Text>
                <Text style={s.sectionSubtitle}>{t('Set the schedule for your event. Times are in device timezone.')}</Text>

                {Platform.OS === 'web' ? (
                  <View style={{ gap: 14 }}>
                    <Controller
                      control={control}
                      name="startsAt"
                      render={({ field: { value, onChange } }) => (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={s.flex1}>
                            <CustomDateTimePicker
                              label="Start Date"
                              value={value}
                              onChange={onChange}
                              minDate={new Date()}
                              mode="date"
                              field="startsAt"
                            />
                          </View>
                          <View style={s.flex1}>
                            <CustomDateTimePicker
                              label="Start Time"
                              value={value}
                              onChange={onChange}
                              mode="time"
                              field="startsAt"
                            />
                          </View>
                        </View>
                      )}
                    />
                    <Controller
                      control={control}
                      name="endsAt"
                      render={({ field: { value, onChange } }) => (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={s.flex1}>
                            <CustomDateTimePicker
                              label="End Date"
                              value={value}
                              onChange={onChange}
                              minDate={watch('startsAt')}
                              mode="date"
                              field="endsAt"
                            />
                          </View>
                          <View style={s.flex1}>
                            <CustomDateTimePicker
                              label="End Time"
                              value={value}
                              onChange={onChange}
                              mode="time"
                              field="endsAt"
                            />
                          </View>
                        </View>
                      )}
                    />
                  </View>
                ) : (
                  <View style={{ gap: 14 }}>
                    <Text style={s.label}>{t('Start Schedule')}</Text>
                    <View style={s.row}>
                      <Controller
                        control={control}
                        name="startsAt"
                        render={({ field: { value, onChange } }) => (
                          <CustomDateTimePicker
                            label="Start Date"
                            value={value}
                            onChange={onChange}
                            minDate={new Date()}
                            mode="date"
                            field="startsAt"
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name="startsAt"
                        render={({ field: { value, onChange } }) => (
                          <CustomDateTimePicker
                            label="Start Time"
                            value={value}
                            onChange={onChange}
                            mode="time"
                            field="startsAt"
                          />
                        )}
                      />
                    </View>

                    <Text style={s.label}>{t('End Schedule')}</Text>
                    <View style={s.row}>
                      <Controller
                        control={control}
                        name="endsAt"
                        render={({ field: { value, onChange } }) => (
                          <CustomDateTimePicker
                            label="End Date"
                            value={value}
                            onChange={onChange}
                            minDate={watch('startsAt')}
                            mode="date"
                            field="endsAt"
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name="endsAt"
                        render={({ field: { value, onChange } }) => (
                          <CustomDateTimePicker
                            label="End Time"
                            value={value}
                            onChange={onChange}
                            mode="time"
                            field="endsAt"
                          />
                        )}
                      />
                    </View>
                  </View>
                )}

                {/* Summary card */}
                <View style={s.summaryBox}>
                  <Text style={s.summaryBoxTitle}>{t('Schedule Summary')}</Text>
                  <View style={{ gap: 6 }}>
                    <Text style={s.summaryDesc}>
                      <Text style={{ fontWeight: '700' }}>{t('Start: ')}</Text>
                      {formatFullDateTime(watch('startsAt'))}
                    </Text>
                    <Text style={s.summaryDesc}>
                      <Text style={{ fontWeight: '700' }}>{t('End: ')}</Text>
                      {formatFullDateTime(watch('endsAt'))}
                    </Text>
                    <Text style={s.summaryTz}>{t('Timezone: ')}{watch('timezone')}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 5: TICKETS & PAYMENT */}
            {step === 5 && (
              <View>
                <Text style={s.sectionTitle}>{t('Tickets & Pricing')}</Text>
                <Text style={s.sectionSubtitle}>{t('Set the pricing model and tickets for your event.')}</Text>

                <View style={s.segmentRow}>
                  <TouchableOpacity
                    style={[s.segmentButton, pricing === 'free' && s.segmentButtonActive]}
                    onPress={() => setValue('pricing', 'free')}
                  >
                    <Text style={[s.segmentText, pricing === 'free' && s.segmentTextActive]}>{t('Free Event')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segmentButton, pricing === 'paid' && s.segmentButtonActive]}
                    onPress={() => setValue('pricing', 'paid')}
                  >
                    <Text style={[s.segmentText, pricing === 'paid' && s.segmentTextActive]}>{t('Paid Event')}</Text>
                  </TouchableOpacity>
                </View>

                {pricing === 'paid' && (
                  <View style={{ gap: 14 }}>
                    <Text style={s.label}>{t('Select Payment Method *')}</Text>
                    <View style={s.segmentRow}>
                      <TouchableOpacity
                        style={[s.segmentButton, paymentMethod === 'online' && s.segmentButtonActive]}
                        onPress={() => setValue('paymentMethod', 'online')}
                      >
                        <Text style={[s.segmentText, paymentMethod === 'online' && s.segmentTextActive]}>{t('Online Payment')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.segmentButton, paymentMethod === 'presentiel' && s.segmentButtonActive]}
                        onPress={() => setValue('paymentMethod', 'presentiel')}
                      >
                        <Text style={[s.segmentText, paymentMethod === 'presentiel' && s.segmentTextActive]}>{t('Presentiel Payment')}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Online payment config fields */}
                    {paymentMethod === 'online' ? (
                      <View style={{ gap: 14 }}>
                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Ticket Name *')}</Text>
                          <Controller
                            control={control}
                            name="ticketName"
                            rules={{ required: t('Ticket name is required') }}
                            render={({ field: { value, onChange, onBlur } }) => (
                              <TextInput
                                placeholder={t('e.g. Standard Admission')}
                                placeholderTextColor={T.textMuted}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                style={s.input}
                              />
                            )}
                          />
                          {errors.ticketName && <Text style={s.errorText}>{errors.ticketName.message}</Text>}
                        </View>

                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Ticket Description')}</Text>
                          <Controller
                            control={control}
                            name="ticketDescription"
                            render={({ field: { value, onChange, onBlur } }) => (
                              <TextInput
                                placeholder={t('e.g. Includes recipe ebook and ingredient lists')}
                                placeholderTextColor={T.textMuted}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                style={s.input}
                              />
                            )}
                          />
                        </View>

                        <View style={s.row}>
                          <View style={[s.inputGroup, s.flex1]}>
                            <Text style={s.label}>{t('Ticket Price *')}</Text>
                            <Controller
                              control={control}
                              name="price"
                              rules={{
                                required: t('Price is required'),
                                validate: (v) => {
                                  const n = parseFloat(v);
                                  if (isNaN(n) || n <= 0) return t('Price must be greater than 0');
                                  return true;
                                }
                              }}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                  placeholder="0.00"
                                  placeholderTextColor={T.textMuted}
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  keyboardType="decimal-pad"
                                  style={s.input}
                                />
                              )}
                            />
                            {errors.price && <Text style={s.errorText}>{errors.price.message}</Text>}
                          </View>

                          <View style={[s.inputGroup, s.flex1]}>
                            <Text style={s.label}>{t('Currency')}</Text>
                            <TouchableOpacity
                              style={s.dropdownTrigger}
                              onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                              activeOpacity={0.85}
                            >
                              <Text style={s.dropdownText}>{currency}</Text>
                              <Feather name={showCurrencyDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={T.text} />
                            </TouchableOpacity>

                            {showCurrencyDropdown && (
                              <View style={s.dropdownList}>
                                {CURRENCIES.map((cur) => (
                                  <TouchableOpacity
                                    key={cur}
                                    style={s.dropdownItem}
                                    onPress={() => {
                                      setValue('currency', cur);
                                      setShowCurrencyDropdown(false);
                                    }}
                                  >
                                    <Text style={s.dropdownItemText}>{cur}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={s.row}>
                          <View style={[s.inputGroup, s.flex1]}>
                            <Text style={s.label}>{t('Available Tickets *')}</Text>
                            <Controller
                              control={control}
                              name="ticketQuantity"
                              rules={{
                                required: t('Available quantity is required'),
                                validate: (v) => {
                                  const n = parseInt(v, 10);
                                  if (isNaN(n) || n < 0) return t('Cannot be negative');
                                  return true;
                                }
                              }}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                  placeholder={t('e.g. 50')}
                                  placeholderTextColor={T.textMuted}
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  keyboardType="number-pad"
                                  style={s.input}
                                />
                              )}
                            />
                            {errors.ticketQuantity && <Text style={s.errorText}>{errors.ticketQuantity.message}</Text>}
                          </View>

                          <View style={[s.inputGroup, s.flex1]}>
                            <Text style={s.label}>{t('Max Per User *')}</Text>
                            <Controller
                              control={control}
                              name="maxTicketsPerParticipant"
                              rules={{
                                required: t('Max limit is required'),
                                validate: (v) => {
                                  const n = parseInt(v, 10);
                                  if (isNaN(n) || n <= 0) return t('Must be >= 1');
                                  return true;
                                }
                              }}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                  placeholder="5"
                                  placeholderTextColor={T.textMuted}
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  keyboardType="number-pad"
                                  style={s.input}
                                />
                              )}
                            />
                            {errors.maxTicketsPerParticipant && <Text style={s.errorText}>{errors.maxTicketsPerParticipant.message}</Text>}
                          </View>
                        </View>

                        {Platform.OS === 'web' ? (
                          <View style={{ gap: 14 }}>
                            <Controller
                              control={control}
                              name="salesStart"
                              render={({ field: { value, onChange } }) => (
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                  <View style={s.flex1}>
                                    <CustomDateTimePicker
                                      label="Sales Start Date"
                                      value={value}
                                      onChange={onChange}
                                      minDate={new Date()}
                                      mode="date"
                                      field="salesStart"
                                    />
                                  </View>
                                  <View style={s.flex1}>
                                    <CustomDateTimePicker
                                      label="Sales Start Time"
                                      value={value}
                                      onChange={onChange}
                                      mode="time"
                                      field="salesStart"
                                    />
                                  </View>
                                </View>
                              )}
                            />
                            <Controller
                              control={control}
                              name="salesEnd"
                              render={({ field: { value, onChange } }) => (
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                  <View style={s.flex1}>
                                    <CustomDateTimePicker
                                      label="Sales End Date"
                                      value={value}
                                      onChange={onChange}
                                      minDate={watch('salesStart')}
                                      mode="date"
                                      field="salesEnd"
                                    />
                                  </View>
                                  <View style={s.flex1}>
                                    <CustomDateTimePicker
                                      label="Sales End Time"
                                      value={value}
                                      onChange={onChange}
                                      mode="time"
                                      field="salesEnd"
                                    />
                                  </View>
                                </View>
                              )}
                            />
                          </View>
                        ) : (
                          <View style={{ gap: 14 }}>
                            <Text style={s.label}>{t('Sales Start Period')}</Text>
                            <View style={s.row}>
                              <Controller
                                control={control}
                                name="salesStart"
                                render={({ field: { value, onChange } }) => (
                                  <CustomDateTimePicker
                                    label="Sales Start Date"
                                    value={value}
                                    onChange={onChange}
                                    minDate={new Date()}
                                    mode="date"
                                    field="salesStart"
                                  />
                                )}
                              />
                              <Controller
                                control={control}
                                name="salesStart"
                                render={({ field: { value, onChange } }) => (
                                  <CustomDateTimePicker
                                    label="Sales Start Time"
                                    value={value}
                                    onChange={onChange}
                                    mode="time"
                                    field="salesStart"
                                  />
                                )}
                              />
                            </View>

                            <Text style={s.label}>{t('Sales End Period')}</Text>
                            <View style={s.row}>
                              <Controller
                                control={control}
                                name="salesEnd"
                                render={({ field: { value, onChange } }) => (
                                  <CustomDateTimePicker
                                    label="Sales End Date"
                                    value={value}
                                    onChange={onChange}
                                    minDate={watch('salesStart')}
                                    mode="date"
                                    field="salesEnd"
                                  />
                                )}
                              />
                              <Controller
                                control={control}
                                name="salesEnd"
                                render={({ field: { value, onChange } }) => (
                                  <CustomDateTimePicker
                                    label="Sales End Time"
                                    value={value}
                                    onChange={onChange}
                                    mode="time"
                                    field="salesEnd"
                                  />
                                )}
                              />
                            </View>
                          </View>
                        )}

                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Refund Policy')}</Text>
                          <TouchableOpacity
                            style={s.dropdownTrigger}
                            onPress={() => setShowRefundDropdown(!showRefundDropdown)}
                            activeOpacity={0.85}
                          >
                            <Text style={s.dropdownText}>
                              {REFUND_POLICIES.find(p => p.value === refundPolicy)?.label}
                            </Text>
                            <Feather name={showRefundDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={T.text} />
                          </TouchableOpacity>

                          {showRefundDropdown && (
                            <View style={s.dropdownList}>
                              {REFUND_POLICIES.map((p) => (
                                <TouchableOpacity
                                  key={p.value}
                                  style={s.dropdownItem}
                                  onPress={() => {
                                    setValue('refundPolicy', p.value);
                                    setShowRefundDropdown(false);
                                  }}
                                >
                                  <Text style={s.dropdownItemText}>{p.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>

                        <Controller
                          control={control}
                          name="acceptTerms"
                          render={({ field: { value, onChange } }) => (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => onChange(!value)}
                              style={s.termsRow}
                            >
                              <View style={[s.checkbox, value && s.checkboxChecked]}>
                                {value && <Ionicons name="checkmark" size={14} color="#FFF" />}
                              </View>
                              <Text style={s.termsText}>
                                {t('I agree to the ticket creation terms, sales regulations and refund policies *')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    ) : (
                      /* Presentiel payment fields */
                      <View style={{ gap: 14 }}>
                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Payment Place Name *')}</Text>
                          <Controller
                            control={control}
                            name="payPlaceName"
                            rules={{ required: t('Payment place name is required') }}
                            render={({ field: { value, onChange, onBlur } }) => (
                              <TextInput
                                placeholder={t('e.g. Association Office')}
                                placeholderTextColor={T.textMuted}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                style={s.input}
                              />
                            )}
                          />
                          {errors.payPlaceName && <Text style={s.errorText}>{errors.payPlaceName.message}</Text>}
                        </View>

                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Payment Location Address *')}</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={s.flex1}>
                              <Controller
                                control={control}
                                name="payAddress"
                                rules={{ required: t('Payment address is required') }}
                                render={({ field: { value, onChange, onBlur } }) => (
                                  <TextInput
                                    placeholder={t('e.g. 45 Avenue de Carthage')}
                                    placeholderTextColor={T.textMuted}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    style={s.input}
                                  />
                                )}
                              />
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                setMapPickerTarget('payment');
                                setPickedLocation(watch('payLat') && watch('payLng') ? { lat: watch('payLat')!, lng: watch('payLng')! } : null);
                                setShowMapPicker(true);
                              }}
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: 14,
                                backgroundColor: T.redLight,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Feather name="map-pin" size={20} color={T.red} />
                            </TouchableOpacity>
                          </View>
                          {errors.payAddress && <Text style={s.errorText}>{errors.payAddress.message}</Text>}
                        </View>

                        <View style={s.row}>
                          <View style={[s.inputGroup, s.flex1]}>
                            <Text style={s.label}>{t('City *')}</Text>
                            <Controller
                              control={control}
                              name="payCity"
                              rules={{ required: t('City is required') }}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                  placeholder="Tunis"
                                  placeholderTextColor={T.textMuted}
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  style={s.input}
                                />
                              )}
                            />
                            {errors.payCity && <Text style={s.errorText}>{errors.payCity.message}</Text>}
                          </View>

                          <View style={[s.inputGroup, s.flex1]}>
                            <Text style={s.label}>{t('Country *')}</Text>
                            <Controller
                              control={control}
                              name="payCountry"
                              rules={{ required: t('Country is required') }}
                              render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                  placeholder="Tunisia"
                                  placeholderTextColor={T.textMuted}
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  style={s.input}
                                />
                              )}
                            />
                            {errors.payCountry && <Text style={s.errorText}>{errors.payCountry.message}</Text>}
                          </View>
                        </View>

                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Ticket Price *')}</Text>
                          <Controller
                            control={control}
                            name="price"
                            rules={{
                              required: t('Price is required'),
                              validate: (v) => {
                                const n = parseFloat(v);
                                if (isNaN(n) || n <= 0) return t('Price must be greater than 0');
                                return true;
                              }
                            }}
                            render={({ field: { value, onChange, onBlur } }) => (
                              <TextInput
                                placeholder="0.00"
                                placeholderTextColor={T.textMuted}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                                style={s.input}
                              />
                            )}
                          />
                          {errors.price && <Text style={s.errorText}>{errors.price.message}</Text>}
                        </View>

                        <View style={s.inputGroup}>
                          <Text style={s.label}>{t('Presentiel Instructions *')}</Text>
                          <Controller
                            control={control}
                            name="payInstructions"
                            rules={{ required: t('Payment instructions are required') }}
                            render={({ field: { value, onChange, onBlur } }) => (
                              <TextInput
                                placeholder={t('e.g. Payment must be completed at office before July 15')}
                                placeholderTextColor={T.textMuted}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                style={[s.input, s.inputArea]}
                                multiline
                                numberOfLines={3}
                              />
                            )}
                          />
                          {errors.payInstructions && <Text style={s.errorText}>{errors.payInstructions.message}</Text>}
                        </View>

                        {Platform.OS === 'web' ? (
                          <Controller
                            control={control}
                            name="payDeadline"
                            render={({ field: { value, onChange } }) => (
                              <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={s.flex1}>
                                  <CustomDateTimePicker
                                    label="Deadline Date"
                                    value={value}
                                    onChange={onChange}
                                    minDate={new Date()}
                                    mode="date"
                                    field="payDeadline"
                                  />
                                </View>
                                <View style={s.flex1}>
                                  <CustomDateTimePicker
                                    label="Deadline Time"
                                    value={value}
                                    onChange={onChange}
                                    mode="time"
                                    field="payDeadline"
                                  />
                                </View>
                              </View>
                            )}
                          />
                        ) : (
                          <View>
                            <Text style={s.label}>{t('Payment Deadline *')}</Text>
                            <View style={s.row}>
                              <Controller
                                control={control}
                                name="payDeadline"
                                render={({ field: { value, onChange } }) => (
                                  <CustomDateTimePicker
                                    label="Deadline Date"
                                    value={value}
                                    onChange={onChange}
                                    minDate={new Date()}
                                    mode="date"
                                    field="payDeadline"
                                  />
                                )}
                              />
                              <Controller
                                control={control}
                                name="payDeadline"
                                render={({ field: { value, onChange } }) => (
                                  <CustomDateTimePicker
                                    label="Deadline Time"
                                    value={value}
                                    onChange={onChange}
                                    mode="time"
                                    field="payDeadline"
                                  />
                                )}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* STEP 6: REVIEW & PUBLISH */}
            {step === 6 && (
              <View>
                <Text style={s.sectionTitle}>{t('Preview Event')}</Text>
                <Text style={s.sectionSubtitle}>{t('Ensure all details are correct before publishing.')}</Text>

                <View style={{ height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 20, backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border }}>
                  <Image
                    source={{ uri: eventImage || getPresetImage(watch('type')) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>

                <View style={s.summaryCard}>
                  <Text style={s.summaryLabel}>{t('Event Title')}</Text>
                  <Text style={s.summaryValue}>{watch('title')}</Text>
                </View>

                <View style={s.summaryCard}>
                  <Text style={s.summaryLabel}>{t('Format & details')}</Text>
                  <Text style={s.summaryValue}>
                    {format === 'presentiel' ? t('Presentiel Event') : t('Online Event')}
                  </Text>
                  {format === 'presentiel' ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={s.summaryDesc}>{watch('venueName')}</Text>
                      <Text style={s.summaryDesc}>{`${watch('address')}, ${watch('city')}, ${watch('country')}`}</Text>
                      {watch('parkingInfo') ? (
                        <Text style={[s.summaryDesc, { color: T.textMuted, marginTop: 4, fontStyle: 'italic' }]}>
                          🚗 {t('Parking:')} {watch('parkingInfo')}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ marginTop: 6 }}>
                      <Text style={[s.summaryDesc, { color: T.green, fontWeight: '600' }]}>
                        {t('Platform:')} {platform.toUpperCase()}
                      </Text>
                      <Text style={[s.summaryDesc, { color: T.textSub, marginTop: 2 }]} numberOfLines={1}>
                        {watch('meetingUrl')}
                      </Text>
                      {watch('accessCode') ? (
                        <Text style={[s.summaryDesc, { color: T.textMuted, marginTop: 2 }]}>
                          🔑 {t('Access Code:')} {watch('accessCode')}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={s.summaryCard}>
                  <Text style={s.summaryLabel}>{t('Organizer Details')}</Text>
                  <Text style={s.summaryValue}>{watch('organizerName')}</Text>
                  <Text style={s.summaryDesc}>{watch('organizerContact')}</Text>
                </View>

                <View style={s.summaryCard}>
                  <Text style={s.summaryLabel}>{t('Schedule & Timezone')}</Text>
                  <Text style={s.summaryValue}>{formatFullDateTime(watch('startsAt'))}</Text>
                  <Text style={s.summaryDesc}>{t('to') + ' ' + formatFullDateTime(watch('endsAt'))}</Text>
                  <Text style={[s.summaryDesc, { fontSize: 12, color: T.textMuted, marginTop: 4 }]}>{watch('timezone')}</Text>
                </View>

                <View style={s.summaryCard}>
                  <Text style={s.summaryLabel}>{t('Pricing & Tickets')}</Text>
                  <Text style={s.summaryValue}>
                    {pricing === 'free' ? t('Free Registration') : `${watch('price')} ${currency}`}
                  </Text>
                  {pricing === 'paid' && (
                    <View style={{ marginTop: 6, gap: 2 }}>
                      <Text style={s.summaryDesc}>{t('Method:')} {paymentMethod === 'online' ? t('Online Payment') : t('Presentiel Payment')}</Text>
                      {paymentMethod === 'online' ? (
                        <>
                          <Text style={s.summaryDesc}>{t('Ticket:')} {watch('ticketName')}</Text>
                          <Text style={s.summaryDesc}>{t('Qty Available:')} {watch('ticketQuantity')}</Text>
                          <Text style={s.summaryDesc}>{t('Max tickets per participant:')} {watch('maxTicketsPerParticipant')}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={s.summaryDesc}>{t('Payment At:')} {watch('payPlaceName')}</Text>
                          <Text style={s.summaryDesc}>{t('Address:')} {watch('payAddress')}</Text>
                          <Text style={[s.summaryDesc, { color: T.red }]}>
                            📅 {t('Payment Deadline:')} {watch('payDeadline').toLocaleDateString()}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                  {format === 'presentiel' && watch('maxCapacity') ? (
                    <Text style={[s.summaryDesc, { marginTop: 4 }]}>{`${t('Max Venue Capacity:')} ${watch('maxCapacity')} ${t('seats')}`}</Text>
                  ) : null}
                </View>

                {watch('description').trim() ? (
                  <View style={s.summaryCard}>
                    <Text style={s.summaryLabel}>{t('About')}</Text>
                    <Text style={s.summaryDesc}>{watch('description')}</Text>
                  </View>
                ) : null}
              </View>
            )}

          </Animated.View>
        </ScrollView>

        {/* Wizard Navigation Footer */}
        <View style={s.bottomNav}>
          {step > 1 ? (
            <TouchableOpacity style={[s.navBtn, s.backNavBtn]} onPress={handleBack} activeOpacity={0.8}>
              <Feather name="arrow-left" size={16} color={T.text} />
              <Text style={[s.navBtnText, s.backNavText]}>{t('Back')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 0 }} />
          )}

          {step < 6 ? (
            <TouchableOpacity style={[s.navBtn, s.nextNavBtn]} onPress={handleNext} activeOpacity={0.85}>
              <Text style={[s.navBtnText, s.nextNavText]}>{t('Continue')}</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.navBtn, s.nextNavBtn, { backgroundColor: T.green }]}
              onPress={hookSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={[s.navBtnText, s.nextNavText]}>{t('Publish Event')}</Text>
                  <Feather name="check" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Date Time Picker Modal overlay for iOS */}
        {pickerConfig && Platform.OS === 'ios' && (
          <Modal visible transparent animationType="slide">
            <View style={s.iosPickerOverlay}>
              <View style={s.iosPickerCard}>
                <View style={s.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setPickerConfig(null)}>
                    <Text style={s.iosPickerCancelText}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={s.iosPickerTitle}>
                    {pickerConfig.mode === 'date' ? t('Select Date') : t('Select Time')}
                  </Text>
                  <TouchableOpacity onPress={() => setPickerConfig(null)}>
                    <Text style={s.iosPickerDoneText}>{t('Done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerConfig.value}
                  mode={pickerConfig.mode}
                  display={pickerConfig.mode === 'date' ? 'inline' : 'spinner'}
                  minimumDate={pickerConfig.minDate}
                  onChange={onPickerChange}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Time Picker for Android */}
        {pickerConfig && Platform.OS !== 'ios' && (
          <DateTimePicker
            value={pickerConfig.value}
            mode={pickerConfig.mode}
            display="default"
            minimumDate={pickerConfig.minDate}
            onChange={onPickerChange}
          />
        )}

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.successCircle}>
                <Feather name="check" size={32} color="#FFFFFF" />
              </View>
              <Text style={s.modalTitle}>{t('Event Published!')}</Text>
              <Text style={s.modalSub}>{t('Your gluten-free event is now live and visible on the calendar.')}</Text>
              <TouchableOpacity style={s.okBtn} onPress={handleSuccessClose} activeOpacity={0.85}>
                <Text style={s.okBtnText}>{t('Go to Calendar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Map Picker Modal */}
        <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={{ flex: 1, width: '100%', backgroundColor: T.bg }}>
              <View style={s.mapModalHeader}>
                <TouchableOpacity onPress={() => setShowMapPicker(false)}>
                  <Feather name="x" size={24} color={T.text} />
                </TouchableOpacity>
                <Text style={s.mapModalTitle}>{t('Select Location')}</Text>
                <TouchableOpacity
                  style={[s.mapModalConfirmBtn, !pickedLocation && { opacity: 0.5 }]}
                  disabled={!pickedLocation}
                  onPress={() => {
                    if (pickedLocation) {
                      if (mapPickerTarget === 'event') {
                        setValue('lat', pickedLocation.lat);
                        setValue('lng', pickedLocation.lng);
                        setValue('address', `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`);
                        trigger('address');
                      } else {
                        setValue('payLat', pickedLocation.lat);
                        setValue('payLng', pickedLocation.lng);
                        setValue('payAddress', `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`);
                        trigger('payAddress');
                      }
                    }
                    setShowMapPicker(false);
                  }}
                >
                  <Text style={s.mapModalConfirmText}>{t('Confirm')}</Text>
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
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </AppScaffold>
  );
}
