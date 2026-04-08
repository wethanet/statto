import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthScreen } from '@/components/auth/auth-screen';
import { ClubAccessScreen } from '@/components/club/club-access-screen';
import { ClubAccessProvider, useClubAccess } from '@/lib/club-access-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ClubDataProvider } from '@/lib/club-data-context';
import { SettingsProvider } from '@/lib/settings-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ClubAccessProvider>
          <ClubDataProvider>
            <RootNavigator />
          </ClubDataProvider>
        </ClubAccessProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isConfigured, isLoading, session } = useAuth();
  const { activeClub, isLoading: isClubAccessLoading } = useClubAccess();
  const requiresAuth = isConfigured;
  const hasSession = !requiresAuth || Boolean(session);
  const hasClubAccess = !requiresAuth || Boolean(activeClub);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isLoading || (hasSession && isClubAccessLoading) ? (
        <ThemedView style={styles.loadingState}>
          <ActivityIndicator size="small" color="#0A7EA4" />
          <ThemedText>Loading your club data...</ThemedText>
        </ThemedView>
      ) : !hasSession ? (
        <AuthScreen />
      ) : !hasClubAccess ? (
        <ClubAccessScreen />
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin/club" options={{ title: 'Club access' }} />
        </Stack>
      )}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
});
