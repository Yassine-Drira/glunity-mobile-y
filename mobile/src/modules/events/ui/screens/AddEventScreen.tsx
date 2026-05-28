import React, { useState } from 'react';
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

type Props = NativeStackScreenProps<AppStackParamList, 'AddEvent'>;

const EVENT_TYPES = [
  { value: 'meetup', label: 'Celiac Meetup' },
  { value: 'class', label: 'Cooking Class' },
  { value: 'webinar', label: 'Online Webinar' },
  { value: 'market', label: 'Gluten-Free Market' },
  { value: 'other', label: 'Other Event' },
];

export default function AddEventScreen({ navigation }: Props) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const bottomInset = Math.max(insets.bottom, 8) + 110;

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('meetup');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locCountry, setLocCountry] = useState('Tunisia');
  const [maxCapacity, setMaxCapacity] = useState('20');
  const [price, setPrice] = useState('0');
  const [eventImage, setEventImage] = useState<string | null>(null);

  // Status State
  const [titleError, setTitleError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      backgroundColor: T.surfaceAlt || '#F4F5F7',
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
      backgroundColor: '#FFF5F5',
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
      backgroundColor: T.surfaceAlt || '#F4F5F7',
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
    }
  };

  const handleSubmit = async () => {
    setTitleError(false);
    setDateError(false);

    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    if (!startsAt.trim()) {
      setDateError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        type,
        description: description.trim(),
        startsAt: new Date(startsAt).toISOString(),
        location: {
          name: locName.trim() || 'Tunis',
          address: locAddress.trim() || 'Avenue Habib Bourguiba',
          city: locCity.trim() || 'Tunis',
          country: locCountry.trim() || 'Tunisia',
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
      const isDirty = title.trim() || description.trim() || locName.trim() || locAddress.trim() || startsAt.trim();
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
  }, [navigation, title, description, locName, locAddress, startsAt, isSubmitting, showSuccessModal]);

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

        {/* Date / Time */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Starts At *</Text>
          <TextInput
            placeholder="YYYY-MM-DD e.g. 2026-06-15"
            placeholderTextColor={T.textMuted}
            value={startsAt}
            onChangeText={setStartsAt}
            style={[s.input, dateError ? s.inputError : null]}
          />
          {dateError && <Text style={s.errorText}>Date format is required (e.g. YYYY-MM-DD).</Text>}
        </View>

        {/* Location Section */}
        <View style={s.locationGroup}>
          <View style={s.locationHeader}>
            <Ionicons name="location-outline" size={16} color={T.green} />
            <Text style={s.locationTitle}>Location Details</Text>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Venue Name</Text>
            <TextInput
              placeholder="e.g. Green Bakery"
              placeholderTextColor={T.textMuted}
              value={locName}
              onChangeText={setLocName}
              style={s.input}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Street Address</Text>
            <TextInput
              placeholder="e.g. 15 Avenue de Paris"
              placeholderTextColor={T.textMuted}
              value={locAddress}
              onChangeText={setLocAddress}
              style={s.input}
            />
          </View>

          <View style={s.row}>
            <View style={[s.inputGroup, s.col]}>
              <Text style={s.label}>City</Text>
              <TextInput
                placeholder="Tunis"
                placeholderTextColor={T.textMuted}
                value={locCity}
                onChangeText={setLocCity}
                style={s.input}
              />
            </View>
            <View style={[s.inputGroup, s.col]}>
              <Text style={s.label}>Country</Text>
              <TextInput
                placeholder="Tunisia"
                placeholderTextColor={T.textMuted}
                value={locCountry}
                onChangeText={setLocCountry}
                style={s.input}
              />
            </View>
          </View>
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
              onChangeText={setMaxCapacity}
              style={s.input}
            />
          </View>
          <View style={[s.inputGroup, s.col]}>
            <Text style={s.label}>Price (TND)</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="0 (Free)"
              placeholderTextColor={T.textMuted}
              value={price}
              onChangeText={setPrice}
              style={s.input}
            />
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
          style={s.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isSubmitting}
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

    </AppScaffold>
  );
}
