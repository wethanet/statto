import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { normalizeClubPolicySettings } from '@/lib/club-policy';
import type { ClubPolicySettings } from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { ThemeOptionRow } from '@web/components/settings/theme-option-row';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';
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

function getNumberInputValue(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

export function SettingsAdminRoute() {
  const { isConfigured, signOut, user } = useAuth();
  const { storageMode, syncDebug } = useClubData();
  const { activeClub, clubs } = useClubAccess();
  const {
    isLoading: isPolicyLoading,
    isSaving: isPolicySaving,
    lastError: policyError,
    policySettings,
    savePolicySettings,
  } = useClubPolicy();
  const { isHydrated, resolvedColorScheme, setThemePreference, themePreference } = useSettings();
  const [policyDraft, setPolicyDraft] = useState(policySettings);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const accountDescription = isConfigured
    ? user?.email
      ? `Signed in as ${user.email}. Club data is syncing via ${storageMode}.`
      : 'Supabase auth is enabled for this app.'
    : 'Supabase is not configured for this build yet, so the app is currently using local-only storage.';

  useEffect(() => {
    setPolicyDraft(policySettings);
  }, [policySettings]);

  async function handleSignOut() {
    const message = await signOut();

    if (message) {
      window.alert(message);
    }
  }

  function updatePolicyDraft<K extends keyof ClubPolicySettings>(key: K, value: ClubPolicySettings[K]) {
    setPolicyDraft((current) => {
      return normalizeClubPolicySettings({
        ...current,
        [key]: value,
      });
    });
    setPolicyMessage(null);
  }

  async function handlePolicySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await savePolicySettings(policyDraft);
      setPolicyMessage('Policy settings saved.');
    } catch {
      setPolicyMessage(null);
    }
  }

  return (
    <AdminPageShell
      description="Adjust app-wide preferences and keep the experience consistent for volunteers and coaches."
      title="Settings">
      <section className="card stack">
        <h3>Theme</h3>
        <p>
          Current setting: {themePreference}. Active appearance: {resolvedColorScheme}.
        </p>
        <p className="muted">
          {isHydrated ? 'Theme changes are saved in the browser app.' : 'Loading saved settings...'}
        </p>
      </section>

      <form className="card stack" onSubmit={handlePolicySubmit}>
        <div className="split-row">
          <div className="stack-sm">
            <h3>League and club policies</h3>
            <p className="muted">
              {isPolicyLoading
                ? 'Loading policy settings...'
                : 'Selection rules are warning-only and can be reviewed before teams are finalised.'}
            </p>
          </div>

          <button className="button" disabled={isPolicySaving || isPolicyLoading} type="submit">
            {isPolicySaving ? 'Saving...' : 'Save policies'}
          </button>
        </div>

        <div className="admin-summary-grid">
          <label className="field">
            <span>Higher grade label</span>
            <input
              className="input"
              onChange={(event) => updatePolicyDraft('higherGradeLabel', event.target.value)}
              value={policyDraft.higherGradeLabel}
            />
          </label>

          <label className="field">
            <span>Lower grade label</span>
            <input
              className="input"
              onChange={(event) => updatePolicyDraft('lowerGradeLabel', event.target.value)}
              value={policyDraft.lowerGradeLabel}
            />
          </label>

          <label className="field">
            <span>Finals minimum games</span>
            <input
              className="input"
              min="0"
              onChange={(event) => updatePolicyDraft('finalsMinimumGames', event.target.valueAsNumber)}
              type="number"
              value={getNumberInputValue(policyDraft.finalsMinimumGames)}
            />
          </label>

          <label className="field">
            <span>Higher-grade cap</span>
            <input
              className="input"
              min="0"
              onChange={(event) => updatePolicyDraft('higherDivisionMaxGames', event.target.valueAsNumber)}
              type="number"
              value={getNumberInputValue(policyDraft.higherDivisionMaxGames)}
            />
          </label>

          <label className="field">
            <span>Availability lock days</span>
            <input
              className="input"
              min="0"
              onChange={(event) => updatePolicyDraft('availabilityLockDays', event.target.valueAsNumber)}
              type="number"
              value={getNumberInputValue(policyDraft.availabilityLockDays)}
            />
          </label>

          <label className="field">
            <span>Player vote delay days</span>
            <input
              className="input"
              min="0"
              onChange={(event) => updatePolicyDraft('playerVoteOpenDelayDays', event.target.valueAsNumber)}
              type="number"
              value={getNumberInputValue(policyDraft.playerVoteOpenDelayDays)}
            />
          </label>
        </div>

        <label className="field field--inline">
          <span>Player vote eligibility</span>
          <span className="inline-actions">
            <input
              checked={policyDraft.playerVoteRequiresLineup}
              onChange={(event) => updatePolicyDraft('playerVoteRequiresLineup', event.target.checked)}
              type="checkbox"
            />
            <span className="muted">Require players to be named in the lineup before they can vote.</span>
          </span>
        </label>

        <p className="muted">
          A higher-grade cap of {policyDraft.higherDivisionMaxGames} means players should be warned before
          lower-grade selection once they exceed that number.
        </p>
        {policyError ? <p className="muted">{policyError}</p> : null}
        {policyMessage ? <p className="muted">{policyMessage}</p> : null}
      </form>

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
        <p>Players source: {syncDebug.playersSource}</p>
        <p>Attendance source: {syncDebug.attendanceSource}</p>
        <p>Availability source: {syncDebug.availabilitySource}</p>
        <p>Match lineup source: {syncDebug.matchLineupSource}</p>
        {syncDebug.lastSyncError ? <p className="muted">{syncDebug.lastSyncError}</p> : null}
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
    </AdminPageShell>
  );
}
