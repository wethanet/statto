import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? null;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
