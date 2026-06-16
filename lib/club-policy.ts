import type { ClubPolicySettings, Fixture, Player, PlayerSquad, TrainingDrillLibraryLink } from '@/lib/types';
import { normalizePlayerSquad } from '@/lib/team';
import { normalizeTrainingDrillLength } from '@/lib/training-drill-library';

export const DEFAULT_CLUB_POLICY_SETTINGS: ClubPolicySettings = {
  finalsMinimumGames: 3,
  higherDivisionMaxGames: 8,
  availabilityLockDays: 3,
  playerVoteOpenDelayDays: 0,
  playerVoteRequiresLineup: true,
  rotationGroupsEnabled: true,
  higherGradeLabel: 'Cup',
  lowerGradeLabel: 'Plate',
  homeAndAwaySelectionCriteria:
    'Home and away selection considers availability, training attendance, training effort, role fit, recent form, fitness, team balance, and how consistently players live the club standards around effort, communication, respect, and support for teammates.',
  finalsSelectionCriteria:
    'Finals selection prioritises eligibility, availability, fitness, role fit, recent performance, training commitment, and the strongest team balance.',
  trainingDefaultTitle: 'Main training',
  trainingDefaultTime: '18:00',
  trainingDefaultDays: [2, 4],
  trainingDefaultLocations: ['Field 1', 'Field 2'],
  trainingLocationRotationSpan: 2,
  trainingGenerationWeeks: 8,
  trainingDrillLibraryLinks: [],
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

function normalizeCriteriaText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim() || fallback;
}

function normalizeTime(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function normalizeWeekdays(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const weekdays = value
    .map((item) => {
      return normalizeNonNegativeInteger(item, -1);
    })
    .filter((item) => {
      return item >= 0 && item <= 6;
    });

  const uniqueWeekdays = [...new Set(weekdays)].sort((left, right) => left - right);

  return uniqueWeekdays.length > 0 ? uniqueWeekdays : fallback;
}

function normalizeLocations(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const locations = value
    .filter((item): item is string => {
      return typeof item === 'string';
    })
    .map((item) => {
      return item.trim();
    })
    .filter(Boolean);

  return locations.length > 0 ? locations : fallback;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createPolicyId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function normalizeTrainingLibraryDrills(
  value: unknown,
  libraryUrl: string,
  libraryOutcomes: string[]
): TrainingDrillLibraryLink['drills'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const drill = item as Partial<TrainingDrillLibraryLink['drills'][number]>;
      const name = typeof drill.name === 'string' ? drill.name.trim() : '';
      const link = typeof drill.link === 'string' && drill.link.trim() ? drill.link.trim() : libraryUrl;
      const lengthMinutes =
        typeof drill.lengthMinutes === 'number'
          ? drill.lengthMinutes
          : typeof drill.lengthMinutes === 'string'
            ? Number(drill.lengthMinutes)
            : 12;

      if (!name || !link) {
        return null;
      }

      return {
        id: typeof drill.id === 'string' && drill.id.trim() ? drill.id : createPolicyId('library-drill', index),
        name,
        lengthMinutes: normalizeTrainingDrillLength(name, lengthMinutes),
        link,
        skills: normalizeStringList(drill.skills),
        outcomes: normalizeStringList(drill.outcomes).length > 0 ? normalizeStringList(drill.outcomes) : libraryOutcomes,
      };
    })
    .filter((item): item is TrainingDrillLibraryLink['drills'][number] => Boolean(item));
}

function normalizeTrainingDrillLibraryLinks(value: unknown): TrainingDrillLibraryLink[] {
  if (!Array.isArray(value)) {
    return DEFAULT_CLUB_POLICY_SETTINGS.trainingDrillLibraryLinks;
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Partial<TrainingDrillLibraryLink>;
      const url = typeof entry.url === 'string' ? entry.url.trim() : '';
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      const outcomes = normalizeStringList(entry.outcomes);

      if (!url) {
        return null;
      }

      const legacyDrills = normalizeStringList((entry as Partial<TrainingDrillLibraryLink> & { drillNames?: unknown }).drillNames).map(
        (name, drillIndex) => {
          return {
            id: createPolicyId(`library-drill-${index + 1}`, drillIndex),
            name,
            lengthMinutes: normalizeTrainingDrillLength(name, 12),
            link: url,
            skills: outcomes,
            outcomes,
          };
        }
      );
      const drills = normalizeTrainingLibraryDrills(entry.drills, url, outcomes);

      return {
        id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `drill-library-${index + 1}`,
        title: title || url,
        url,
        drills: drills.length > 0 ? drills : legacyDrills,
        outcomes,
      } satisfies TrainingDrillLibraryLink;
    })
    .filter((item): item is TrainingDrillLibraryLink => Boolean(item));
}

export function normalizeClubPolicySettings(
  input: Partial<ClubPolicySettings> | null | undefined
): ClubPolicySettings {
  const legacySelectionCriteria = input as
    | (Partial<ClubPolicySettings> & {
        homeGameSelectionCriteria?: unknown;
        awayGameSelectionCriteria?: unknown;
      })
    | null
    | undefined;

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
    rotationGroupsEnabled: input?.rotationGroupsEnabled ?? DEFAULT_CLUB_POLICY_SETTINGS.rotationGroupsEnabled,
    higherGradeLabel: normalizeLabel(input?.higherGradeLabel, DEFAULT_CLUB_POLICY_SETTINGS.higherGradeLabel),
    lowerGradeLabel: normalizeLabel(input?.lowerGradeLabel, DEFAULT_CLUB_POLICY_SETTINGS.lowerGradeLabel),
    homeAndAwaySelectionCriteria: normalizeCriteriaText(
      input?.homeAndAwaySelectionCriteria ??
        legacySelectionCriteria?.homeGameSelectionCriteria ??
        legacySelectionCriteria?.awayGameSelectionCriteria,
      DEFAULT_CLUB_POLICY_SETTINGS.homeAndAwaySelectionCriteria
    ),
    finalsSelectionCriteria: normalizeCriteriaText(
      input?.finalsSelectionCriteria,
      DEFAULT_CLUB_POLICY_SETTINGS.finalsSelectionCriteria
    ),
    trainingDefaultTitle: normalizeLabel(
      input?.trainingDefaultTitle,
      DEFAULT_CLUB_POLICY_SETTINGS.trainingDefaultTitle
    ),
    trainingDefaultTime: normalizeTime(
      input?.trainingDefaultTime,
      DEFAULT_CLUB_POLICY_SETTINGS.trainingDefaultTime
    ),
    trainingDefaultDays: normalizeWeekdays(
      input?.trainingDefaultDays,
      DEFAULT_CLUB_POLICY_SETTINGS.trainingDefaultDays
    ),
    trainingDefaultLocations: normalizeLocations(
      input?.trainingDefaultLocations,
      DEFAULT_CLUB_POLICY_SETTINGS.trainingDefaultLocations
    ),
    trainingLocationRotationSpan: normalizeNonNegativeInteger(
      input?.trainingLocationRotationSpan,
      DEFAULT_CLUB_POLICY_SETTINGS.trainingLocationRotationSpan
    ) || DEFAULT_CLUB_POLICY_SETTINGS.trainingLocationRotationSpan,
    trainingGenerationWeeks: normalizeNonNegativeInteger(
      input?.trainingGenerationWeeks,
      DEFAULT_CLUB_POLICY_SETTINGS.trainingGenerationWeeks
    ) || DEFAULT_CLUB_POLICY_SETTINGS.trainingGenerationWeeks,
    trainingDrillLibraryLinks: normalizeTrainingDrillLibraryLinks(input?.trainingDrillLibraryLinks),
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
