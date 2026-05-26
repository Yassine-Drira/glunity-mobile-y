import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../modules/auth/navigation/types';

import SplashScreen          from '../modules/auth/ui/screens/SplashScreen';
import IntroductionScreen    from '../modules/auth/ui/screens/IntroductionScreen';
import WelcomeScreen         from '../modules/auth/ui/screens/WelcomeScreen';
import LoginScreen           from '../modules/auth/ui/screens/LoginScreen';
import RegisterScreen        from '../modules/auth/ui/screens/RegisterScreen';
import ForgotPasswordScreen  from '../modules/auth/ui/screens/ForgotPasswordScreen';
import ResetPasswordScreen   from '../modules/auth/ui/screens/ResetPasswordScreen';
import EmailVerifiedScreen   from '../modules/auth/ui/screens/EmailVerifiedScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      {/* ── Onboarding ─────────────────────────────────────────────────── */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Intro"  component={IntroductionScreen} />

      {/* ── Auth ───────────────────────────────────────────────────────── */}
      <Stack.Screen name="Welcome"        component={WelcomeScreen}       options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Login"          component={LoginScreen}         options={{ animation: 'slide_from_right', gestureEnabled: false }} />
      <Stack.Screen name="Register"       component={RegisterScreen}      options={{ animation: 'slide_from_right', gestureEnabled: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right', gestureEnabled: false }} />

      {/* ── Deep-link targets (from email links) ───────────────────────── */}
      <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen}  options={{ animation: 'fade' }} />
      <Stack.Screen name="EmailVerified"  component={EmailVerifiedScreen}  options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
