import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { eventsApi } from '../../../home/api/events.api';
import { useSocket } from '@/shared/context/socket.context';
import { Feather, Ionicons } from '@expo/vector-icons';
import FastImage from '@/shared/components/FastImage';

export default function EventRegistrationRequestsScreen({ route, navigation }: any) {
  const { eventId, title } = route.params;
  const { theme: T } = useTheme();
  const { t, isRTL } = useLanguage();
  const { socket } = useSocket();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRegistrations = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getRegistrations(eventId);
      setRegistrations(data);
    } catch (err: any) {
      console.warn('[EventRegistrationRequests] Fetch error:', err);
      setError(err.message || t('Failed to load registrations'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const onRegChange = (payload: any) => {
      if (String(payload.eventId) === String(eventId)) {
        fetchRegistrations(true);
      }
    };
    socket.on('registration:change', onRegChange);
    return () => {
      socket.off('registration:change', onRegChange);
    };
  }, [socket, eventId, fetchRegistrations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRegistrations(true);
  }, [fetchRegistrations]);

  // Filter registrations by first name, last name, phone
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return registrations;
    const query = searchQuery.toLowerCase().trim();
    return registrations.filter((item) => {
      const form = item.registrationForm || {};
      const firstName = (form.firstName || '').toLowerCase();
      const lastName = (form.lastName || '').toLowerCase();
      const fullName = (item.fullName || '').toLowerCase();
      const phone = (form.phone || item.phone || '').toLowerCase();

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        phone.includes(query)
      );
    });
  }, [registrations, searchQuery]);

  const getStatusTextAndColor = (status: string) => {
    const s = status ? status.toUpperCase() : 'WAITING_PAYMENT';
    if (s === 'APPROVED' || s === 'CONFIRMED') {
      return { text: t('Approved'), color: T.green };
    }
    if (s === 'REJECTED' || s === 'CANCELLED') {
      return { text: t('Rejected'), color: T.textMuted };
    }
    return { text: t('Waiting Validation'), color: T.textSub };
  };

  const renderItem = ({ item }: { item: any }) => {
    const form = item.registrationForm || {};
    const { text: statusText, color: statusColor } = getStatusTextAndColor(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ViewRegistrationForm', { eventId, registrationId: item._id })}
        style={[s.itemRow, { borderBottomColor: T.border }]}
      >
        <FastImage
          source={{ uri: item.userId?.avatar?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }}
          style={s.avatar}
          contentFit="cover"
        />
        <View style={s.textContainer}>
          <Text style={[s.fullName, { color: T.text }]}>
            {form.firstName || item.fullName} {form.lastName || ''}
          </Text>
          <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={T.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <AppScaffold
      title={t('Manage Registrations')}
      subtitle={title}
      activeTab="events"
      onBack={() => navigation.goBack()}
      contentStyle={{ backgroundColor: T.bg }}
      showBottomNav={false}
    >
      <View style={s.container}>
        {/* Search Bar */}
        <View style={[s.searchBar, { backgroundColor: T.surfaceAlt, borderColor: T.border }]}>
          <Feather name="search" size={16} color={T.textMuted} style={s.searchIcon} />
          <TextInput
            style={[s.searchInput, { color: T.text }]}
            placeholder={t('Search by name or phone...')}
            placeholderTextColor={T.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && !refreshing ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={T.green} />
          </View>
        ) : error ? (
          <View style={s.center}>
            <Text style={[s.errorText, { color: T.red }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => fetchRegistrations()}
              style={[s.retryBtn, { backgroundColor: T.green }]}
            >
              <Text style={s.retryText}>{t('Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={s.center}>
            <Text style={[s.emptyText, { color: T.textMuted }]}>
              {searchQuery ? t('No matches found.') : t('No registrations found.')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[T.green]}
                tintColor={T.green}
              />
            }
          />
        )}
      </View>
    </AppScaffold>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  fullName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
