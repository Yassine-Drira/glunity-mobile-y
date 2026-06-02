import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../translations/en';
import fr from '../translations/fr';
import ar from '../translations/ar';

export type LanguageCode = 'en' | 'fr' | 'ar';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

// Global hookless bindings for monkey-patched elements (Text, Alert, TextInput)
export let globalT: (key: string) => string = (key) => key;
export let globalIsRTL = false;

const translations: Record<LanguageCode, Record<string, string>> = {
  en,
  fr,
  ar,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

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

  const t = (key: string): string => {
    if (!key) return key;
    const cleanKey = key.trim();
    return translations[language]?.[cleanKey] || translations[language]?.[key] || translations['en']?.[cleanKey] || key;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    globalT = t;
    globalIsRTL = isRTL;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
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
