import type { MatchRotationAssignment, PlayerRotationGroup } from '@/lib/types';

export const matchRotationGroups: PlayerRotationGroup[] = [
  'inside-mids',
  'running-players',
  'key-position-players',
  'utility-players',
];

export function getMatchRotationAssignment(
  fixtureId: string,
  playerId: string,
  assignments: MatchRotationAssignment[]
) {
  return (
    assignments.find((assignment) => {
      return assignment.fixtureId === fixtureId && assignment.playerId === playerId;
    }) ?? null
  );
}

export function upsertMatchRotationAssignment(
  assignments: MatchRotationAssignment[],
  fixtureId: string,
  playerId: string,
  group: PlayerRotationGroup
) {
  const nextAssignments = assignments.filter((assignment) => {
    return !(assignment.fixtureId === fixtureId && assignment.playerId === playerId);
  });

  nextAssignments.push({
    fixtureId,
    playerId,
    group,
  });

  return nextAssignments;
}

export function deleteMatchRotationAssignment(
  assignments: MatchRotationAssignment[],
  fixtureId: string,
  playerId: string
) {
  return assignments.filter((assignment) => {
    return !(assignment.fixtureId === fixtureId && assignment.playerId === playerId);
  });
}

export function deleteMatchRotationAssignmentsForFixture(
  assignments: MatchRotationAssignment[],
  fixtureId: string
) {
  return assignments.filter((assignment) => {
    return assignment.fixtureId !== fixtureId;
  });
}

export function deleteMatchRotationAssignmentsForPlayer(
  assignments: MatchRotationAssignment[],
  playerId: string
) {
  return assignments.filter((assignment) => {
    return assignment.playerId !== playerId;
  });
}
