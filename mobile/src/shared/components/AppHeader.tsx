/**
 * AppHeader — Unified global header for every screen in the app.
 * Integrates directly with the page background and showcases real user avatar/name on main screens.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/theme.context';
import AnimatedReanimated, { SlideInDown, SlideOutUp, useReducedMotion } from 'react-native-reanimated';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import notificationsApi from '@/modules/notifications/api/notifications.api';
import { useLanguage } from '../context/language.context';
import { useSocket } from '../context/socket.context';
import { Avatar } from './Avatar';

let BlurView: any = null;
try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }

const F = {
  regular:  'Poppins_400Regular',
  semibold: 'Poppins_600SemiBold',
  bold:     'Poppins_700Bold',
};

interface AppHeaderProps {
  title: string;
  /** Show back arrow on the left */
  onBack?: () => void;
  /** Icon name from MaterialCommunityIcons for right action */
  rightIcon?: string;
  /** Handler for right action icon */
  onRightPress?: () => void;
  /** Pass a custom right element instead of an icon */
  rightElement?: React.ReactNode;
  /** Show search button in main header */
  showSearch?: boolean;
  /** Handler for search button */
  onSearchPress?: () => void;
  /** Feather icon name for search button */
  searchIcon?: string;
  /** Override subtitle below the title */
  subtitle?: string;
}


export function AppHeader({
  title,
  onBack,
  rightIcon,
  onRightPress,
  rightElement,
  showSearch,
  onSearchPress,
  searchIcon,
  subtitle,
}: AppHeaderProps) {
  const { theme: C, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { isRTL, t } = useLanguage();
  const isPro = user?.profileType?.startsWith('pro_');
  const roleColor = isPro ? C.red : C.green;
  const roleBadgeIcon = !isPro
    ? 'leaf'
    : user?.profileType === 'pro_health'
    ? 'stethoscope'
    : 'check-decagram';
  const shouldShowSearch = showSearch ?? !!onSearchPress;

  const handleProfilePress = () => {
    if (user?.profileType === 'pro_commerce') {
      navigation.navigate('SellerProProfile');
    } else {
      navigation.navigate('Profile');
    }
  };

  const [unreadCount, setUnreadCount] = React.useState(0);
  const prevUnreadCountRef = React.useRef(0);
  const notifiedIdsRef = React.useRef(new Set<string>());
  const navigationRef = React.useRef(navigation);

  const [activeToast, setActiveToast] = React.useState<{ title: string; body: string; type?: string } | null>(null);
  const reducedMotion = useReducedMotion();
  const { socket } = useSocket();

  const isExpectedAuthError = React.useCallback((err: any) => {
    const code = err?.code;
    const status = err?.response?.status;
    return code === 'NO_ACCESS_TOKEN' || status === 401;
  }, []);

  React.useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Keep navigation ref updated
  React.useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  // Fetch unread status with polling
  React.useEffect(() => {
    if (!user || !isFocused) return;
    let mounted = true;
    let isFirstLoad = true;

    const checkUnread = async () => {
      try {
        // Ensure we have an access token before calling protected API
        const { TokenStore } = require('@/core/storage/secure-store');
        const token = await TokenStore.getAccessToken();
        if (!token) return;

        const res = await notificationsApi.list();
        if (res.success && mounted) {
          const unread = res.data.filter((n: any) => !n.isRead).length;

          // Alert on new notification if count went up
          if (!isFirstLoad && unread > prevUnreadCountRef.current) {
            const newNotifications = res.data.filter((n: any) => !n.isRead);
            if (newNotifications.length > 0) {
              const latestNotif = newNotifications[0];
              if (latestNotif.id && !notifiedIdsRef.current.has(latestNotif.id)) {
                notifiedIdsRef.current.add(latestNotif.id);
                setActiveToast({ title: latestNotif.title, body: latestNotif.body, type: latestNotif.type });
              }
            }
          }

          prevUnreadCountRef.current = unread;
          setUnreadCount(unread);
          isFirstLoad = false;
        }
      } catch (err) {
        // Ignore expected auth failures to avoid noisy logs on session expiry.
        if (!isExpectedAuthError(err)) {
          console.warn('Failed to check unread notifications:', err);
        }
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 15000); // Check every 15 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user, isFocused, isExpectedAuthError]);

  // Real-time notification sync (badge + toast), with polling kept as fallback.
  React.useEffect(() => {
    if (!socket || !user) return;

    const onBadge = (payload: { unreadCount?: number }) => {
      const next = Number(payload?.unreadCount);
      if (Number.isFinite(next) && next >= 0) {
        prevUnreadCountRef.current = next;
        setUnreadCount(next);
      }
    };

    const onNotification = (notif: { id?: string; title?: string; body?: string; isRead?: boolean; type?: string }) => {
      if (notif?.isRead) return;
      if (notif?.id) notifiedIdsRef.current.add(notif.id);

      setUnreadCount((prev) => {
        const next = prev + 1;
        prevUnreadCountRef.current = next;
        return next;
      });

      if (notif?.title || notif?.body) {
        setActiveToast({
          title: notif?.title || 'New Notification',
          body: notif?.body || '',
          type: notif?.type || 'info',
        });
      }
    };

    socket.on('notification:badge', onBadge);
    socket.on('notification:new', onNotification);

    return () => {
      socket.off('notification:badge', onBadge);
      socket.off('notification:new', onNotification);
    };
  }, [socket, user]);

  // Extract first name
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Yassmine';

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          backgroundColor: C.bg,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 6 : 6,
          paddingBottom: 6,
        },
        row: {
          height: 68,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginHorizontal: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
          backgroundColor: C.bg,
        },
        // ── Main Tab Headers (Avatar + First Name left, Search + Bell right) ──
        mainLeft: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        avatarWrap: {
          position: 'relative',
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'transparent',
        },
        shieldBadge: {
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: 17,
          height: 17,
          borderRadius: 8.5,
          backgroundColor: roleColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: C.bg,
        },
        profileInfo: {
          marginLeft: 12,
          justifyContent: 'center',
        },
        greetingText: {
          fontSize: 10,
          fontFamily: F.regular,
          color: C.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 1,
          textAlign: isRTL ? 'right' : 'left',
        },
        nameText: {
          fontSize: 16,
          fontFamily: F.bold,
          fontWeight: '700',
          color: C.text,
          letterSpacing: -0.3,
          textAlign: isRTL ? 'right' : 'left',
        },
        mainRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        actionBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        badgeDot: {
          position: 'absolute',
          top: 0,
          right: 0,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#FF3B30', // Vibrant Red
          borderWidth: 1.5,
          borderColor: C.surface,
        },
        // ── Detail Screen Headers (Back Button + Title) ──
        detailRow: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
          marginRight: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
        },
        detailTitleWrap: {
          flex: 1,
        },
        detailTitle: {
          fontSize: 18,
          fontFamily: F.bold,
          fontWeight: '700',
          color: C.text,
          letterSpacing: -0.4,
          textAlign: isRTL ? 'right' : 'left',
        },
        detailSubtitle: {
          fontSize: 11.5,
          fontFamily: F.regular,
          color: C.textMuted,
          marginTop: 1,
          textAlign: isRTL ? 'right' : 'left',
        },
        detailRightSlot: {
          minWidth: 40,
          alignItems: 'flex-end',
          justifyContent: 'center',
        },
        detailRightBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
        },
        toastContainer: {
          position: 'absolute',
          top: Platform.OS === 'ios' ? 55 : 20,
          left: 16,
          right: 16,
          zIndex: 9999,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: isDark ? 0.4 : 0.15,
          shadowRadius: 16,
          elevation: 10,
        },
        toastContentWrapper: {
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.95)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        },
        toastContent: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
        },
        toastIconBox: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
        toastTitle: {
          fontSize: 15,
          fontFamily: F.bold,
          fontWeight: '700',
          color: C.text,
          textAlign: isRTL ? 'right' : 'left',
        },
        toastBody: {
          fontSize: 13,
          fontFamily: F.regular,
          color: C.textMuted,
          marginTop: 2,
          textAlign: isRTL ? 'right' : 'left',
        },
      }),
    [C, isRTL, roleColor, isDark]
  );

  const getToastStyle = (type?: string) => {
    switch (type) {
      case 'achievement': return { color: '#F39C12', icon: 'award' };
      case 'message':
      case 'chat': return { color: '#3498DB', icon: 'message-circle' };
      case 'event': return { color: '#9B59B6', icon: 'calendar' };
      case 'social':
      case 'like':
      case 'comment': return { color: '#E74C3C', icon: 'heart' };
      default: return { color: '#8BC34A', icon: 'bell' };
    }
  };

  return (
    <View style={s.wrap}>
      {activeToast && (() => {
        const tStyle = getToastStyle(activeToast.type);
        return (
          <AnimatedReanimated.View
            entering={reducedMotion ? undefined : SlideInDown.duration(400).springify().damping(18).stiffness(150)}
            exiting={reducedMotion ? undefined : SlideOutUp.duration(300)}
            style={s.toastContainer}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setActiveToast(null);
                navigationRef.current.navigate('Notifications');
              }}
              style={s.toastContentWrapper}
            >
              {BlurView && (
                 <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              )}
              <View style={s.toastContent}>
                <View style={[s.toastIconBox, { backgroundColor: tStyle.color + (isDark ? '25' : '15') }]}>
                  <Feather name={tStyle.icon as any} size={20} color={tStyle.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.toastTitle} numberOfLines={1}>{t(activeToast.title)}</Text>
                  <Text style={s.toastBody} numberOfLines={2}>{t(activeToast.body)}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveToast(null)} style={{ padding: 6, paddingLeft: 12 }}>
                  <Feather name="x" size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </AnimatedReanimated.View>
        );
      })()}
      <View style={s.row}>
        {onBack ? (
          // Detail screen header flow
          <View style={s.detailRow}>
            <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={C.text} />
            </TouchableOpacity>

            <View style={s.detailTitleWrap}>
              <Text style={s.detailTitle} numberOfLines={1}>
                {t(title)}
              </Text>
              {subtitle ? <Text style={s.detailSubtitle}>{t(subtitle)}</Text> : null}
            </View>

            <View style={s.detailRightSlot}>
              {rightElement ?? (
                rightIcon ? (
                  <TouchableOpacity 
                    style={s.detailRightBtn} 
                    onPress={onRightPress ?? (rightIcon.includes('bell') ? () => navigation.navigate('Notifications') : undefined)} 
                    activeOpacity={0.7}
                  >
                    <View style={{ position: 'relative' }}>
                      <MaterialCommunityIcons name={rightIcon as any} size={20} color={C.text} />
                      {rightIcon.includes('bell') && unreadCount > 0 && (
                        <View style={[s.badgeDot, { top: -2, right: -2 }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                ) : null
              )}
            </View>
          </View>
        ) : (
          // Main tab screens header flow
          <>
            <TouchableOpacity style={s.mainLeft} onPress={handleProfilePress} activeOpacity={0.75} accessibilityRole="button">
              <View style={s.avatarWrap}>
                <Avatar url={user?.avatarUrl} name={user?.fullName || 'User'} size={44} style={s.avatar} />
                <View style={s.shieldBadge}>
                  <MaterialCommunityIcons name={roleBadgeIcon} size={10} color="#FFFFFF" />
                </View>
              </View>
              <View style={s.profileInfo}>
                <Text style={s.nameText}>{firstName}</Text>
              </View>
            </TouchableOpacity>

            <View style={s.mainRight}>
              {rightElement ?? (
                <>
                  {shouldShowSearch ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={s.actionBtn}
                      onPress={onSearchPress}
                    >
                      <Feather name={(searchIcon || 'search') as any} size={20} color={C.text} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={s.actionBtn} 
                    onPress={() => navigation.navigate('Notifications')}
                  >
                    <View style={{ position: 'relative' }}>
                      <Feather name="bell" size={20} color={C.text} />
                      {unreadCount > 0 && <View style={s.badgeDot} />}
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}
