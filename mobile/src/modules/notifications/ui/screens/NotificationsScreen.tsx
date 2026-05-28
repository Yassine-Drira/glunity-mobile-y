import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useLanguage } from '@/shared/context/language.context';
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
  const { language, isRTL } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await notificationsApi.list();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (item: Notification) => {
    if (item.isRead) {
      // If already read, let's just trigger target navigation if any
      handleNavigation(item);
      return;
    }
    
    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    try {
      await notificationsApi.markAsRead(item.id);
      handleNavigation(item);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const handleNavigation = (item: Notification) => {
    const meta = item.metadata || {};
    if (meta.eventId) {
      navigation.navigate('EventDetail', { eventId: meta.eventId });
    } else if (meta.productId) {
      navigation.navigate('ProductDetail', { productId: meta.productId });
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

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'event':
        return {
          name: 'calendar',
          color: '#8E24AA', // Purple
          bg: '#F3E5F5',
        };
      case 'product':
        return {
          name: 'shopping-bag',
          color: '#43A047', // Green
          bg: '#E8F5E9',
        };
      case 'community':
        return {
          name: 'users',
          color: '#E65100', // Orange
          bg: '#FFE0B2',
        };
      default:
        return {
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
          paddingBottom: 120, // offset BottomNavBar overlay
        },
        card: {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          backgroundColor: T.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: T.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
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
      }),
    [T, isRTL]
  );

  const rightElement = unreadCount > 0 ? (
    <TouchableOpacity style={s.headerRight} onPress={handleMarkAllRead} activeOpacity={0.7}>
      <Text style={s.markAllText}>Mark all</Text>
    </TouchableOpacity>
  ) : undefined;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.green} />
      </View>
    );
  }

  return (
    <AppScaffold
      title="Notifications"
      activeTab="profile"
      onBack={() => navigation.goBack()}
      rightElement={rightElement}
    >
      <View style={s.container}>
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.green]} />
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Feather name="bell-off" size={48} color={T.textMuted} />
              <Text style={s.emptyTitle}>All caught up! 🌿</Text>
              <Text style={s.emptySub}>No new notifications at the moment.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconConfig = getIconConfig(item.type);
            return (
              <TouchableOpacity
                style={[s.card, !item.isRead && s.cardUnread]}
                onPress={() => handleMarkAsRead(item)}
                activeOpacity={0.8}
              >
                <View style={[s.iconBox, { backgroundColor: iconConfig.bg }]}>
                  <Feather name={iconConfig.name as any} size={20} color={iconConfig.color} />
                </View>
                <View style={s.textBlock}>
                  <View style={s.rowTop}>
                    <Text style={[s.title, !item.isRead && s.titleUnread]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={s.time}>{getRelativeTime(item.createdAt, language)}</Text>
                  </View>
                  <Text style={s.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                {!item.isRead && <View style={s.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </AppScaffold>
  );
}
