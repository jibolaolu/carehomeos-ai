import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import cy from '../locales/cy.json';
import pl from '../locales/pl.json';
import ro from '../locales/ro.json';
import tl from '../locales/tl.json';
import pt from '../locales/pt.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const stored = await AsyncStorage.getItem('app_language');
      if (stored) {
        callback(stored);
        return;
      }
    } catch {
      // ignore
    }
    const locale = Localization.locale.split('-')[0];
    callback(locale);
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('app_language', lng);
    } catch {
      // ignore
    }
  },
};

const resources = {
  en: { translation: en },
  cy: { translation: cy },
  pl: { translation: pl },
  ro: { translation: ro },
  tl: { translation: tl },
  pt: { translation: pt },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
