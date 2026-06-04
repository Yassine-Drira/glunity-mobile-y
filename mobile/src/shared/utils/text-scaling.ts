import { Text, TextInput, View, StatusBar, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalIsRTL } from '../context/language.context';

let sizeMultiplier = 1.08;
let darkModeEnabled = false;

export function getTextMultiplier() {
  return sizeMultiplier;
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

const fontSizeCache = new Map<number, number>();

export function setTextMultiplier(size: 'Small' | 'Medium' | 'Large') {
  if (size === 'Small') {
    sizeMultiplier = 0.95;
  } else if (size === 'Large') {
    sizeMultiplier = 1.20;
  } else {
    sizeMultiplier = 1.08;
  }
  fontSizeCache.clear();
}

function getScaledFontSize(baseSize: number): number {
  const cacheKey = baseSize;
  if (fontSizeCache.has(cacheKey)) {
    return fontSizeCache.get(cacheKey)!;
  }

  const multiplier = sizeMultiplier;
  const isArabic = globalIsRTL;
  let result: number;

  if (multiplier > 1.0) {
    // Progressive scaling for larger sizes to prevent layout breakages
    if (baseSize >= 24) {
      const factor = 1.0 + (multiplier - 1.0) * 0.4;
      result = Math.round(baseSize * factor);
    } else if (baseSize >= 18) {
      const factor = 1.0 + (multiplier - 1.0) * 0.6;
      result = Math.round(baseSize * factor);
    } else {
      const maxMultiplier = isArabic ? 1.12 : 1.20;
      const safeMultiplier = Math.min(multiplier, maxMultiplier);
      result = Math.round(baseSize * safeMultiplier);
    }
  } else {
    // Small setting (e.g. 0.95)
    if (baseSize >= 18) {
      result = Math.round(baseSize * 0.98); // Don't shrink headings excessively
    } else {
      result = Math.round(baseSize * multiplier);
    }
  }

  fontSizeCache.set(cacheKey, result);
  return result;
}

function getFontSizeFromStyle(style: any): number {
  if (!style) return 14;
  if (typeof style === 'object' && !Array.isArray(style)) {
    if (typeof style.fontSize === 'number') {
      return style.fontSize;
    }
  }
  const flattened = StyleSheet.flatten(style);
  return flattened && typeof flattened.fontSize === 'number' ? flattened.fontSize : 14;
}

function cleanAndConvertStylesForWeb(style: any) {
  if (!style) return style;
  
  const newStyle = { ...style };
  let modified = false;
  
  if (style.shadowColor || style.shadowOffset || style.shadowOpacity !== undefined || style.shadowRadius !== undefined) {
    const color = style.shadowColor || 'black';
    const offset = style.shadowOffset || { width: 0, height: 0 };
    const opacity = style.shadowOpacity !== undefined ? style.shadowOpacity : 1;
    const radius = style.shadowRadius !== undefined ? style.shadowRadius : 0;
    
    delete newStyle.shadowColor;
    delete newStyle.shadowOffset;
    delete newStyle.shadowOpacity;
    delete newStyle.shadowRadius;
    
    if (!newStyle.boxShadow) {
      let rgbaColor = color;
      if (typeof color === 'string' && color.startsWith('#')) {
        const hex = color.replace('#', '');
        let r = 0, g = 0, b = 0;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
        rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else if (color === 'black' || color === '#000') {
        rgbaColor = `rgba(0, 0, 0, ${opacity})`;
      }
      newStyle.boxShadow = `${offset.width}px ${offset.height}px ${radius * 1.5}px ${rgbaColor}`;
    }
    modified = true;
  }

  if (style.textShadowColor || style.textShadowOffset || style.textShadowRadius) {
    const color = style.textShadowColor || 'black';
    const offset = style.textShadowOffset || { width: 0, height: 0 };
    const radius = style.textShadowRadius || 0;
    
    delete newStyle.textShadowColor;
    delete newStyle.textShadowOffset;
    delete newStyle.textShadowRadius;
    
    if (!newStyle.textShadow) {
      newStyle.textShadow = `${offset.width}px ${offset.height}px ${radius}px ${color}`;
    }
    modified = true;
  }

  // Map React Native specific Poppins font-families to standard CSS family + fontWeight
  if (style.fontFamily && typeof style.fontFamily === 'string') {
    const family = style.fontFamily;
    if (family.startsWith('Poppins_')) {
      newStyle.fontFamily = 'Poppins, sans-serif';
      
      if (family.includes('Bold') || family.includes('700')) {
        newStyle.fontWeight = '700';
      } else if (family.includes('SemiBold') || family.includes('600')) {
        newStyle.fontWeight = '600';
      } else if (family.includes('Medium') || family.includes('500')) {
        newStyle.fontWeight = '500';
      } else {
        newStyle.fontWeight = '400';
      }
      modified = true;
    }
  }

  return modified ? newStyle : style;
}

function transformWebStyles(style: any): any {
  if (!style) return style;
  if (Array.isArray(style)) {
    return style.map(s => transformWebStyles(s));
  }
  const resolved = typeof style === 'number' ? StyleSheet.flatten(style) : style;
  return cleanAndConvertStylesForWeb(resolved);
}

export function initTextScaling() {
  if (hasPatchedThemeScaling) return;

  // Inject Google Fonts CDN stylesheet on Web for high-performance font loading
  if (Platform.OS === 'web') {
    try {
      if (!document.getElementById('glunity-google-fonts')) {
        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.setAttribute('crossorigin', 'anonymous');
        document.head.appendChild(preconnect2);

        const fontLink = document.createElement('link');
        fontLink.id = 'glunity-google-fonts';
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
      }

      // Inject @expo/vector-icons CDN fonts to prevent slow local Metro network interventions
      if (!document.getElementById('glunity-vector-icons')) {
        // Preload the fonts to start downloading them instantly at high priority
        const fontUrls = [
          { id: 'preload-feather', url: 'https://unpkg.com/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf' },
          { id: 'preload-mci', url: 'https://unpkg.com/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf' },
          { id: 'preload-ionicons', url: 'https://unpkg.com/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf' }
        ];

        for (const item of fontUrls) {
          if (!document.getElementById(item.id)) {
            const preloadLink = document.createElement('link');
            preloadLink.id = item.id;
            preloadLink.rel = 'preload';
            preloadLink.as = 'font';
            preloadLink.type = 'font/ttf';
            preloadLink.href = item.url;
            preloadLink.setAttribute('crossorigin', 'anonymous');
            document.head.appendChild(preloadLink);
          }
        }

        // Define @font-face with font-display: block to prevent layout shifts or fallback character flashing
        const styleTag = document.createElement('style');
        styleTag.id = 'glunity-vector-icons';
        styleTag.type = 'text/css';
        styleTag.appendChild(document.createTextNode(`
          @font-face {
            font-family: "Feather";
            src: url("https://unpkg.com/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf") format("truetype");
            font-display: block;
          }
          @font-face {
            font-family: "Material Community Icons";
            src: url("https://unpkg.com/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf") format("truetype");
            font-display: block;
          }
          @font-face {
            font-family: "Ionicons";
            src: url("https://unpkg.com/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf") format("truetype");
            font-display: block;
          }
        `));
        document.head.appendChild(styleTag);
      }
    } catch (e) {
      console.warn('Failed to inject CDN assets', e);
    }
  }

  // 1. Patch React Native View.render to swap background & border colors in dark mode
  const viewAny = View as any;
  const originalViewRender = viewAny.render;
  if (originalViewRender) {
    viewAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      let modified = false;

      // FAST PATH/CLEANUP: Clean pointerEvents prop warning on Web
      if (Platform.OS === 'web' && newProps.pointerEvents) {
        const { pointerEvents, ...rest } = newProps;
        newProps = {
          ...rest,
          style: [newProps.style, { pointerEvents }],
        };
        modified = true;
      }

      // FAST PATH/CLEANUP: Convert legacy shadow prop warnings on Web
      if (Platform.OS === 'web' && newProps.style) {
        newProps = {
          ...newProps,
          style: transformWebStyles(newProps.style),
        };
        modified = true;
      }

      if (darkModeEnabled && newProps.style) {
        newProps = {
          ...newProps,
          style: transformStyles(newProps.style),
        };
        modified = true;
      }

      if (modified) {
        return originalViewRender.call(this, newProps, ref);
      }
      return originalViewRender.call(this, props, ref);
    };
  }

  // 2. Patch React Native Text.render to scale fonts and swap text colors in dark mode
  const textAny = Text as any;
  const originalTextRender = textAny.render;
  if (originalTextRender) {
    textAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      let modified = false;

      if (Platform.OS === 'web' && newProps.style) {
        newProps = {
          ...newProps,
          style: transformWebStyles(newProps.style),
        };
        modified = true;
      }

      const baseSize = getFontSizeFromStyle(newProps.style);
      
      // Respect explicit opt-out of text scaling
      const scaledSize = newProps.allowFontScaling === false ? baseSize : getScaledFontSize(baseSize);

      if (scaledSize !== baseSize || darkModeEnabled) {
        let resolvedStyle = [newProps.style, { fontSize: scaledSize }];
        if (darkModeEnabled) {
          resolvedStyle = transformStyles(resolvedStyle);
        }
        newProps = {
          ...newProps,
          style: resolvedStyle,
        };
        modified = true;
      }

      if (modified) {
        return originalTextRender.call(this, newProps, ref);
      }
      return originalTextRender.call(this, props, ref);
    };
  }

  // 3. Patch React Native TextInput.render to scale fonts and swap colors in dark mode
  const textInputAny = TextInput as any;
  const originalTextInputRender = textInputAny.render;
  if (originalTextInputRender) {
    textInputAny.render = function (props: any, ref: any) {
      let newProps = props || {};
      let modified = false;

      if (Platform.OS === 'web' && newProps.style) {
        newProps = {
          ...newProps,
          style: transformWebStyles(newProps.style),
        };
        modified = true;
      }

      const baseSize = getFontSizeFromStyle(newProps.style);
      
      // Respect explicit opt-out of text scaling
      const scaledSize = newProps.allowFontScaling === false ? baseSize : getScaledFontSize(baseSize);

      if (scaledSize !== baseSize || darkModeEnabled) {
        let resolvedStyle = [newProps.style, { fontSize: scaledSize }];
        if (darkModeEnabled) {
          resolvedStyle = transformStyles(resolvedStyle);
        }
        newProps = {
          ...newProps,
          style: resolvedStyle,
        };
        modified = true;
      }

      if (modified) {
        return originalTextInputRender.call(this, newProps, ref);
      }
      return originalTextInputRender.call(this, props, ref);
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
  // 5. Patch React Native StyleSheet.create to clean deprecated props on Web at definition time
  const stylesheetAny = StyleSheet as any;
  const originalCreate = stylesheetAny.create;
  if (originalCreate) {
    stylesheetAny.create = function (styles: any) {
      if (Platform.OS === 'web' && styles) {
        const cleanedStyles = {} as any;
        for (const key of Object.keys(styles)) {
          cleanedStyles[key] = transformWebStyles(styles[key]);
        }
        return originalCreate.call(this, cleanedStyles);
      }
      return originalCreate.call(this, styles);
    };
  }

  hasPatchedThemeScaling = true;
}

// Auto-run on module import to ensure patches are applied immediately
initTextScaling();
