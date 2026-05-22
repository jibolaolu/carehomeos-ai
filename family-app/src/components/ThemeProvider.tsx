import React, { createContext, useContext, useEffect, useState } from 'react';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'high-contrast';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  setThemeMode: () => {},
  isDark: false,
});

export const useThemeMode = () => useContext(ThemeContext);

const highContrastTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#000000',
    onPrimary: '#FFFFFF',
    background: '#FFFFFF',
    onBackground: '#000000',
    surface: '#FFFFFF',
    onSurface: '#000000',
    outline: '#000000',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('themeMode').then((saved) => {
      if (saved && ['light', 'dark', 'high-contrast'].includes(saved)) {
        setThemeModeState(saved as ThemeMode);
      }
      setIsReady(true);
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  const getTheme = () => {
    switch (themeMode) {
      case 'dark':
        return MD3DarkTheme;
      case 'high-contrast':
        return highContrastTheme;
      default:
        return MD3LightTheme;
    }
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark: themeMode === 'dark' }}>
      <PaperProvider theme={getTheme()}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
