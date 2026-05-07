import {
  DEFAULT_CLUB_POLICY_SETTINGS,
  normalizeClubPolicySettings,
} from '@/lib/club-policy';
import type { ClubPolicySettings } from '@/lib/types';

import { supabase } from '@web/lib/supabase';

type ClubPolicySettingsRow = {
  finals_minimum_games: number | null;
  higher_division_max_games: number | null;
  availability_lock_days: number | null;
  player_vote_open_delay_days: number | null;
  player_vote_requires_lineup: boolean | null;
  higher_grade_label: string | null;
  lower_grade_label: string | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function mapRowToPolicySettings(row: ClubPolicySettingsRow | null | undefined): ClubPolicySettings {
  return normalizeClubPolicySettings({
    finalsMinimumGames: row?.finals_minimum_games ?? DEFAULT_CLUB_POLICY_SETTINGS.finalsMinimumGames,
    higherDivisionMaxGames: row?.higher_division_max_games ?? DEFAULT_CLUB_POLICY_SETTINGS.higherDivisionMaxGames,
    availabilityLockDays: row?.availability_lock_days ?? DEFAULT_CLUB_POLICY_SETTINGS.availabilityLockDays,
    playerVoteOpenDelayDays: row?.player_vote_open_delay_days ?? DEFAULT_CLUB_POLICY_SETTINGS.playerVoteOpenDelayDays,
    playerVoteRequiresLineup: row?.player_vote_requires_lineup ?? DEFAULT_CLUB_POLICY_SETTINGS.playerVoteRequiresLineup,
    higherGradeLabel: row?.higher_grade_label ?? DEFAULT_CLUB_POLICY_SETTINGS.higherGradeLabel,
    lowerGradeLabel: row?.lower_grade_label ?? DEFAULT_CLUB_POLICY_SETTINGS.lowerGradeLabel,
  });
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes('Could not find the table') === true
  );
}

export async function loadCloudClubPolicySettings(clubId: string) {
  if (!supabase) {
    return DEFAULT_CLUB_POLICY_SETTINGS;
  }

  const { data, error } = await supabase
    .from('club_policy_settings')
    .select(
      'finals_minimum_games, higher_division_max_games, availability_lock_days, player_vote_open_delay_days, player_vote_requires_lineup, higher_grade_label, lower_grade_label'
    )
    .eq('club_id', clubId)
    .maybeSingle();

  if (isMissingTableError(error)) {
    console.warn(
      'Club policy settings are not available in this Supabase schema yet. Run the latest supabase/schema.sql to enable policy management.'
    );
    return DEFAULT_CLUB_POLICY_SETTINGS;
  }

  if (error) {
    throw error;
  }

  return mapRowToPolicySettings(data as ClubPolicySettingsRow | null);
}

export async function upsertCloudClubPolicySettings(clubId: string, settings: ClubPolicySettings) {
  const client = requireSupabase();
  const normalizedSettings = normalizeClubPolicySettings(settings);
  const { error } = await client.from('club_policy_settings').upsert(
    {
      club_id: clubId,
      finals_minimum_games: normalizedSettings.finalsMinimumGames,
      higher_division_max_games: normalizedSettings.higherDivisionMaxGames,
      availability_lock_days: normalizedSettings.availabilityLockDays,
      player_vote_open_delay_days: normalizedSettings.playerVoteOpenDelayDays,
      player_vote_requires_lineup: normalizedSettings.playerVoteRequiresLineup,
      higher_grade_label: normalizedSettings.higherGradeLabel,
      lower_grade_label: normalizedSettings.lowerGradeLabel,
    },
    { onConflict: 'club_id' }
  );

  if (error) {
    throw error;
  }
}
