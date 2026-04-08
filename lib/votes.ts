import { getPlayerSortValue } from '@/lib/team';
import type { Player, VoteEntry } from '@/lib/types';

type PlayerWithVotes = Player & {
  points: number;
};

export function getVotePointsForPlayer(
  fixtureId: string,
  playerId: string,
  voteEntries: VoteEntry[]
) {
  return voteEntries.find((entry) => {
    return entry.fixtureId === fixtureId && entry.playerId === playerId;
  })?.points ?? 0;
}

export function getPlayersForFixtureVotes(
  fixtureId: string,
  players: Player[],
  voteEntries: VoteEntry[]
): PlayerWithVotes[] {
  return players.map((player) => {
    return {
      ...player,
      points: getVotePointsForPlayer(fixtureId, player.id, voteEntries),
    };
  });
}

export function upsertVoteEntry(
  voteEntries: VoteEntry[],
  fixtureId: string,
  playerId: string,
  points: number
) {
  const nextEntries = voteEntries.filter((entry) => {
    return !(entry.fixtureId === fixtureId && entry.playerId === playerId);
  });

  if (points > 0) {
    nextEntries.push({ fixtureId, playerId, points });
  }

  return nextEntries;
}

export function getVoteLeaderboard(players: Player[], voteEntries: VoteEntry[]) {
  return players
    .map((player) => {
      const totalPoints = voteEntries
        .filter((entry) => entry.playerId === player.id)
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

export function getFixtureVoteTotal(fixtureId: string, voteEntries: VoteEntry[]) {
  return voteEntries
    .filter((entry) => entry.fixtureId === fixtureId)
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
