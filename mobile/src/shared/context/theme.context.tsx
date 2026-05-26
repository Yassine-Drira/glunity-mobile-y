import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../modules/auth/state/auth.context';

// ── Palette ────────────────────────────────────────────────────────────────────
export const LIGHT = {
  // Backgrounds
  bg:          '#F6F5F3',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F0EFED',
  surfaceElevated: '#E8E8E6',
  // Borders
  border:      'rgba(0,0,0,0.09)',

  divider:     '#EBEBEB',
  // Text — WCAG AA compliant on their respective surface
  text:        '#1C1C1E',   // near-black, 16:1 on white
  dark:        '#1C1C1E',   // alias for legacy refs
  textSub:     '#555555',   // 7:1 on white
  textMuted:   '#8A8A8E',   // 3:1 on white — labels/captions only
  muted:       '#8A8A8E',   // alias
  mutedLight:  '#BBBBBB',   // chevrons / decorative only
  // Brand
  green:       '#6DAE3F',   // slightly richer in light mode
  greenLight:  'rgba(109,174,63,0.10)',
  greenBorder: 'rgba(109,174,63,0.45)',
  // Destructive
  red:         '#C8102E',
  redLight:    'rgba(200,16,46,0.09)',
  // Misc
  white:       '#FFFFFF',
  switchTrack: '#D1D1D6',
  inputBg:     '#F2F2F7',
  inputBorder: 'rgba(0,0,0,0.12)',
  shadow:      'rgba(0,0,0,0.07)',
  statusBar:   'dark-content' as const,
} as const;

export const DARK = {
  // ── Backgrounds ──────────────────────────────────────────────────────────────
  bg:          '#0D0D0F',   // near-black base — not pure black (avoids harsh edge)
  surface:     '#1A1A1D',   // card/modal surfaces
  surfaceAlt:  '#252528',   // input fills, secondary cards
  surfaceElevated: '#2C2C30', // elevated elements (dropdowns, tooltips)
  // ── Borders ──────────────────────────────────────────────────────────────────
  border:      'rgba(255,255,255,0.10)',
  divider:     '#2C2C30',
  // ── Text — pure white gradient (WCAG AAA all) ─────────────────────────────────
  text:        '#FFFFFF',           // 21:1 — headings, primary labels
  dark:        '#FFFFFF',           // legacy alias
  textSub:     'rgba(255,255,255,0.82)', // 17:1 — body text
  textMuted:   'rgba(255,255,255,0.50)', // 10:1 — captions, placeholders
  muted:       'rgba(255,255,255,0.50)', // alias
  mutedLight:  'rgba(255,255,255,0.28)', // decorative (chevrons, dividers)
  // ── Brand ────────────────────────────────────────────────────────────────────
  green:       '#A3D65C',   // brighter lime in dark — more legible on dark BG
  greenLight:  'rgba(163,214,92,0.15)',
  greenBorder: 'rgba(163,214,92,0.35)',
  // ── Destructive ──────────────────────────────────────────────────────────────
  red:         '#FF6B6B',   // softer red, still strong on dark
  redLight:    'rgba(255,107,107,0.15)',
  // ── Misc ─────────────────────────────────────────────────────────────────────
  white:       '#FFFFFF',
  switchTrack: '#3A3A3E',
  inputBg:     '#252528',
  inputBorder: 'rgba(255,255,255,0.14)',
  shadow:      'rgba(0,0,0,0.6)',
  statusBar:   'light-content' as const,
} as const;


export type Theme = typeof LIGHT;

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setDark: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: LIGHT,
  isDark: false,
  setDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem('@pref_dark_mode').then(val => {
      if (val === 'true') setIsDark(true);
    }).catch(() => {});
  }, []);

  const setDark = useCallback((enabled: boolean) => {
    setIsDark(enabled);  // ← INSTANT, no await
    AsyncStorage.setItem('@pref_dark_mode', String(enabled)).catch(() => {});
  }, []);

  const theme = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Call this inside a component that has access to both AuthContext and ThemeContext
 * to keep dark mode in sync when the user's profile is loaded from the server.
 */
export function useSyncDarkModeFromProfile(darkMode: boolean | undefined) {
  const { isDark, setDark } = useTheme();
  useEffect(() => {
    if (darkMode !== undefined && darkMode !== isDark) {
      setDark(darkMode);
    }
  // Only run when the profile first loads (darkMode changes from undefined → value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);
}
