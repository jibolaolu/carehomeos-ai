import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import cy from '../locales/cy.json';
import pl from '../locales/pl.json';
import ro from '../locales/ro.json';
import tl from '../locales/tl.json';
import pt from '../locales/pt.json';

const resources = {
  en: { translation: en },
  cy: { translation: cy },
  pl: { translation: pl },
  ro: { translation: ro },
  tl: { translation: tl },
  pt: { translation: pt },
};

const getDeviceLanguage = (): string => {
  const locale = Localization.locale;
  const lang = locale.split('-')[0];
  return Object.keys(resources).includes(lang) ? lang : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
