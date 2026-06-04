import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import './src/shared/utils/text-scaling';
import { AuthProvider } from './src/modules/auth/state/auth.context';
import { LanguageProvider } from './src/shared/context/language.context';
import { ThemeProvider } from './src/shared/context/theme.context';
import { ThemedNavigationContainer } from './src/shared/components/ThemedNavigationContainer';
import { RootNavigator } from './src/navigation/RootNavigator';
// @ts-ignore
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';


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
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts(
    Platform.OS === 'web'
      ? {}
      : {
          Poppins_400Regular,
          Poppins_500Medium,
          Poppins_600SemiBold,
          Poppins_700Bold,
        }
  );

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
        <LanguageProvider>
          <ThemeProvider>
            <ThemedNavigationContainer linking={linking as any}>
              <RootNavigator />
            </ThemedNavigationContainer>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5F3' },
});

