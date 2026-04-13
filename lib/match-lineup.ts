import type { MatchLinePosition, MatchLineupAssignment } from '@/lib/types';

export const matchLinePositions: MatchLinePosition[] = ['B', 'HB', 'W', 'C', 'HF', 'F', 'Fol', 'Int'];

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
  });

  return nextAssignments;
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
