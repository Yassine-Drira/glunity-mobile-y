/**
 * ThemedNavigationContainer
 *
 * Wraps React Navigation's NavigationContainer with our custom
 * light/dark theme so all screen backgrounds, navigation headers,
 * and tab bars flip instantly when the user toggles dark mode.
 */
import React, { useRef, useState, useEffect } from 'react';
import { Platform, StyleSheet, View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  LinkingOptions,
} from '@react-navigation/native';
import { useTheme } from '../context/theme.context';
import { LIGHT, DARK } from '../context/theme.context';
import { useSocket } from '../context/socket.context';

export const navigationRef = React.createRef<any>();

const MyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary:    LIGHT.green,
    background: LIGHT.bg,
    card:       LIGHT.surface,
    text:       LIGHT.text,
    border:     LIGHT.border,
    notification: LIGHT.red,
  },
};

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:    DARK.green,
    background: DARK.bg,
    card:       DARK.surface,
    text:       DARK.text,
    border:     DARK.border,
    notification: DARK.red,
  },
};

interface Props {
  children: React.ReactNode;
  linking?: LinkingOptions<ReactNavigation.RootParamList>;
}

interface ActiveNotification {
  conversationId: string;
  conversationName: string;
  senderName: string;
  senderAvatar: string | null;
  messagePreview: string;
  timestamp: string;
}

export function ThemedNavigationContainer({ children, linking }: Props) {
  const { isDark } = useTheme();
  const { socket } = useSocket();
  const [activeNotif, setActiveNotif] = useState<ActiveNotification | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif: any) => {
      // ONLY trigger DM/Community chat toast for chat messages with conversationId
      if (notif.type !== 'chat' && notif.type !== 'message' && !notif.conversationId) {
        return;
      }

      // Don't show toast if we are already viewing this chat
      if (navigationRef.current?.isReady()) {
        const route = navigationRef.current.getCurrentRoute();
        if (route?.name === 'CommunityChat' && String(route?.params?.channelId) === String(notif.conversationId)) {
          return;
        }
      }

      // Show the notification toast!
      setActiveNotif(notif);
      
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 50 : 20,
        useNativeDriver: true,
        tension: 40,
        friction: 8
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true
        }).start(() => setActiveNotif(null));
      }, 4000);

      return () => clearTimeout(timer);
    };

    socket.on('notification:new', handleNotification);
    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket]);

  const handleToastPress = () => {
    if (activeNotif && navigationRef.current?.isReady()) {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        const channelId = activeNotif.conversationId;
        const channelName = activeNotif.conversationName;
        setActiveNotif(null);
        navigationRef.current.navigate('CommunityChat', {
          channelId,
          initialChannel: { _id: channelId, id: channelId, name: channelName }
        });
      });
    }
  };

  const handleStateChange = () => {
    if (Platform.OS === 'web') {
      try {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
      } catch (e) {
        // Safe catch
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={isDark ? MyDarkTheme : MyLightTheme}
        onStateChange={handleStateChange}
      >
        {children}
      </NavigationContainer>

      {activeNotif && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            }
          ]}
        >
          <TouchableOpacity
            style={styles.toastContent}
            onPress={handleToastPress}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: activeNotif.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeNotif.senderName || 'Community')}&background=8BC34A&color=fff` }}
              style={styles.toastAvatar}
            />
            <View style={styles.toastTextWrap}>
              <Text style={[styles.toastTitle, { color: isDark ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
                {activeNotif.senderName || 'Message'} {activeNotif.conversationName ? <Text style={{ fontSize: 11, fontWeight: 'normal', color: isDark ? '#9CA3AF' : '#6B7280' }}>dans {activeNotif.conversationName}</Text> : null}
              </Text>
              <Text style={[styles.toastSnippet, { color: isDark ? '#9CA3AF' : '#4B5563' }]} numberOfLines={1}>
                {activeNotif.messagePreview || ''}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  toastTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toastSnippet: {
    fontSize: 12,
  },
});
