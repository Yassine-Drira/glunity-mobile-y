/**
 * ThemedNavigationContainer
 *
 * Wraps React Navigation's NavigationContainer with our custom
 * light/dark theme so all screen backgrounds, navigation headers,
 * and tab bars flip instantly when the user toggles dark mode.
 */
import React from 'react';
import { Platform } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  LinkingOptions,
} from '@react-navigation/native';
import { useTheme } from '../context/theme.context';
import { LIGHT, DARK } from '../context/theme.context';

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

export function ThemedNavigationContainer({ children, linking }: Props) {
  const { isDark } = useTheme();

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
    <NavigationContainer
      linking={linking}
      theme={isDark ? MyDarkTheme : MyLightTheme}
      onStateChange={handleStateChange}
    >
      {children}
    </NavigationContainer>
  );
}
