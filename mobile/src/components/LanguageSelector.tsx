import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Menu, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'cy', label: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'tl', label: 'Tagalog', flag: '🇵🇭' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

interface Props {
  compact?: boolean;
}

export default function LanguageSelector({ compact = false }: Props) {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const selectLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('app_language', code);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            icon="translate"
            compact={compact}
            accessibilityLabel={t('settings.language')}
            accessibilityRole="button"
          >
            {compact ? current.flag : `${current.flag} ${current.label}`}
          </Button>
        }
      >
        {LANGUAGES.map((lang) => (
          <Menu.Item
            key={lang.code}
            onPress={() => selectLanguage(lang.code)}
            title={`${lang.flag} ${lang.label}`}
            trailingIcon={i18n.language === lang.code ? 'check' : undefined}
            accessibilityLabel={lang.label}
            accessibilityState={{ selected: i18n.language === lang.code }}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
});
