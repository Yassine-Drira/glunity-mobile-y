import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../translations/en';
import fr from '../translations/fr';
import ar from '../translations/ar';

export type LanguageCode = 'en' | 'fr' | 'ar';
export type Language = LanguageCode;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

// Global hookless bindings for monkey-patched elements (Text, Alert, TextInput)
export let globalT: (key: string, fallback?: string) => string = (key, fallback) => fallback || key;
export let globalIsRTL = false;

const translations: Record<LanguageCode, Record<string, string>> = {
  en,
  fr,
  ar,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('fr');

  useEffect(() => {
    async function loadLanguage() {
      try {
        const savedLang = await AsyncStorage.getItem('@pref_language');
        if (savedLang === 'en' || savedLang === 'fr' || savedLang === 'ar') {
          setLanguageState(savedLang);
        }
      } catch (e) {
        console.error('Failed to load language setting:', e);
      }
    }
    loadLanguage();
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    try {
      await AsyncStorage.setItem('@pref_language', lang);
      setLanguageState(lang);
    } catch (e) {
      console.error('Failed to save language setting:', e);
    }
  };

  const toggleLanguage = async () => {
    const nextLang: LanguageCode = language === 'fr' ? 'ar' : language === 'ar' ? 'en' : 'fr';
    await setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    if (!key) return fallback || key;
    const cleanKey = key.trim();
    return translations[language]?.[cleanKey] || translations[language]?.[key] || translations['fr']?.[cleanKey] || fallback || key;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    globalT = t;
    globalIsRTL = isRTL;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
