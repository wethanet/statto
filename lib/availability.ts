import type { AvailabilityRecord, AvailabilityStatus, Fixture, Player } from '@/lib/types';

type AvailabilitySummary = {
  available: number;
  unavailable: number;
  uncertain: number;
};

function byDateAscending<T extends { date: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    return new Date(left.date).getTime() - new Date(right.date).getTime();
  });
}

export function getSortedFixtures(fixtures: Fixture[]) {
  return byDateAscending(fixtures);
}

export function getNextFixture(fixtures: Fixture[]) {
  return getSortedFixtures(fixtures).find((fixture) => {
    return new Date(fixture.date).getTime() >= Date.now();
  }) ?? getSortedFixtures(fixtures)[0];
}

export function getAvailabilityStatusForPlayer(
  fixtureId: string,
  playerId: string,
  records: AvailabilityRecord[]
): AvailabilityStatus {
  return records.find((record) => {
    return record.fixtureId === fixtureId && record.playerId === playerId;
  })?.status ?? 'uncertain';
}

export function getAvailabilitySummary(
  fixtureId: string,
  players: Player[],
  records: AvailabilityRecord[]
): AvailabilitySummary {
  return players.reduce<AvailabilitySummary>(
    (summary, player) => {
      const status = getAvailabilityStatusForPlayer(fixtureId, player.id, records);
      summary[status] += 1;
      return summary;
    },
    { available: 0, unavailable: 0, uncertain: 0 }
  );
}

export function getPlayersForFixture(
  fixtureId: string,
  players: Player[],
  records: AvailabilityRecord[]
) {
  return players.map((player) => {
    return {
      ...player,
      availabilityStatus: getAvailabilityStatusForPlayer(fixtureId, player.id, records),
    };
  });
}
