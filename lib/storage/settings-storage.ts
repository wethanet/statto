import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_STORAGE_KEY = 'theme-preference.json';

export async function loadThemePreference() {
  const storedPreference = await readJsonStorage<ThemePreference>(THEME_PREFERENCE_STORAGE_KEY);

  return storedPreference ?? 'system';
}

export async function saveThemePreference(themePreference: ThemePreference) {
  await writeJsonStorage(THEME_PREFERENCE_STORAGE_KEY, themePreference);
}
