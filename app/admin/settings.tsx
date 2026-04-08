import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemeOptionRow } from '../../components/settings/theme-option-row';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useClubAccess } from '@/lib/club-access-context';
import { useAuth } from '@/lib/auth-context';
import { useClubData } from '@/lib/club-data-context';
import { useSettings } from '@/lib/settings-context';
import type { ThemePreference } from '@/lib/storage/settings-storage';

const themeOptions: {
  label: string;
  description: string;
  value: ThemePreference;
}[] = [
  {
    label: 'System',
    description: 'Follow the device appearance automatically.',
    value: 'system',
  },
  {
    label: 'Light',
    description: 'Always use the light theme.',
    value: 'light',
  },
  {
    label: 'Dark',
    description: 'Always use the dark theme.',
    value: 'dark',
  },
];

export default function SettingsScreen() {
  const { isConfigured, signOut, user } = useAuth();
  const { storageMode } = useClubData();
  const { activeClub, clubs } = useClubAccess();
  const { isHydrated, resolvedColorScheme, setThemePreference, themePreference } = useSettings();
  const accountDescription = isConfigured
    ? user?.email
      ? `Signed in as ${user.email}. Club data is syncing via ${storageMode}.`
      : 'Supabase auth is enabled for this app.'
    : 'Supabase is not configured yet, so the app is currently using local-only storage.';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText>
          Adjust app-wide preferences and keep the experience consistent for volunteers and coaches.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Theme</ThemedText>
        <ThemedText>
          Current setting: {themePreference}. Active appearance: {resolvedColorScheme}.
        </ThemedText>
        <ThemedText style={styles.helperText}>
          {isHydrated ? 'Theme changes are saved on this device.' : 'Loading saved settings...'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Account</ThemedText>
        <ThemedText>{accountDescription}</ThemedText>
        {activeClub ? (
          <ThemedText>
            Active club: {activeClub.name} • Invite code {activeClub.inviteCode}
          </ThemedText>
        ) : null}
        {isConfigured ? (
          <Link href="/admin/club">
            <ThemedText type="link">
              {clubs.length > 0 ? 'Manage clubs and switch teams' : 'Create or join a club'}
            </ThemedText>
          </Link>
        ) : null}
        {isConfigured && user ? (
          <Pressable
            onPress={() => {
              signOut().catch((error: unknown) => {
                console.warn('Failed to sign out', error);
              });
            }}
            style={styles.signOutButton}>
            <ThemedText style={styles.signOutButtonText}>Sign out</ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      {themeOptions.map((option) => {
        return (
          <ThemeOptionRow
            key={option.value}
            label={option.label}
            description={option.description}
            value={option.value}
            selectedValue={themePreference}
            onPress={setThemePreference}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  summaryCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  helperText: {
    color: '#6B7280',
  },
  signOutButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#A43D2A',
  },
  signOutButtonText: {
    color: '#FFFFFF',
  },
});
