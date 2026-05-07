import type { ClubPolicySettings, Fixture, Player, PlayerSquad } from '@/lib/types';
import { normalizePlayerSquad } from '@/lib/team';

export const DEFAULT_CLUB_POLICY_SETTINGS: ClubPolicySettings = {
  finalsMinimumGames: 3,
  higherDivisionMaxGames: 8,
  availabilityLockDays: 6,
  playerVoteOpenDelayDays: 0,
  playerVoteRequiresLineup: true,
  higherGradeLabel: 'Cup',
  lowerGradeLabel: 'Plate',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeNonNegativeInteger(value: unknown, fallback: number) {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsedValue));
}

function normalizeLabel(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim() || fallback;
}

export function normalizeClubPolicySettings(
  input: Partial<ClubPolicySettings> | null | undefined
): ClubPolicySettings {
  return {
    finalsMinimumGames: normalizeNonNegativeInteger(
      input?.finalsMinimumGames,
      DEFAULT_CLUB_POLICY_SETTINGS.finalsMinimumGames
    ),
    higherDivisionMaxGames: normalizeNonNegativeInteger(
      input?.higherDivisionMaxGames,
      DEFAULT_CLUB_POLICY_SETTINGS.higherDivisionMaxGames
    ),
    availabilityLockDays: normalizeNonNegativeInteger(
      input?.availabilityLockDays,
      DEFAULT_CLUB_POLICY_SETTINGS.availabilityLockDays
    ),
    playerVoteOpenDelayDays: normalizeNonNegativeInteger(
      input?.playerVoteOpenDelayDays,
      DEFAULT_CLUB_POLICY_SETTINGS.playerVoteOpenDelayDays
    ),
    playerVoteRequiresLineup: input?.playerVoteRequiresLineup ?? DEFAULT_CLUB_POLICY_SETTINGS.playerVoteRequiresLineup,
    higherGradeLabel: normalizeLabel(input?.higherGradeLabel, DEFAULT_CLUB_POLICY_SETTINGS.higherGradeLabel),
    lowerGradeLabel: normalizeLabel(input?.lowerGradeLabel, DEFAULT_CLUB_POLICY_SETTINGS.lowerGradeLabel),
  };
}

export function getAvailabilityLockWindowMs(lockDays: number) {
  return normalizeNonNegativeInteger(lockDays, DEFAULT_CLUB_POLICY_SETTINGS.availabilityLockDays) * DAY_MS;
}

export function isPlayerVoteOpen(
  fixtureDate: string,
  openDelayDays = DEFAULT_CLUB_POLICY_SETTINGS.playerVoteOpenDelayDays,
  now = Date.now()
) {
  const fixtureTime = new Date(fixtureDate).getTime();

  if (!Number.isFinite(fixtureTime)) {
    return false;
  }

  return fixtureTime + getAvailabilityLockWindowMs(openDelayDays) <= now;
}

export function getPlayerVoteCandidates(
  fixture: Fixture,
  players: Player[],
  lineupPlayerIds: string[],
  voterPlayerId: string,
  requiresLineup: boolean
) {
  const fixtureSquad = fixture.squad ?? normalizePlayerSquad(fixture.grade);
  const candidatePlayers = requiresLineup
    ? players.filter((player) => lineupPlayerIds.includes(player.id))
    : players.filter((player) => player.active && isPlayerVisibleForFixtureVote(player, fixtureSquad));

  return candidatePlayers.filter((player) => player.id !== voterPlayerId);
}

function isPlayerVisibleForFixtureVote(player: Player, fixtureSquad: PlayerSquad | null) {
  if (!fixtureSquad) {
    return true;
  }

  return player.squad === fixtureSquad;
}
