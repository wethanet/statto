import type { MatchStatEntry, MatchStatMetric, MatchStatQuarter, MatchStatTeam } from '@/lib/types';

export const matchStatMetrics: MatchStatMetric[] = [
  'kicks',
  'handballs',
  'disposals',
  'effective-disposals',
  'clearances',
  'goals',
  'points',
  'tackles',
  'hit-outs',
  'inside-50s',
  'uncontested-marks',
  'marks-i50',
  'free-kicks',
  'intercept-marks',
];

export const matchStatLabels: Record<MatchStatMetric, string> = {
  kicks: 'Kicks',
  handballs: 'Handballs',
  disposals: 'Disposals',
  'effective-disposals': 'Effective Disposals',
  clearances: 'Clearances',
  goals: 'Goals',
  points: 'Points',
  tackles: 'Tackles',
  'hit-outs': 'Hit Outs',
  'inside-50s': 'Inside 50s',
  'uncontested-marks': 'Uncontested Marks',
  'marks-i50': 'Marks I50',
  'free-kicks': 'Free Kicks',
  'intercept-marks': 'Intercept Marks',
};

export const matchStatQuarterOrder: MatchStatQuarter[] = ['game', 'q1', 'q2', 'q3', 'q4'];
export const matchStatCaptureQuarterOrder: MatchStatQuarter[] = ['q1', 'q2', 'q3', 'q4'];

export const matchStatQuarterLabels: Record<MatchStatQuarter, string> = {
  game: 'Game',
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
};

export function normalizeMatchStatQuarter(value: string | null | undefined): MatchStatQuarter {
  const normalizedValue = value?.trim().toLowerCase();

  if (
    normalizedValue === 'game' ||
    normalizedValue === 'q1' ||
    normalizedValue === 'q2' ||
    normalizedValue === 'q3' ||
    normalizedValue === 'q4'
  ) {
    return normalizedValue;
  }

  return 'game';
}

export function normalizeMatchStats(
  entries: Array<Omit<MatchStatEntry, 'quarter'> & { quarter?: string | null }>
) {
  return entries.map((entry) => {
    return {
      ...entry,
      quarter: normalizeMatchStatQuarter(entry.quarter),
    };
  });
}

function getMatchingEntries(
  fixtureId: string,
  metric: MatchStatMetric,
  team: MatchStatTeam,
  matchStats: MatchStatEntry[]
) {
  return matchStats.filter((entry) => {
    return entry.fixtureId === fixtureId && entry.metric === metric && entry.team === team;
  });
}

export function getMatchStatQuarterValue(
  fixtureId: string,
  metric: MatchStatMetric,
  team: MatchStatTeam,
  matchStats: MatchStatEntry[],
  quarter: MatchStatQuarter
) {
  const matchingEntries = getMatchingEntries(fixtureId, metric, team, matchStats);

  if (quarter === 'game') {
    const fullGameEntry = matchingEntries.find((entry) => entry.quarter === 'game');

    if (fullGameEntry) {
      return fullGameEntry.value;
    }

    return matchingEntries.reduce((total, entry) => {
      return entry.quarter === 'game' ? total : total + entry.value;
    }, 0);
  }

  return matchingEntries.find((entry) => entry.quarter === quarter)?.value ?? 0;
}

export function getMatchStatValue(
  fixtureId: string,
  metric: MatchStatMetric,
  team: MatchStatTeam,
  matchStats: MatchStatEntry[],
  quarter: MatchStatQuarter = 'game'
) {
  if (quarter === 'game') {
    return getMatchStatQuarterValue(fixtureId, metric, team, matchStats, 'game');
  }

  return matchStatCaptureQuarterOrder.reduce((total, currentQuarter) => {
    total += getMatchStatQuarterValue(fixtureId, metric, team, matchStats, currentQuarter);

    if (currentQuarter === quarter) {
      return total;
    }

    return total;
  }, 0);
}

export function getFixtureMatchStatSummary(fixtureId: string, matchStats: MatchStatEntry[]) {
  return {
    ours: matchStatMetrics.reduce((total, metric) => {
      return total + getMatchStatQuarterValue(fixtureId, metric, 'ours', matchStats, 'game');
    }, 0),
    theirs: matchStatMetrics.reduce((total, metric) => {
      return total + getMatchStatQuarterValue(fixtureId, metric, 'theirs', matchStats, 'game');
    }, 0),
  };
}

export function getFixtureScoreSummary(
  fixtureId: string,
  matchStats: MatchStatEntry[],
  quarter: MatchStatQuarter = 'game'
) {
  const oursGoals = getMatchStatValue(fixtureId, 'goals', 'ours', matchStats, quarter);
  const oursPoints = getMatchStatValue(fixtureId, 'points', 'ours', matchStats, quarter);
  const theirsGoals = getMatchStatValue(fixtureId, 'goals', 'theirs', matchStats, quarter);
  const theirsPoints = getMatchStatValue(fixtureId, 'points', 'theirs', matchStats, quarter);

  return {
    ours: {
      goals: oursGoals,
      points: oursPoints,
      score: oursGoals * 6 + oursPoints,
    },
    theirs: {
      goals: theirsGoals,
      points: theirsPoints,
      score: theirsGoals * 6 + theirsPoints,
    },
  };
}

export function upsertMatchStatEntry(
  matchStats: MatchStatEntry[],
  fixtureId: string,
  quarter: MatchStatQuarter,
  metric: MatchStatMetric,
  team: MatchStatTeam,
  value: number
) {
  const nextMatchStats = matchStats.filter((entry) => {
    return !(
      entry.fixtureId === fixtureId &&
      entry.quarter === quarter &&
      entry.metric === metric &&
      entry.team === team
    );
  });

  if (value > 0) {
    nextMatchStats.push({
      fixtureId,
      quarter,
      metric,
      team,
      value,
    });
  }

  return nextMatchStats;
}

export function adjustMatchStatEntry(
  matchStats: MatchStatEntry[],
  fixtureId: string,
  quarter: MatchStatQuarter,
  metric: MatchStatMetric,
  team: MatchStatTeam,
  delta: number
) {
  const nextValue = Math.max(
    0,
    getMatchStatQuarterValue(fixtureId, metric, team, matchStats, quarter) + delta
  );
  return upsertMatchStatEntry(matchStats, fixtureId, quarter, metric, team, nextValue);
}

export function deleteMatchStatsForFixture(matchStats: MatchStatEntry[], fixtureId: string) {
  return matchStats.filter((entry) => {
    return entry.fixtureId !== fixtureId;
  });
}
