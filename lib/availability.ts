import type { AvailabilityRecord, AvailabilityStatus, Fixture, Player, PlayerSquad } from '@/lib/types';
import { normalizePlayerSquad } from '@/lib/team';

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

function getFixtureDayKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getSortedFixtures(fixtures: Fixture[]) {
  return byDateAscending(fixtures);
}

export function getFixtureById(fixtureId: string, fixtures: Fixture[]) {
  return fixtures.find((fixture) => {
    return fixture.id === fixtureId;
  });
}

export function getNextFixture(fixtures: Fixture[]) {
  const sortedFixtures = getSortedFixtures(fixtures);

  return sortedFixtures.find((fixture) => {
    return new Date(fixture.date).getTime() >= Date.now();
  }) ?? sortedFixtures[0];
}

export function addFixture(
  fixtures: Fixture[],
  input: {
    opponent: string;
    grade?: string | null;
    squad?: PlayerSquad | null;
    date: string;
    venue: string;
    isHome: boolean;
  }
) {
  const fixture: Fixture = {
    id: `fx-${Date.now()}`,
    opponent: input.opponent.trim(),
    grade: input.grade?.trim() || null,
    squad: input.squad ?? null,
    date: input.date,
    venue: input.venue.trim(),
    isHome: input.isHome,
  };

  return [...fixtures, fixture];
}

export function updateFixture(
  fixtures: Fixture[],
  fixtureId: string,
  input: {
    opponent: string;
    grade?: string | null;
    squad?: PlayerSquad | null;
    date: string;
    venue: string;
    isHome: boolean;
  }
) {
  return fixtures.map((fixture) => {
    if (fixture.id !== fixtureId) {
      return fixture;
    }

    return {
      ...fixture,
      opponent: input.opponent.trim(),
      grade: input.grade?.trim() || null,
      squad: input.squad ?? null,
      date: input.date,
      venue: input.venue.trim(),
      isHome: input.isHome,
    };
  });
}

export function deleteFixture(fixtures: Fixture[], fixtureId: string) {
  return fixtures.filter((fixture) => {
    return fixture.id !== fixtureId;
  });
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

export function isPlayerSelectedInOtherSameDayFixture(
  fixtureId: string,
  playerId: string,
  fixtures: Fixture[],
  records: AvailabilityRecord[]
) {
  const currentFixture = getFixtureById(fixtureId, fixtures);

  if (!currentFixture) {
    return false;
  }

  const currentDayKey = getFixtureDayKey(currentFixture.date);

  return fixtures.some((fixture) => {
    return (
      fixture.id !== fixtureId &&
      getFixtureDayKey(fixture.date) === currentDayKey &&
      getAvailabilityStatusForPlayer(fixture.id, playerId, records) === 'available'
    );
  });
}

export function upsertAvailabilityRecord(
  records: AvailabilityRecord[],
  fixtureId: string,
  playerId: string,
  status: AvailabilityStatus
) {
  const nextRecords = records.filter((record) => {
    return !(record.fixtureId === fixtureId && record.playerId === playerId);
  });

  nextRecords.push({ fixtureId, playerId, status });

  return nextRecords;
}

export function getDefaultFixtureSquad(grade: Fixture['grade']): PlayerSquad | null {
  const normalizedGrade = grade?.trim().toLowerCase() ?? '';

  if (normalizedGrade.includes('cup')) {
    return 'cup';
  }

  if (normalizedGrade.includes('plate')) {
    return 'plate';
  }

  return null;
}

export function normalizeFixtureSquad(fixture: Pick<Fixture, 'grade' | 'squad'>): PlayerSquad | null {
  return fixture.squad ?? normalizePlayerSquad(fixture.grade);
}

export function applyDefaultAvailabilityForFixture(
  records: AvailabilityRecord[],
  fixture: Fixture,
  players: Player[]
) {
  const squad = normalizeFixtureSquad(fixture);

  if (!squad) {
    return { records, squad: null, selectedCount: 0 };
  }

  const nextRecords = players.reduce<AvailabilityRecord[]>((current, player) => {
    const status: AvailabilityStatus =
      !player.active ? 'uncertain' : player.squad === squad ? 'available' : 'uncertain';

    return upsertAvailabilityRecord(current, fixture.id, player.id, status);
  }, records);

  const selectedCount = players.filter((player) => {
    return player.active && player.squad === squad;
  }).length;

  return { records: nextRecords, squad, selectedCount };
}

export function deleteAvailabilityRecordsForPlayer(records: AvailabilityRecord[], playerId: string) {
  return records.filter((record) => {
    return record.playerId !== playerId;
  });
}

export function deleteAvailabilityRecordsForFixture(records: AvailabilityRecord[], fixtureId: string) {
  return records.filter((record) => {
    return record.fixtureId !== fixtureId;
  });
}
