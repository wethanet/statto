import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';
import type { ResolvedColorScheme, ThemePreference } from '@web/lib/theme';

type SettingsContextValue = {
  themePreference: ThemePreference;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  resolvedColorScheme: ResolvedColorScheme;
  isHydrated: boolean;
};

const THEME_PREFERENCE_STORAGE_KEY = 'theme-preference.json';

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [themePreference, setThemePreference] = useState<ThemePreference>('light');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const storedPreference = await readJsonStorage<ThemePreference>(THEME_PREFERENCE_STORAGE_KEY);

      if (!isMounted) {
        return;
      }

      setThemePreference(storedPreference === 'dark' ? 'dark' : 'light');
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

    writeJsonStorage(THEME_PREFERENCE_STORAGE_KEY, themePreference).catch((error: unknown) => {
      console.warn('Failed to save theme preference', error);
    });
  }, [isHydrated, themePreference]);

  const resolvedColorScheme: ResolvedColorScheme = themePreference;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = resolvedColorScheme;
    document.documentElement.style.colorScheme = resolvedColorScheme;
  }, [resolvedColorScheme]);

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
