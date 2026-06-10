import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import './src/shared/utils/text-scaling';
import { AuthProvider } from './src/modules/auth/state/auth.context';
import { SocketProvider } from './src/shared/context/socket.context';
import { LanguageProvider } from './src/shared/context/language.context';
import { ThemeProvider } from './src/shared/context/theme.context';
import { ThemedNavigationContainer } from './src/shared/components/ThemedNavigationContainer';
import { RootNavigator } from './src/navigation/RootNavigator';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventsApi } from './src/modules/home/api/events.api';
import { locationsApi } from './src/modules/map/api/locations.api';
import { Image } from 'react-native';
// @ts-ignore
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';


// Deep-link / URL mapping
const linking = {
  prefixes: [
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:8090',
    'glunity://',
  ],
  config: {
    screens: {
      ResetPassword: { path: 'reset-password', parse: { token: (t: string) => t } },
      EmailVerified: { path: 'email-verified', parse: { success: (v: string) => v !== '0' && v !== 'false' } },
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      Welcome: 'welcome',
      Community: 'Community',
      CommunityChat: 'CommunityChat',
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
    ...FontAwesome.font,
  });

  /**
   * Apply Poppins as the default font family for all Text and TextInput
   * components that don't explicitly set a fontFamily.
   *
   * This runs once after fonts are confirmed loaded, outside the React
   * render cycle — avoiding the deprecated monkey-patch approach.
   *
   * TODO (P1-01 follow-up): Replace with a custom <AppText> wrapper
   * component to fully eliminate defaultProps usage (deprecated in React 18).
   */
  React.useEffect(() => {
    if (!fontsLoaded) return;
    const textAny = Text as any;
    const textInputAny = TextInput as any;
    if (!textAny.defaultProps) textAny.defaultProps = {};
    if (!textInputAny.defaultProps) textInputAny.defaultProps = {};
    textAny.defaultProps.style = [
      textAny.defaultProps.style,
      { fontFamily: 'Poppins_400Regular' },
    ];
    textInputAny.defaultProps.style = [
      textInputAny.defaultProps.style,
      { fontFamily: 'Poppins_400Regular' },
    ];
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="small" color="#8BC34A" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <SocketProvider>
          <LanguageProvider>
            <ThemeProvider>
              <ThemedNavigationContainer linking={linking as any}>
                <RootNavigator />
                <StartupPrefetch />
              </ThemedNavigationContainer>
            </ThemeProvider>
          </LanguageProvider>
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function StartupPrefetch() {
  const PREF_KEY = '@app_prefetched_v1';

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(PREF_KEY);
        if (done) return;

        // Fetch commonly-needed data in parallel
        const [events, locations] = await Promise.allSettled([
          eventsApi.list(),
          locationsApi.list({ limit: 50 }),
        ]);

        const urls: string[] = [];

        if (events.status === 'fulfilled' && Array.isArray(events.value)) {
          events.value.forEach((ev: any) => {
            if (ev.imageUrl) urls.push(ev.imageUrl);
          });
        }

        if (locations.status === 'fulfilled' && Array.isArray(locations.value)) {
          locations.value.forEach((loc: any) => {
            if (Array.isArray(loc.images)) {
              const first = loc.images.find((i: any) => i && i.url);
              if (first && first.url) urls.push(first.url);
            }
          });
        }

        // Prefetch images (use RN Image.prefetch which warms cache for both RN Image and expo-image)
        await Promise.all(urls.filter(Boolean).slice(0, 30).map((u) => {
          try {
            // request optimized unsplash sizes when possible
            const optimized = optimizeImageUrl(u, 800);
            return Image.prefetch(optimized);
          } catch (e) {
            return Promise.resolve(false);
          }
        }));

        if (!mounted) return;
        await AsyncStorage.setItem(PREF_KEY, String(Date.now()));
      } catch (e) {
        // swallow errors — prefetch is best-effort
      }
    })();
    return () => { mounted = false; };
  }, []);

  return null;
}

function optimizeImageUrl(u: string, w = 800) {
  try {
    const url = new URL(u);
    if (url.hostname.includes('images.unsplash.com')) {
      if (url.search) url.search += '&';
      url.search += `w=${w}&auto=format&fit=crop&q=80`;
      return url.toString();
    }
    return u;
  } catch (e) { return u; }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5F3' },
});

