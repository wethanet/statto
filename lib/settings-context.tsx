import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/lib/storage/settings-storage';

type SettingsContextValue = {
  themePreference: ThemePreference;
  setThemePreference: React.Dispatch<React.SetStateAction<ThemePreference>>;
  resolvedColorScheme: 'light' | 'dark';
  isHydrated: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const nativeColorScheme = useNativeColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const storedPreference = await loadThemePreference();

      if (!isMounted) {
        return;
      }

      setThemePreference(storedPreference);
      setIsHydrated(true);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveThemePreference(themePreference).catch((error: unknown) => {
      console.warn('Failed to save theme preference', error);
    });
  }, [isHydrated, themePreference]);

  const resolvedColorScheme =
    themePreference === 'system' ? nativeColorScheme ?? 'light' : themePreference;

  const value = useMemo<SettingsContextValue>(() => {
    return {
      themePreference,
      setThemePreference,
      resolvedColorScheme,
      isHydrated,
    };
  }, [isHydrated, resolvedColorScheme, themePreference]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }

  return context;
}
