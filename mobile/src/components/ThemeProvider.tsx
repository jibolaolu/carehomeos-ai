import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  type MD3Theme,
} from 'react-native-paper';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

const highContrastTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#000000',
    onPrimary: '#ffffff',
    primaryContainer: '#000000',
    onPrimaryContainer: '#ffffff',
    secondary: '#000000',
    onSecondary: '#ffffff',
    secondaryContainer: '#000000',
    onSecondaryContainer: '#ffffff',
    background: '#ffffff',
    onBackground: '#000000',
    surface: '#ffffff',
    onSurface: '#000000',
    error: '#000000',
    onError: '#ffffff',
    outline: '#000000',
  },
};

function getTheme(mode: ThemeMode): MD3Theme {
  switch (mode) {
    case 'dark':
      return MD3DarkTheme;
    case 'high-contrast':
      return highContrastTheme;
    case 'light':
    default:
      return MD3LightTheme;
  }
}

interface Props {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: Props) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode')
      .then((stored) => {
        if (stored === 'dark' || stored === 'light' || stored === 'high-contrast') {
          setModeState(stored);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_mode', newMode).catch(() => {});
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : prev === 'dark' ? 'high-contrast' : 'light';
      AsyncStorage.setItem('theme_mode', next).catch(() => {});
      return next;
    });
  }, [setMode]);

  if (!ready) return null;

  const theme = getTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}
