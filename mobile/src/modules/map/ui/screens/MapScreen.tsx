import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useRoute } from '@react-navigation/native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { FilterPill } from '../components/FilterPill';
import { PlaceCard } from '../components/PlaceCard';
import { MapWebView, MapWebViewHandle } from '../components/MapWebView';
import { locationsApi } from '../../api/locations.api';
import type { LocationCategory, LocationFilters, MapLocation } from '../../domain/location.types';

interface MapScreenProps {
  userName?: string;
  userAvatarUri?: string | null;
  onPressNavHome?: () => void;
  onPressNavEvents?: () => void;
  onPressNavReels?: () => void;
  onPressNavProfile?: () => void;
  onPressProfilePhoto?: () => void;
}



const CATEGORIES: Array<{ key: LocationCategory | 'all'; label: string }> = [
  { key: 'all',        label: 'All' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'bakery',     label: 'Bakeries' },
  { key: 'grocery',    label: 'Grocery' },
  { key: 'cafe',       label: 'Cafés' },
  { key: 'pharmacy',   label: 'Pharmacy' },
];

/**
 * Collaborative gluten-free map.
 *  - Top bar with avatar, name, search and notification bell
 *  - Floating Filter pill above the map
 *  - Leaflet WebView showing all GF locations
 *  - Bottom card: compact (no selection) → detailed when a pin is tapped
 */
export default function MapScreen({
  onPressNavHome,
  onPressNavEvents,
  onPressNavReels,
  onPressNavProfile,
}: MapScreenProps) {
  const { theme: T } = useTheme();
  const { isRTL, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapWebViewHandle>(null);

  const [filters, setFilters]       = useState<LocationFilters>({ category: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [showContactFor, setShowContactFor] = useState<MapLocation | null>(null);
  const [copied, setCopied] = useState(false);
  const [items, setItems]           = useState<MapLocation[]>([]);
  const [selectedId, setSelected]   = useState<string | null>(null);
  const [isLoading, setLoading]     = useState(true);
  const [errorMsg, setError]        = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const route = useRoute<any>();
  const initialLat = route.params?.latitude;
  const initialLng = route.params?.longitude;
  const initialTitle = route.params?.title || 'Selected Event';

  // If there are coordinates passed from route, auto-select and zoom to it.
  useEffect(() => {
    if (initialLat && initialLng) {
      setSelected('event-pin');
      setTimeout(() => {
        mapRef.current?.flyTo(initialLng, initialLat, 16);
      }, 1000);
    }
  }, [initialLat, initialLng]);

  const itemsWithEvent = useMemo(() => {
    if (initialLat && initialLng) {
      const eventLoc: MapLocation = {
        id: 'event-pin',
        name: initialTitle,
        description: 'Event Location',
        category: 'other',
        glutenFree: true,
        certified: false,
        contaminationWarning: false,
        address: route.params?.address || 'Pinned location',
        city: '',
        country: '',
        phone: '',
        priceRange: '',
        lat: initialLat,
        lng: initialLng,
        images: [],
        rating: { average: 0, count: 0 }
      };
      return [eventLoc, ...items.filter(it => it.id !== 'event-pin')];
    }
    return items;
  }, [items, initialLat, initialLng, initialTitle, route.params?.address]);

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },

    // ── header ────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingVertical: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarWrap: { width: 40, height: 40, position: 'relative' },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { backgroundColor: T.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { fontSize: 16, fontWeight: '600', color: T.text, fontFamily: 'Poppins_600SemiBold' },
    avatarBadge: {
      position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8,
      backgroundColor: T.green, borderWidth: 2, borderColor: T.bg, alignItems: 'center', justifyContent: 'center',
    },
    userName: { fontSize: 17, fontWeight: '600', color: T.text, fontFamily: 'Poppins_600SemiBold' },
    iconBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: T.border,
    },

    // ── map ───────────────────────────────────────────────────────────────────
    mapWrap: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 0 },
    filterPillWrap: { position: 'absolute', top: 14, alignSelf: 'center' },
    myLocationBtn: {
      position: 'absolute',
      top: 70,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: T.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      zIndex: 20,
    },
    loadingBadge: {
      position: 'absolute', top: 16, right: 16,
      width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    errorBadge: {
      position: 'absolute', top: 60, left: 16, right: 16,
      backgroundColor: T.redLight, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: T.red,
    },
    errorText: { color: T.red, fontSize: 12, fontFamily: 'Poppins_500Medium' },

    // ── bottom card slot ──────────────────────────────────────────────────────
    cardSlot: { position: 'absolute', left: 16, right: 16 },

    // ── filter sheet ──────────────────────────────────────────────────────────
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 34,
      borderWidth: 1, borderColor: T.border, borderBottomWidth: 0,
    },
    sheetHandle: {
      alignSelf: 'center', width: 40, height: 5, borderRadius: 2.5,
      backgroundColor: T.divider, marginBottom: 16,
    },
    sheetTitle: { fontSize: 19, fontFamily: 'Poppins_700Bold', color: T.text, marginBottom: 16 },
    sheetSubtitle: { fontSize: 13, color: T.textMuted, fontFamily: 'Poppins_600SemiBold', marginTop: 10, marginBottom: 8 },
    chipRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
      backgroundColor: T.surfaceAlt,
      borderWidth: 1, borderColor: T.border,
    },
    chipActive: { backgroundColor: T.green, borderColor: T.green },
    chipText: { fontSize: 13, color: T.textSub, fontFamily: 'Poppins_500Medium' },
    chipTextActive: { color: T.white, fontFamily: 'Poppins_600SemiBold' },
    toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    clearBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
    clearText: { color: T.green, fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

    // ── contact sheet ────────────────────────────────────────────────────────
    contactSheet: {
      backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 34,
      borderWidth: 1, borderColor: T.border, borderBottomWidth: 0,
      width: '100%',
    },
    contactMerchantName: {
      fontSize: 15, color: T.textSub, fontFamily: 'Poppins_500Medium', marginBottom: 20, textAlign: 'center'
    },
    contactPhoneBox: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: T.surfaceAlt, borderRadius: 14, padding: 18, marginBottom: 20,
      borderWidth: 1, borderColor: T.border,
    },
    contactPhoneNumber: {
      fontSize: 20, fontWeight: '700', color: T.text, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5
    },
    contactActionsRow: {
      flexDirection: 'row', gap: 12, width: '100%'
    },
    contactBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 12,
    },
    contactBtnText: {
      fontSize: 14, fontWeight: '600', fontFamily: 'Poppins_600SemiBold'
    },
    cancelBtn: {
      width: '100%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, borderWidth: 1, borderColor: T.border,
    },
    cancelBtnText: {
      fontSize: 14, fontWeight: '600', color: T.textSub, fontFamily: 'Poppins_600SemiBold'
    },
  }), [T]);

  // Auto-detect user location on mount (Web Browser Geolocation)
  useEffect(() => {
    if (Platform.OS === 'web' && navigator.geolocation) {
      setLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (!isFinite(coords.lat) || !isFinite(coords.lng)) return;
          setUserLocation(coords);
          setTimeout(() => {
            mapRef.current?.flyTo(coords.lng, coords.lat, 14);
          }, 1500);
          setLocatingUser(false);
        },
        (err) => {
          console.warn('Geolocation failed or permission denied:', err);
          setLocatingUser(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleMyLocation = () => {
    if (Platform.OS === 'web' && navigator.geolocation) {
      setLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          mapRef.current?.flyTo(coords.lng, coords.lat, 15);
          setLocatingUser(false);
        },
        (err) => {
          alert('Could not retrieve your location: ' + err.message);
          setLocatingUser(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Location services are not available on this platform.');
    }
  };

  const fetchLocations = useCallback(async (f: LocationFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await locationsApi.list({
        category: f.category && f.category !== 'all' ? f.category : undefined,
        glutenFree: f.glutenFree,
        certified: f.certified,
        search: f.search,
        limit: 100,
      });
      setItems(data);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || 'Could not load map locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(filters); }, [filters, fetchLocations]);

  const selected = useMemo(
    () => itemsWithEvent.find((it) => it.id === selectedId) || null,
    [itemsWithEvent, selectedId],
  );

  function applyFilter(next: Partial<LocationFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setShowFilters(false);
  }

  function onSelectFromMap(id: string | null) {
    setSelected(id);
    if (id) {
      const loc = itemsWithEvent.find((l) => l.id === id);
      if (loc && isFinite(loc.lat) && isFinite(loc.lng)) {
        mapRef.current?.flyTo(loc.lng, loc.lat, 16);
      }
      locationsApi.incrementClicks(id);
    }
  }

  function onContact() {
    if (selected) {
      setShowContactFor(selected);
    }
  }

  const handleCopyPhone = () => {
    if (showContactFor?.phone) {
      Clipboard.setString(showContactFor.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDialPhone = () => {
    if (showContactFor?.phone) {
      Linking.openURL(`tel:${showContactFor.phone}`).catch(() => {});
      setShowContactFor(null);
    }
  };

  return (
    <AppScaffold
      title={t('Map')}
      activeTab="events"
      onPressHome={onPressNavHome}
      onPressEvents={onPressNavEvents}
      onPressCenter={() => {}}
      onPressReels={onPressNavReels}
      onPressProfile={onPressNavProfile}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <View style={styles.root}>
        {/* ── Map + filter pill overlay ──────────────────────────────────── */}
        <View style={styles.mapWrap}>
          <MapWebView
            ref={mapRef}
            locations={itemsWithEvent}
            focusedId={selectedId}
            onSelectLocation={onSelectFromMap}
            initialCenter={{ lng: 10.181667, lat: 36.806389 }}
            initialZoom={14}
            userLocation={userLocation}
          />

          <View style={styles.filterPillWrap}>
            <FilterPill onPress={() => setShowFilters(true)} label={t('Filter')} />
          </View>

          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={handleMyLocation}
            activeOpacity={0.8}
          >
            {locatingUser ? (
              <ActivityIndicator size="small" color={T.green} />
            ) : (
              <Ionicons name="navigate-outline" size={20} color={T.green} />
            )}
          </TouchableOpacity>

          {isLoading && (
            <View style={styles.loadingBadge}>
              <ActivityIndicator size="small" color={T.green} />
            </View>
          )}

          {!!errorMsg && !isLoading && (
            <View style={styles.errorBadge}>
              <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {/* ── Floating place card ────────────────────────────────────────── */}
        {selected && selected.id !== 'event-pin' ? (
          <View style={[styles.cardSlot, { bottom: 96 + Math.max(insets.bottom, 10) + 16 }]}>
            <PlaceCard
              location={selected}
              variant="detailed"
              distanceKm={5}
              etaMinutes={15}
              onContact={onContact}
            />
          </View>
        ) : null}

        {/* ── Filter sheet ───────────────────────────────────────────────── */}
        <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilters(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('Filter places')}</Text>

              <Text style={styles.sheetSubtitle}>{t('Category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORIES.map((c) => {
                  const isActive = (filters.category || 'all') === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => applyFilter({ category: c.key })}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{t(c.label)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.sheetSubtitle}>{t('Status')}</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => applyFilter({ certified: !filters.certified ? true : undefined })}
                  style={[styles.chip, filters.certified && styles.chipActive]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={filters.certified ? T.white : T.green}
                  />
                  <Text style={[styles.chipText, filters.certified && styles.chipTextActive]}>{t('Certified only')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => applyFilter({ glutenFree: !filters.glutenFree ? true : undefined })}
                  style={[styles.chip, filters.glutenFree && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filters.glutenFree && styles.chipTextActive]}>{t('Gluten-free only')}</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => { setFilters({ category: 'all' }); setShowFilters(false); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearText}>{t('Clear filters')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Contact sheet modal ────────────────────────────────────────── */}
        <Modal visible={!!showContactFor} animationType="slide" transparent onRequestClose={() => setShowContactFor(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowContactFor(null)}>
            <Pressable style={styles.contactSheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('Get in Touch')}</Text>
              <Text style={styles.contactMerchantName}>{t(showContactFor?.name || '')}</Text>

              <View style={styles.contactPhoneBox}>
                <Feather name="phone" size={20} color={T.green} />
                <Text style={styles.contactPhoneNumber}>{showContactFor?.phone || t('No phone number listed')}</Text>
              </View>

              {showContactFor?.phone ? (
                <View style={styles.contactActionsRow}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: T.surfaceAlt }]}
                    onPress={handleCopyPhone}
                  >
                    <Feather name={copied ? "check" : "copy"} size={16} color={copied ? T.green : T.text} />
                    <Text 
                      style={[styles.contactBtnText, { color: T.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {copied ? t('Copied!') : t('Copy Number')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: T.green }]}
                    onPress={handleDialPhone}
                  >
                    <Feather name="phone-call" size={16} color="#FFFFFF" />
                    <Text 
                      style={[styles.contactBtnText, { color: '#FFFFFF' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {t('Call Now')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cancelBtn, { marginTop: 14 }]}
                onPress={() => setShowContactFor(null)}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AppScaffold>
  );
}

// Styles dynamically resolved inside MapScreen
