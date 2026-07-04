import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../modules/auth/state/auth.context';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useTheme, useSyncDarkModeFromProfile } from '../shared/context/theme.context';
import { ReelCreationProvider } from '../modules/reels/context/ReelCreationContext';

export function RootNavigator() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const { theme: T } = useTheme();

  // Keep ThemeContext in sync when user profile loads / changes
  useSyncDarkModeFromProfile(user?.darkMode);

  const styles = React.useMemo(() => StyleSheet.create({
    splash: {
      flex: 1,
      backgroundColor: T.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [T]);

  if (!isInitialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={T.green} />
      </View>
    );
  }

  return isAuthenticated ? (
    <ReelCreationProvider>
      <AppNavigator />
    </ReelCreationProvider>
  ) : (
    <AuthNavigator />
  );
}
