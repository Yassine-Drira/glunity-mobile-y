import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { AuthProvider } from './src/modules/auth/state/auth.context';
import { LanguageProvider, globalT } from './src/shared/context/language.context';
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

import { initTextScaling } from './src/shared/utils/text-scaling';

initTextScaling();

// Global translation monkey-patch helper
function translateChildren(children: any): any {
  if (typeof children === 'string') {
    return globalT(children);
  }
  if (Array.isArray(children)) {
    return children.map(child => translateChildren(child));
  }
  return children;
}

// Monkey patch Text.render to automatically translate children
const TextAny = Text as any;
const originalTextRender = TextAny.render || (TextAny.type && TextAny.type.render);
if (originalTextRender) {
  const target = TextAny.render ? TextAny : TextAny.type;
  target.render = function (props: any, ref: any) {
    const translatedChildren = translateChildren(props.children);
    return originalTextRender.call(this, { ...props, children: translatedChildren }, ref);
  };
}

// Monkey patch TextInput.render to automatically translate placeholder
const TextInputAny = TextInput as any;
const originalTextInputRender = TextInputAny.render || (TextInputAny.type && TextInputAny.type.render);
if (originalTextInputRender) {
  const target = TextInputAny.render ? TextInputAny : TextInputAny.type;
  target.render = function (props: any, ref: any) {
    const translatedPlaceholder = props.placeholder ? globalT(props.placeholder) : props.placeholder;
    return originalTextInputRender.call(this, { ...props, placeholder: translatedPlaceholder }, ref);
  };
}

// Monkey patch Alert.alert to automatically translate popups
const originalAlert = Alert.alert;
Alert.alert = function (title: string, message?: string, buttons?: any[], options?: any) {
  const translatedTitle = title ? globalT(title) : title;
  const translatedMessage = message ? globalT(message) : message;
  const translatedButtons = buttons?.map(btn => ({
    ...btn,
    text: btn.text ? globalT(btn.text) : btn.text,
  }));
  return originalAlert(translatedTitle, translatedMessage, translatedButtons, options);
};

let hasPatchedDefaultFonts = false;

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
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="small" color="#8BC34A" />
      </View>
    );
  }

  if (!hasPatchedDefaultFonts) {
    const textAny = Text as any;
    const textInputAny = TextInput as any;
    if (!textAny.defaultProps) textAny.defaultProps = {};
    if (!textInputAny.defaultProps) textInputAny.defaultProps = {};
    textAny.defaultProps.style = [textAny.defaultProps.style, { fontFamily: 'Poppins_400Regular' }];
    textInputAny.defaultProps.style = [textInputAny.defaultProps.style, { fontFamily: 'Poppins_400Regular' }];
    hasPatchedDefaultFonts = true;
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
