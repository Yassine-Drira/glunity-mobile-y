import { Text, TextInput, View, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalIsRTL } from '../context/language.context';

let sizeMultiplier = 1.08;
let darkModeEnabled = false;

export function getTextMultiplier() {
  return sizeMultiplier;
}

export function setTextMultiplier(size: 'Small' | 'Medium' | 'Large') {
  if (size === 'Small') {
    sizeMultiplier = 0.95;
  } else if (size === 'Large') {
    sizeMultiplier = 1.20;
  } else {
    sizeMultiplier = 1.08;
  }
}

export function isDarkMode() {
  return darkModeEnabled;
}

export function setDarkModeEnabled(enabled: boolean) {
  darkModeEnabled = enabled;
}

export async function loadTextMultiplier() {
  try {
    const size = await AsyncStorage.getItem('@pref_text_size');
    if (size === 'Small' || size === 'Medium' || size === 'Large') {
      setTextMultiplier(size);
    } else {
      setTextMultiplier('Medium');
    }
  } catch (e) {
    sizeMultiplier = 1.08;
  }
}

// ── Dark Mode Color Mappings ───────────────────────────────────────────────────
const colorMap: Record<string, string> = {
  // Backgrounds & Surface Cards
  '#f6f5f3': '#121212',
  '#f6f5f2': '#121212',
  '#ffffff': '#1E1E1E',
  '#ececec': '#2C2C2C',
  '#f2f2f2': '#121212',
  '#fafafa': '#1E1E1E',
  '#f5f5f5': '#121212',

  // Texts
  '#2e2e2e': '#FFFFFF',
  '#000000': '#FFFFFF',
  '#1a1a1a': '#FFFFFF',
  '#333333': '#FFFFFF',
  '#6b6b6b': '#B3B3B3',
  '#9e9e9e': '#888888',
  'rgba(46,46,46,0.5)': 'rgba(255,255,255,0.6)',
  'rgba(46,46,46,0.4)': 'rgba(255,255,255,0.5)',
  'rgba(46,46,46,0.8)': 'rgba(255,255,255,0.85)',

  // Borders & Dividers
  '#c4c4c4': '#333333',
  '#e0e0e0': '#2C2C2C',
  '#f0f0f0': '#252525',
  'rgba(0,0,0,0.08)': 'rgba(255,255,255,0.12)',
  'rgba(0,0,0,0.06)': 'rgba(255,255,255,0.08)',
  'rgba(0,0,0,0.1)': 'rgba(255,255,255,0.15)',
};

function transformStyleObject(style: any) {
  if (!style) return style;
  const newStyle = { ...style };
  let modified = false;

  // Background color mapping
  if (style.backgroundColor && typeof style.backgroundColor === 'string') {
    const lower = style.backgroundColor.toLowerCase().trim();
    const mapped = colorMap[lower];
    if (mapped) {
      newStyle.backgroundColor = mapped;
      modified = true;
    }
  }

  // Text color mapping
  if (style.color && typeof style.color === 'string') {
    const lower = style.color.toLowerCase().trim();
    const mapped = colorMap[lower];
    if (mapped) {
      newStyle.color = mapped;
      modified = true;
    }
  }

  // Border color mapping
  if (style.borderColor && typeof style.borderColor === 'string') {
    const lower = style.borderColor.toLowerCase().trim();
    const mapped = colorMap[lower];
    if (mapped) {
      newStyle.borderColor = mapped;
      modified = true;
    }
  }
  if (style.borderBottomColor && typeof style.borderBottomColor === 'string') {
    const lower = style.borderBottomColor.toLowerCase().trim();
    const mapped = colorMap[lower];
    if (mapped) {
      newStyle.borderBottomColor = mapped;
      modified = true;
    }
  }
  if (style.borderTopColor && typeof style.borderTopColor === 'string') {
    const lower = style.borderTopColor.toLowerCase().trim();
    const mapped = colorMap[lower];
    if (mapped) {
      newStyle.borderTopColor = mapped;
      modified = true;
    }
  }

  return modified ? newStyle : style;
}

export function transformStyles(style: any): any {
  if (!style) return style;
  if (Array.isArray(style)) {
    return style.map(s => transformStyles(s));
  }
  if (typeof style === 'number') {
    return transformStyleObject(StyleSheet.flatten(style));
  }
  return transformStyleObject(style);
}

let hasPatchedThemeScaling = false;

function getScaledFontSize(baseSize: number): number {
  const multiplier = sizeMultiplier;
  const isArabic = globalIsRTL;

  if (multiplier > 1.0) {
    // Progressive scaling for larger sizes to prevent layout breakages
    if (baseSize >= 24) {
      const factor = 1.0 + (multiplier - 1.0) * 0.4;
      return Math.round(baseSize * factor);
    }
    if (baseSize >= 18) {
      const factor = 1.0 + (multiplier - 1.0) * 0.6;
      return Math.round(baseSize * factor);
    }
    const maxMultiplier = isArabic ? 1.12 : 1.20;
    const safeMultiplier = Math.min(multiplier, maxMultiplier);
    return Math.round(baseSize * safeMultiplier);
  } else {
    // Small setting (e.g. 0.95)
    if (baseSize >= 18) {
      return Math.round(baseSize * 0.98); // Don't shrink headings excessively
    }
    return Math.round(baseSize * multiplier);
  }
}

export function initTextScaling() {
  if (hasPatchedThemeScaling) return;

  // 1. Patch React Native View.render to swap background & border colors in dark mode
  const viewAny = View as any;
  const originalViewRender = viewAny.render;
  if (originalViewRender) {
    viewAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      if (darkModeEnabled && newProps.style) {
        newProps = {
          ...newProps,
          style: transformStyles(newProps.style),
        };
      }
      return originalViewRender.call(this, newProps, ref);
    };
  }

  // 2. Patch React Native Text.render to scale fonts and swap text colors in dark mode
  const textAny = Text as any;
  const originalTextRender = textAny.render;
  if (originalTextRender) {
    textAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      const flattened = newProps.style ? StyleSheet.flatten(newProps.style) : {};
      const baseSize = (flattened && typeof flattened.fontSize === 'number') ? flattened.fontSize : 14;
      
      // Respect explicit opt-out of text scaling
      const scaledSize = newProps.allowFontScaling === false ? baseSize : getScaledFontSize(baseSize);

      let resolvedStyle = [newProps.style, { fontSize: scaledSize }];
      if (darkModeEnabled) {
        resolvedStyle = transformStyles(resolvedStyle);
      }

      newProps = {
        ...newProps,
        style: resolvedStyle,
      };
      return originalTextRender.call(this, newProps, ref);
    };
  }

  // 3. Patch React Native TextInput.render to scale fonts and swap colors in dark mode
  const textInputAny = TextInput as any;
  const originalTextInputRender = textInputAny.render;
  if (originalTextInputRender) {
    textInputAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      const flattened = newProps.style ? StyleSheet.flatten(newProps.style) : {};
      const baseSize = (flattened && typeof flattened.fontSize === 'number') ? flattened.fontSize : 14;
      
      // Respect explicit opt-out of text scaling
      const scaledSize = newProps.allowFontScaling === false ? baseSize : getScaledFontSize(baseSize);

      let resolvedStyle = [newProps.style, { fontSize: scaledSize }];
      if (darkModeEnabled) {
        resolvedStyle = transformStyles(resolvedStyle);
      }

      newProps = {
        ...newProps,
        style: resolvedStyle,
      };
      return originalTextInputRender.call(this, newProps, ref);
    };
  }

  // 4. Patch React Native StatusBar.render to adapt barStyle and background in dark mode
  const statusBarAny = StatusBar as any;
  const originalStatusBarRender = statusBarAny.render;
  if (originalStatusBarRender) {
    statusBarAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      if (darkModeEnabled) {
        newProps = {
          ...newProps,
          barStyle: 'light-content',
          backgroundColor: '#121212',
        };
      } else {
        newProps = {
          ...newProps,
          barStyle: 'dark-content',
          backgroundColor: '#F6F5F3',
        };
      }
      return originalStatusBarRender.call(this, newProps, ref);
    };
  }

  hasPatchedThemeScaling = true;
}
