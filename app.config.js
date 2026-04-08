const appJson = require('./app.json');

const expoConfig = appJson.expo ?? {};
const extra = expoConfig.extra ?? {};

module.exports = () => ({
  ...expoConfig,
  extra: {
    ...extra,
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
    },
  },
});
