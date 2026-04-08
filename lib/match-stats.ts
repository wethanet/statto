import type { MatchStatEntry, MatchStatMetric, MatchStatTeam } from '@/lib/types';

export const matchStatMetrics: MatchStatMetric[] = [
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

export function getMatchStatValue(
  fixtureId: string,
  metric: MatchStatMetric,
  team: MatchStatTeam,
  matchStats: MatchStatEntry[]
) {
  return matchStats.find((entry) => {
    return entry.fixtureId === fixtureId && entry.metric === metric && entry.team === team;
  })?.value ?? 0;
}

export function getFixtureMatchStatSummary(fixtureId: string, matchStats: MatchStatEntry[]) {
  return matchStats.reduce(
    (summary, entry) => {
      if (entry.fixtureId !== fixtureId) {
        return summary;
      }

      summary[entry.team] += entry.value;
      return summary;
    },
    {
      ours: 0,
      theirs: 0,
    }
  );
}

export function getFixtureScoreSummary(fixtureId: string, matchStats: MatchStatEntry[]) {
  const oursGoals = getMatchStatValue(fixtureId, 'goals', 'ours', matchStats);
  const oursPoints = getMatchStatValue(fixtureId, 'points', 'ours', matchStats);
  const theirsGoals = getMatchStatValue(fixtureId, 'goals', 'theirs', matchStats);
  const theirsPoints = getMatchStatValue(fixtureId, 'points', 'theirs', matchStats);

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
  metric: MatchStatMetric,
  team: MatchStatTeam,
  value: number
) {
  const nextMatchStats = matchStats.filter((entry) => {
    return !(entry.fixtureId === fixtureId && entry.metric === metric && entry.team === team);
  });

  if (value > 0) {
    nextMatchStats.push({
      fixtureId,
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
  metric: MatchStatMetric,
  team: MatchStatTeam,
  delta: number
) {
  const nextValue = Math.max(0, getMatchStatValue(fixtureId, metric, team, matchStats) + delta);
  return upsertMatchStatEntry(matchStats, fixtureId, metric, team, nextValue);
}

export function deleteMatchStatsForFixture(matchStats: MatchStatEntry[], fixtureId: string) {
  return matchStats.filter((entry) => {
    return entry.fixtureId !== fixtureId;
  });
}
