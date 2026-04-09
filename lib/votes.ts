import { getPlayerSortValue } from '@/lib/team';
import type { Player, VoteEntry, VoteType } from '@/lib/types';

type PlayerWithVotes = Player & {
  points: number;
};

type LegacyVoteEntry = Omit<VoteEntry, 'voteType'> & {
  voteType?: VoteType;
};

export const voteTypes: { id: VoteType; label: string; description: string }[] = [
  {
    id: 'players',
    label: 'Players votes',
    description: 'Track the player group vote count for each match.',
  },
  {
    id: 'coaches',
    label: 'Coaches votes',
    description: 'Capture the coaches panel votes separately from player voting.',
  },
  {
    id: 'best-and-fairest',
    label: 'B&F votes',
    description: 'Keep the official best and fairest tally moving week to week.',
  },
];

export const defaultVoteType: VoteType = 'players';

export function normalizeVoteType(value: unknown): VoteType {
  if (value === 'coaches' || value === 'best-and-fairest') {
    return value;
  }

  return defaultVoteType;
}

export function normalizeVoteEntries(voteEntries: VoteEntry[] | LegacyVoteEntry[]) {
  return voteEntries.map((entry) => {
    return {
      fixtureId: entry.fixtureId,
      playerId: entry.playerId,
      voteType: normalizeVoteType(entry.voteType),
      points: entry.points,
    } satisfies VoteEntry;
  });
}

export function getVotePointsForPlayer(
  fixtureId: string,
  playerId: string,
  voteEntries: VoteEntry[],
  voteType: VoteType = defaultVoteType
) {
  return voteEntries.find((entry) => {
    return (
      entry.fixtureId === fixtureId &&
      entry.playerId === playerId &&
      normalizeVoteType(entry.voteType) === voteType
    );
  })?.points ?? 0;
}

export function getPlayersForFixtureVotes(
  fixtureId: string,
  players: Player[],
  voteEntries: VoteEntry[],
  voteType: VoteType = defaultVoteType
): PlayerWithVotes[] {
  return players.map((player) => {
    return {
      ...player,
      points: getVotePointsForPlayer(fixtureId, player.id, voteEntries, voteType),
    };
  });
}

export function upsertVoteEntry(
  voteEntries: VoteEntry[],
  fixtureId: string,
  playerId: string,
  voteType: VoteType,
  points: number
) {
  const nextEntries = voteEntries.filter((entry) => {
    return !(
      entry.fixtureId === fixtureId &&
      entry.playerId === playerId &&
      normalizeVoteType(entry.voteType) === voteType
    );
  });

  if (points > 0) {
    nextEntries.push({ fixtureId, playerId, voteType, points });
  }

  return nextEntries;
}

export function getVoteLeaderboard(
  players: Player[],
  voteEntries: VoteEntry[],
  voteType: VoteType = defaultVoteType
) {
  return players
    .map((player) => {
      const totalPoints = voteEntries
        .filter((entry) => {
          return entry.playerId === player.id && normalizeVoteType(entry.voteType) === voteType;
        })
        .reduce((sum, entry) => sum + entry.points, 0);

      return {
        ...player,
        totalPoints,
      };
    })
    .sort((left, right) => {
      return (
        right.totalPoints - left.totalPoints ||
        getPlayerSortValue(left.number) - getPlayerSortValue(right.number)
      );
    });
}

export function getFixtureVoteTotal(
  fixtureId: string,
  voteEntries: VoteEntry[],
  voteType: VoteType = defaultVoteType
) {
  return voteEntries
    .filter((entry) => {
      return entry.fixtureId === fixtureId && normalizeVoteType(entry.voteType) === voteType;
    })
    .reduce((sum, entry) => sum + entry.points, 0);
}

export function deleteVoteEntriesForPlayer(voteEntries: VoteEntry[], playerId: string) {
  return voteEntries.filter((entry) => {
    return entry.playerId !== playerId;
  });
}

export function deleteVoteEntriesForFixture(voteEntries: VoteEntry[], fixtureId: string) {
  return voteEntries.filter((entry) => {
    return entry.fixtureId !== fixtureId;
  });
}
