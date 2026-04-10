import { Link } from 'react-router-dom';

import { ThemeOptionRow } from '@web/components/settings/theme-option-row';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useSettings } from '@web/lib/settings-context';
import type { ThemePreference } from '@web/lib/theme';

const themeOptions: {
  label: string;
  description: string;
  value: ThemePreference;
}[] = [
  {
    label: 'Light',
    description: 'Use the light theme by default.',
    value: 'light',
  },
  {
    label: 'Dark',
    description: 'Always use the dark theme.',
    value: 'dark',
  },
];

export function SettingsAdminRoute() {
  const { isConfigured, signOut, user } = useAuth();
  const { storageMode, syncDebug } = useClubData();
  const { activeClub, clubs } = useClubAccess();
  const { isHydrated, resolvedColorScheme, setThemePreference, themePreference } = useSettings();
  const accountDescription = isConfigured
    ? user?.email
      ? `Signed in as ${user.email}. Club data is syncing via ${storageMode}.`
      : 'Supabase auth is enabled for this app.'
    : 'Supabase is not configured for this build yet, so the app is currently using local-only storage.';

  async function handleSignOut() {
    const message = await signOut();

    if (message) {
      window.alert(message);
    }
  }

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Admin</span>
        <h2>Settings</h2>
        <p className="muted">
          Adjust app-wide preferences and keep the experience consistent for volunteers and coaches.
        </p>
      </section>

      <section className="card stack">
        <h3>Theme</h3>
        <p>
          Current setting: {themePreference}. Active appearance: {resolvedColorScheme}.
        </p>
        <p className="muted">
          {isHydrated ? 'Theme changes are saved in the browser app.' : 'Loading saved settings...'}
        </p>
      </section>

      <section className="card stack">
        <h3>Account</h3>
        <p>{accountDescription}</p>
        {activeClub ? (
          <p>
            Active club: {activeClub.name} • Invite code {activeClub.inviteCode}
          </p>
        ) : null}
        {isConfigured ? (
          <Link className="text-link" to="/admin/club">
            {clubs.length > 0 ? 'Manage clubs and switch teams' : 'Create or join a club'}
          </Link>
        ) : null}
        {isConfigured && user ? (
          <button className="button button--danger" onClick={handleSignOut} type="button">
            Sign out
          </button>
        ) : null}
      </section>

      <section className="card stack">
        <h3>Sync Debug</h3>
        <p className="muted">Temporary diagnostic for cloud vs local hydration.</p>
        <p>Attendance source: {syncDebug.attendanceSource}</p>
        <p>Availability source: {syncDebug.availabilitySource}</p>
      </section>

      {themeOptions.map((option) => {
        return (
          <ThemeOptionRow
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={setThemePreference}
            selectedValue={themePreference}
            value={option.value}
          />
        );
      })}
    </section>
  );
}
