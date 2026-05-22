import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'cy', label: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'tl', label: 'Tagalog', flag: '🇵🇭' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [visible, setVisible] = React.useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('userLanguage', code);
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
            accessibilityLabel={t('common.language')}
            style={styles.button}
          >
            {currentLang.flag} {currentLang.label}
          </Button>
        }
      >
        {LANGUAGES.map((lang) => (
          <Menu.Item
            key={lang.code}
            onPress={() => changeLanguage(lang.code)}
            title={`${lang.flag} ${lang.label}`}
            trailingIcon={i18n.language === lang.code ? 'check' : undefined}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    minWidth: 180,
  },
});
