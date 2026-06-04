import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useLanguage } from '@/shared/context/language.context';
import { useAuth } from '@/modules/auth/state/auth.context';
import notificationsApi, { Notification } from '../../api/notifications.api';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

const F = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

function getRelativeTime(dateString: string, lang: 'en' | 'fr' | 'ar') {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (lang === 'ar') {
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} د`;
    if (diffHours < 24) return `منذ ${diffHours} س`;
    if (diffDays === 1) return 'أمس';
    return date.toLocaleDateString('ar-TN', { month: 'short', day: 'numeric' });
  }
  if (lang === 'fr') {
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  }

  // Default English
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen({ navigation }: Props) {
  const { theme: T } = useTheme();
  const { language, isRTL, t } = useLanguage();
  const { user } = useAuth();
  const LIMIT = 15;
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const hasRedirect = (item: Notification) => {
    const meta = item.metadata || {};
    return !!(meta.eventId || meta.productId || item.type === 'achievement');
  };

  const fetchNotifications = useCallback(async (currentSkip = 0, isRefresh = false) => {
    if (currentSkip === 0) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await notificationsApi.list({ limit: LIMIT, skip: currentSkip });
      if (res.success) {
        const newItems = res.data ?? [];
        setNotifications(prev => {
          if (currentSkip === 0) return newItems;
          return [...prev, ...newItems];
        });
        if (newItems.length < LIMIT) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(0);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (item: Notification) => {
    setSelectedNotif(item);

    if (item.isRead) {
      return;
    }
    
    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    try {
      await notificationsApi.markAsRead(item.id);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const handleNavigation = (item: Notification) => {
    const meta = item.metadata || {};
    if (meta.eventId && meta.kind === 'removed') {
      // Removed events: send user to the Events list (event no longer exists)
      navigation.navigate('Events');
    } else if (meta.eventId) {
      // Other event notifications (including cancelled) open detail
      navigation.navigate('EventDetail', { eventId: meta.eventId });
    } else if (meta.productId) {
      navigation.navigate('ProductDetail', { productId: meta.productId });
    } else if (item.type === 'achievement') {
      if (user?.profileType === 'pro_commerce' || user?.profileType === 'pro_health') {
        navigation.navigate('SellerProProfile');
      } else {
        navigation.navigate('Profile');
      }
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (item: Notification) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== item.id));

    try {
      await notificationsApi.remove(item.id);
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    // Optimistic UI update
    setNotifications([]);

    try {
      await notificationsApi.removeAll();
    } catch (err) {
      console.warn('Failed to clear all notifications:', err);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSkip(0);
    setHasMore(true);
    fetchNotifications(0, true);
  }, [fetchNotifications]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextSkip = skip + LIMIT;
      setSkip(nextSkip);
      fetchNotifications(nextSkip);
    }
  }, [loadingMore, hasMore, loading, skip, fetchNotifications]);

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'achievement':
        return {
          lib: 'mci',
          name: 'trophy-outline',
          color: '#FFB300', // Deep Gold/Amber
          bg: '#FFF8E1', // Light amber background
        };
      case 'event':
        return {
          lib: 'feather',
          name: 'calendar',
          color: '#8E24AA', // Purple
          bg: '#F3E5F5',
        };
      case 'product':
        return {
          lib: 'feather',
          name: 'shopping-bag',
          color: '#43A047', // Green
          bg: '#E8F5E9',
        };
      case 'community':
        return {
          lib: 'feather',
          name: 'users',
          color: '#E65100', // Orange
          bg: '#FFE0B2',
        };
      default:
        return {
          lib: 'feather',
          name: 'bell',
          color: '#1E88E5', // Blue
          bg: '#E3F2FD',
        };
    }
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: T.bg,
        },
        actionBar: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: T.border,
          backgroundColor: T.surface,
        },
        actionButton: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: T.surfaceAlt,
        },
        actionButtonText: {
          fontSize: 12.5,
          fontFamily: F.medium,
          color: T.green,
          fontWeight: '500',
          marginLeft: isRTL ? 0 : 6,
          marginRight: isRTL ? 6 : 0,
        },
        centered: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: T.bg,
        },
        headerRight: {
          paddingVertical: 4,
          paddingHorizontal: 8,
        },
        markAllText: {
          fontSize: 13,
          color: T.green,
          fontFamily: F.semibold,
          fontWeight: '600',
        },
        listContent: {
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 0, // offset BottomNavBar overlay
        },
        card: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          backgroundColor: T.surface,
          borderRadius: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
          overflow: 'hidden',
        },
        cardClickable: {
          flex: 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          padding: 14,
        },
        deleteBtn: {
          paddingHorizontal: 14,
          paddingVertical: 16,
          justifyContent: 'center',
          alignItems: 'center',
          borderLeftWidth: isRTL ? 0 : 1,
          borderRightWidth: isRTL ? 1 : 0,
          borderColor: T.border,
        },
        cardUnread: {
          backgroundColor: T.surface,
          borderColor: T.greenLight,
        },
        iconBox: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: isRTL ? 0 : 14,
          marginLeft: isRTL ? 14 : 0,
        },
        textBlock: {
          flex: 1,
          alignItems: isRTL ? 'flex-end' : 'flex-start',
        },
        rowTop: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
          width: '100%',
        },
        title: {
          fontSize: 14.5,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.text,
          flex: 1,
          marginRight: isRTL ? 0 : 8,
          marginLeft: isRTL ? 8 : 0,
          textAlign: isRTL ? 'right' : 'left',
        },
        titleUnread: {
          fontWeight: '700',
          fontFamily: F.bold,
        },
        time: {
          fontSize: 11,
          color: T.textMuted,
          fontFamily: F.regular,
        },
        body: {
          fontSize: 13,
          color: T.textSub,
          fontFamily: F.regular,
          lineHeight: 18,
          textAlign: isRTL ? 'right' : 'left',
          width: '100%',
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: T.green,
          marginLeft: isRTL ? 0 : 10,
          marginRight: isRTL ? 10 : 0,
        },
        emptyBox: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 80,
        },
        emptyTitle: {
          fontSize: 17,
          fontFamily: F.semibold,
          fontWeight: '600',
          color: T.text,
          marginTop: 16,
          marginBottom: 6,
        },
        emptySub: {
          fontSize: 14,
          color: T.textMuted,
          fontFamily: F.regular,
          textAlign: 'center',
          paddingHorizontal: 32,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        },
        modalContainer: {
          width: '100%',
          maxWidth: 340,
          backgroundColor: T.surface,
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 18,
          elevation: 10,
          position: 'relative',
        },
        modalCloseIcon: {
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
        },
        modalIconBox: {
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        },
        modalTitle: {
          fontSize: 17,
          fontFamily: F.bold,
          fontWeight: '700',
          color: T.text,
          textAlign: 'center',
          paddingHorizontal: 8,
        },
        modalTime: {
          fontSize: 11,
          color: T.textMuted,
          fontFamily: F.regular,
          marginTop: 4,
          marginBottom: 16,
        },
        modalScroll: {
          width: '100%',
          maxHeight: 180,
          marginBottom: 24,
        },
        modalBody: {
          fontSize: 14,
          color: T.textSub,
          fontFamily: F.regular,
          lineHeight: 20,
          textAlign: 'center',
        },
        modalFooter: {
          flexDirection: 'column',
          width: '100%',
          gap: 10,
        },
        modalPrimaryBtn: {
          backgroundColor: T.green,
          borderRadius: 14,
          height: 46,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          shadowColor: T.green,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        },
        modalPrimaryText: {
          color: '#FFFFFF',
          fontSize: 14,
          fontFamily: F.semibold,
          fontWeight: '600',
        },
        modalSecondaryBtn: {
          backgroundColor: T.surfaceAlt,
          borderRadius: 14,
          height: 46,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          borderWidth: 1,
          borderColor: T.border,
        },
        modalSecondaryText: {
          color: T.text,
          fontSize: 14,
          fontFamily: F.medium,
          fontWeight: '500',
        },
      }),
    [T, isRTL]
  );


  if (loading) {
    return (
      <AppScaffold
        title={t('Notifications')}
        activeTab="profile"
        onBack={() => navigation.goBack()}
      >
        <View style={s.container}>
          <View style={s.listContent}>
            {[1, 2, 3, 4, 5].map((key) => (
              <View key={key} style={[s.card, { opacity: 0.5, borderColor: T.border }]}>
                <View style={[s.iconBox, { backgroundColor: T.border, opacity: 0.3 }]} />
                <View style={s.textBlock}>
                  <View style={[s.rowTop, { marginBottom: 8 }]}>
                    <View style={{ width: '45%', height: 14, backgroundColor: T.border, borderRadius: 4 }} />
                    <View style={{ width: '20%', height: 10, backgroundColor: T.border, borderRadius: 4 }} />
                  </View>
                  <View style={{ width: '75%', height: 12, backgroundColor: T.border, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold
      title={t('Notifications')}
      activeTab="profile"
      onBack={() => navigation.goBack()}
    >
      <View style={s.container}>
        {notifications.length > 0 && (
          <View style={s.actionBar}>
            <TouchableOpacity style={s.actionButton} onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Feather name="check-square" size={14} color={T.green} />
              <Text style={s.actionButtonText}>{t('Mark all read')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.actionButton} onPress={handleClearAll} activeOpacity={0.7}>
              <Feather name="trash-2" size={14} color={T.red} />
              <Text style={[s.actionButtonText, { color: T.red }]}>{t('Clear all')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={T.green} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.green]} />
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Feather name="bell-off" size={48} color={T.textMuted} />
              <Text style={s.emptyTitle}>{t('All caught up! 🌿')}</Text>
              <Text style={s.emptySub}>{t('No new notifications at the moment.')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconConfig = getIconConfig(item.type);
            return (
              <View style={[s.card, !item.isRead && s.cardUnread]}>
                <TouchableOpacity
                  style={s.cardClickable}
                  onPress={() => handleMarkAsRead(item)}
                  activeOpacity={0.8}
                >
                  <View style={[s.iconBox, { backgroundColor: iconConfig.bg }]}>
                    {iconConfig.lib === 'mci' ? (
                      <MaterialCommunityIcons name={iconConfig.name as any} size={22} color={iconConfig.color} />
                    ) : (
                      <Feather name={iconConfig.name as any} size={20} color={iconConfig.color} />
                    )}
                  </View>
                  <View style={s.textBlock}>
                    <View style={s.rowTop}>
                      <Text style={[s.title, !item.isRead && s.titleUnread]} numberOfLines={1}>
                        {t(item.title)}
                      </Text>
                      <Text style={s.time}>{getRelativeTime(item.createdAt, language)}</Text>
                    </View>
                    <Text style={s.body} numberOfLines={2}>
                      {t(item.body)}
                    </Text>
                  </View>
                  {!item.isRead && <View style={s.dot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={16} color={T.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {selectedNotif && (
          <Modal
            visible={!!selectedNotif}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedNotif(null)}
          >
            <View style={s.modalBackdrop}>
              <View style={s.modalContainer}>
                <TouchableOpacity
                  style={s.modalCloseIcon}
                  onPress={() => setSelectedNotif(null)}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={20} color={T.textMuted} />
                </TouchableOpacity>

                <View style={[s.modalIconBox, { backgroundColor: getIconConfig(selectedNotif.type).bg }]}>
                  {getIconConfig(selectedNotif.type).lib === 'mci' ? (
                    <MaterialCommunityIcons
                      name={getIconConfig(selectedNotif.type).name as any}
                      size={28}
                      color={getIconConfig(selectedNotif.type).color}
                    />
                  ) : (
                    <Feather
                      name={getIconConfig(selectedNotif.type).name as any}
                      size={26}
                      color={getIconConfig(selectedNotif.type).color}
                    />
                  )}
                </View>

                <Text style={s.modalTitle}>{t(selectedNotif.title)}</Text>
                <Text style={s.modalTime}>{getRelativeTime(selectedNotif.createdAt, language)}</Text>

                <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={true}>
                  <Text style={s.modalBody}>{t(selectedNotif.body)}</Text>
                </ScrollView>

                <View style={s.modalFooter}>
                  {hasRedirect(selectedNotif) ? (
                    <>
                      <TouchableOpacity
                        style={s.modalPrimaryBtn}
                        onPress={() => {
                          const item = selectedNotif;
                          setSelectedNotif(null);
                          // Delay navigation slightly so the modal transition completes smoothly
                          setTimeout(() => {
                            handleNavigation(item);
                          }, 150);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={s.modalPrimaryText}>{t('Explore details')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.modalSecondaryBtn}
                        onPress={() => setSelectedNotif(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.modalSecondaryText}>{t('CLOSE')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={s.modalPrimaryBtn}
                      onPress={() => setSelectedNotif(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.modalPrimaryText}>{t('CLOSE')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </AppScaffold>
  );
}
