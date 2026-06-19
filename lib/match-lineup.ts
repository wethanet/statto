import type {
  AvailabilityRecord,
  AvailabilityStatus,
  MatchLinePosition,
  MatchLineupAssignment,
} from '@/lib/types';

export const matchLinePositions: MatchLinePosition[] = ['B', 'HB', 'W', 'C', 'HF', 'F', 'Fol', 'Int'];

const availabilityStatuses: AvailabilityStatus[] = ['available', 'unavailable', 'uncertain'];

function isMatchLinePosition(value: unknown): value is MatchLinePosition {
  return typeof value === 'string' && matchLinePositions.includes(value as MatchLinePosition);
}

function normalizeAvailabilityStatus(value: unknown): AvailabilityStatus {
  return typeof value === 'string' && availabilityStatuses.includes(value as AvailabilityStatus)
    ? (value as AvailabilityStatus)
    : 'available';
}

export function normalizeMatchLineupAssignment(
  assignment: Partial<MatchLineupAssignment>
): MatchLineupAssignment | null {
  if (!assignment.fixtureId || !assignment.playerId) {
    return null;
  }

  const availabilityStatus = normalizeAvailabilityStatus(assignment.availabilityStatus);
  const position =
    availabilityStatus === 'available' && isMatchLinePosition(assignment.position)
      ? assignment.position
      : null;

  return {
    fixtureId: assignment.fixtureId,
    playerId: assignment.playerId,
    position,
    availabilityStatus,
  };
}

export function normalizeMatchLineupAssignments(assignments: Partial<MatchLineupAssignment>[]) {
  return assignments
    .map(normalizeMatchLineupAssignment)
    .filter((assignment): assignment is MatchLineupAssignment => assignment !== null);
}

export function getAvailabilityRecordsFromMatchLineupAssignments(
  assignments: MatchLineupAssignment[]
): AvailabilityRecord[] {
  return normalizeMatchLineupAssignments(assignments).map((assignment) => ({
    fixtureId: assignment.fixtureId,
    playerId: assignment.playerId,
    status: assignment.availabilityStatus,
  }));
}

export function mergeAvailabilityRecordsIntoMatchLineupAssignments(
  assignments: MatchLineupAssignment[],
  records: AvailabilityRecord[]
) {
  const nextAssignments = new Map(
    normalizeMatchLineupAssignments(assignments).map((assignment) => [
      `${assignment.fixtureId}::${assignment.playerId}`,
      assignment,
    ])
  );

  records.forEach((record) => {
    const availabilityStatus = normalizeAvailabilityStatus(record.status);
    const key = `${record.fixtureId}::${record.playerId}`;
    const existing = nextAssignments.get(key);

    nextAssignments.set(key, {
      fixtureId: record.fixtureId,
      playerId: record.playerId,
      position: availabilityStatus === 'available' ? existing?.position ?? null : null,
      availabilityStatus,
    });
  });

  return Array.from(nextAssignments.values());
}

export function applyAvailabilityRecordsToMatchLineupAssignments(
  assignments: MatchLineupAssignment[],
  records: AvailabilityRecord[]
) {
  const nextRecordKeys = new Set(records.map((record) => `${record.fixtureId}::${record.playerId}`));
  const retainedAssignments = normalizeMatchLineupAssignments(assignments).filter((assignment) => {
    return nextRecordKeys.has(`${assignment.fixtureId}::${assignment.playerId}`);
  });

  return mergeAvailabilityRecordsIntoMatchLineupAssignments(retainedAssignments, records);
}

export function getMatchLineupPosition(
  fixtureId: string,
  playerId: string,
  assignments: MatchLineupAssignment[]
) {
  return assignments.find((assignment) => {
    return assignment.fixtureId === fixtureId && assignment.playerId === playerId;
  })?.position ?? null;
}

export function getPlayersForFixtureLineup<T extends { id: string }>(
  fixtureId: string,
  players: T[],
  assignments: MatchLineupAssignment[]
) {
  return players.map((player) => {
    return {
      ...player,
      matchPosition: getMatchLineupPosition(fixtureId, player.id, assignments),
    };
  });
}

export function upsertMatchLineupAssignment(
  assignments: MatchLineupAssignment[],
  fixtureId: string,
  playerId: string,
  position: MatchLinePosition
) {
  const nextAssignments = assignments.filter((assignment) => {
    return !(assignment.fixtureId === fixtureId && assignment.playerId === playerId);
  });

  nextAssignments.push({
    fixtureId,
    playerId,
    position,
    availabilityStatus: 'available',
  });

  return nextAssignments;
}

export function clearMatchLineupAssignmentPosition(
  assignments: MatchLineupAssignment[],
  fixtureId: string,
  playerId: string
): MatchLineupAssignment[] {
  return normalizeMatchLineupAssignments(assignments).map((assignment) => {
    if (assignment.fixtureId !== fixtureId || assignment.playerId !== playerId) {
      return assignment;
    }

    return {
      ...assignment,
      position: null,
      availabilityStatus: 'available' as const,
    };
  });
}

export function deleteMatchLineupAssignment(
  assignments: MatchLineupAssignment[],
  fixtureId: string,
  playerId: string
) {
  return assignments.filter((assignment) => {
    return !(assignment.fixtureId === fixtureId && assignment.playerId === playerId);
  });
}

export function deleteMatchLineupAssignmentsForFixture(
  assignments: MatchLineupAssignment[],
  fixtureId: string
) {
  return assignments.filter((assignment) => {
    return assignment.fixtureId !== fixtureId;
  });
}

export function deleteMatchLineupAssignmentsForPlayer(
  assignments: MatchLineupAssignment[],
  playerId: string
) {
  return assignments.filter((assignment) => {
    return assignment.playerId !== playerId;
  });
}
