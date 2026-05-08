import type { ClubPolicySettings, Fixture, MatchLineupAssignment } from '@/lib/types';

export type PlayerGamesPlayedGradeTotal = {
  grade: string;
  games: number;
};

export type PlayerGamesPlayedSummary = {
  total: number;
  byGrade: Record<string, number>;
  gradeTotals: PlayerGamesPlayedGradeTotal[];
};

export type GamesPlayedOptions = {
  higherGradeLabel?: string;
  lowerGradeLabel?: string;
  now?: number;
};

type DraftPlayerGamesPlayedSummary = {
  total: number;
  byGrade: Record<string, number>;
};

const EMPTY_GAMES_PLAYED_SUMMARY: PlayerGamesPlayedSummary = {
  total: 0,
  byGrade: {},
  gradeTotals: [],
};

function normalizeGradeKey(value: string) {
  return normalizeGradeLabel(value).toLocaleLowerCase('en-AU');
}

function getSquadGradeLabel(fixture: Fixture, options: GamesPlayedOptions) {
  if (fixture.squad === 'cup') {
    return options.higherGradeLabel ?? 'Cup';
  }

  if (fixture.squad === 'plate') {
    return options.lowerGradeLabel ?? 'Plate';
  }

  return 'Ungraded';
}

function isPastFixture(fixture: Fixture, now: number) {
  const fixtureTime = new Date(fixture.date).getTime();

  return Number.isFinite(fixtureTime) && fixtureTime < now;
}

function getGradeGames(summary: PlayerGamesPlayedSummary, gradeLabel: string) {
  const gradeKey = normalizeGradeKey(gradeLabel);
  const matchingEntry = Object.entries(summary.byGrade).find(([grade]) => normalizeGradeKey(grade) === gradeKey);

  return matchingEntry?.[1] ?? 0;
}

function isLowerGradeFixture(fixture: Fixture, policySettings: ClubPolicySettings) {
  if (fixture.squad === 'plate') {
    return true;
  }

  return normalizeGradeKey(getFixtureGamesPlayedGradeLabel(fixture, policySettings)) ===
    normalizeGradeKey(policySettings.lowerGradeLabel);
}

export function normalizeGradeLabel(value: string | null | undefined, fallback = 'Ungraded') {
  const normalizedValue = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

  return normalizedValue || fallback;
}

export function getFixtureGamesPlayedGradeLabel(fixture: Fixture, options: GamesPlayedOptions = {}) {
  const grade = normalizeGradeLabel(fixture.grade, '');

  return grade || getSquadGradeLabel(fixture, options);
}

export function buildGamesPlayedByGrade(
  fixtures: Fixture[],
  assignments: MatchLineupAssignment[],
  options: GamesPlayedOptions = {}
) {
  const now = options.now ?? Date.now();
  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const gradeLabelsByKey = new Map<string, string>();
  const countedFixturePlayers = new Set<string>();
  const summaries: Record<string, DraftPlayerGamesPlayedSummary> = {};

  assignments.forEach((assignment) => {
    const fixture = fixturesById.get(assignment.fixtureId);

    if (!fixture || !isPastFixture(fixture, now)) {
      return;
    }

    const fixturePlayerKey = `${assignment.fixtureId}:${assignment.playerId}`;

    if (countedFixturePlayers.has(fixturePlayerKey)) {
      return;
    }

    countedFixturePlayers.add(fixturePlayerKey);

    const fixtureGradeLabel = getFixtureGamesPlayedGradeLabel(fixture, options);
    const gradeKey = normalizeGradeKey(fixtureGradeLabel);
    const canonicalGradeLabel = gradeLabelsByKey.get(gradeKey) ?? fixtureGradeLabel;
    gradeLabelsByKey.set(gradeKey, canonicalGradeLabel);

    const summary = summaries[assignment.playerId] ?? {
      total: 0,
      byGrade: {},
    };

    summary.total += 1;
    summary.byGrade[canonicalGradeLabel] = (summary.byGrade[canonicalGradeLabel] ?? 0) + 1;
    summaries[assignment.playerId] = summary;
  });

  return Object.fromEntries(
    Object.entries(summaries).map(([playerId, summary]) => {
      return [
        playerId,
        {
          ...summary,
          gradeTotals: Object.entries(summary.byGrade)
            .map(([grade, games]) => ({ grade, games }))
            .sort((left, right) => left.grade.localeCompare(right.grade)),
        },
      ];
    })
  ) as Record<string, PlayerGamesPlayedSummary>;
}

export function getPlayerGamesPlayedSummary(
  gamesPlayedByPlayer: Record<string, PlayerGamesPlayedSummary>,
  playerId: string
) {
  return gamesPlayedByPlayer[playerId] ?? EMPTY_GAMES_PLAYED_SUMMARY;
}

export function getLowerGradeSelectionBlockReason(
  fixture: Fixture,
  playerGamesPlayed: PlayerGamesPlayedSummary,
  policySettings: ClubPolicySettings
) {
  if (!isLowerGradeFixture(fixture, policySettings)) {
    return null;
  }

  const higherGradeGames = getGradeGames(playerGamesPlayed, policySettings.higherGradeLabel);

  if (higherGradeGames <= policySettings.higherDivisionMaxGames) {
    return null;
  }

  return `Blocked: ${higherGradeGames} ${policySettings.higherGradeLabel} games. Players with more than ${policySettings.higherDivisionMaxGames} ${policySettings.higherGradeLabel} games cannot be selected for ${policySettings.lowerGradeLabel}.`;
}
