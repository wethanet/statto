import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

type ExpoExtra = {
  supabase?: {
    url?: string | null;
    anonKey?: string | null;
  };
};

const expoExtra = (Constants.expoConfig?.extra ?? null) as ExpoExtra | null;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? expoExtra?.supabase?.url ?? null;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? expoExtra?.supabase?.anonKey ?? null;

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  const secureValue = await SecureStore.getItemAsync(key);

  if (secureValue) {
    return secureValue;
  }

  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await Promise.allSettled([SecureStore.deleteItemAsync(key), AsyncStorage.removeItem(key)]);
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: {
          getItem,
          setItem,
          removeItem,
        },
        autoRefreshToken: Platform.OS !== 'web',
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
