import {
  attendanceRecords,
  availabilityRecords,
  fitnessResults,
  fixtures,
  fines,
  matchStats,
  matchLineupAssignments,
  players,
  trainingSessions,
  voteEntries,
} from '@/lib/mock-data';
import { normalizeMatchStats } from '@/lib/match-stats';
import { normalizeVoteEntries } from '@/lib/votes';
import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fine,
  Fixture,
  MatchStatEntry,
  MatchLineupAssignment,
  Player,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';
import { normalizePlayers } from '@/lib/team';

export type ClubDataSnapshot = {
  fixtures: Fixture[];
  trainingSessions: TrainingSession[];
  attendanceRecords: AttendanceRecord[];
  players: Player[];
  availabilityRecords: AvailabilityRecord[];
  matchStats: MatchStatEntry[];
  matchLineupAssignments: MatchLineupAssignment[];
  fitnessResults: FitnessResult[];
  fines: Fine[];
  voteEntries: VoteEntry[];
};

export const emptyClubDataSnapshot: ClubDataSnapshot = {
  fixtures: [],
  trainingSessions: [],
  attendanceRecords: [],
  players: [],
  availabilityRecords: [],
  matchStats: [],
  matchLineupAssignments: [],
  fitnessResults: [],
  fines: [],
  voteEntries: [],
};

function cloneList<T>(items: T[]) {
  return items.map((item) => {
    if (item && typeof item === 'object') {
      return { ...(item as Record<string, unknown>) } as T;
    }

    return item;
  });
}

export function createDemoClubDataSnapshot(): ClubDataSnapshot {
  return {
    fixtures: cloneList(fixtures),
    trainingSessions: cloneList(trainingSessions),
    attendanceRecords: cloneList(attendanceRecords),
    players: normalizePlayers(cloneList(players)),
    availabilityRecords: cloneList(availabilityRecords),
    matchStats: normalizeMatchStats(cloneList(matchStats)),
    matchLineupAssignments: cloneList(matchLineupAssignments),
    fitnessResults: cloneList(fitnessResults),
    fines: cloneList(fines),
    voteEntries: normalizeVoteEntries(cloneList(voteEntries)),
  };
}

function asList<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function normalizeClubDataSnapshot(snapshot: Partial<ClubDataSnapshot> | null | undefined) {
  return {
    fixtures: asList(snapshot?.fixtures, emptyClubDataSnapshot.fixtures),
    trainingSessions: asList(snapshot?.trainingSessions, emptyClubDataSnapshot.trainingSessions),
    attendanceRecords: asList(snapshot?.attendanceRecords, emptyClubDataSnapshot.attendanceRecords),
    players: normalizePlayers(asList(snapshot?.players, emptyClubDataSnapshot.players)),
    availabilityRecords: asList(snapshot?.availabilityRecords, emptyClubDataSnapshot.availabilityRecords),
    matchStats: normalizeMatchStats(asList(snapshot?.matchStats, emptyClubDataSnapshot.matchStats)),
    matchLineupAssignments: asList(
      snapshot?.matchLineupAssignments,
      emptyClubDataSnapshot.matchLineupAssignments
    ),
    fitnessResults: asList(snapshot?.fitnessResults, emptyClubDataSnapshot.fitnessResults),
    fines: asList(snapshot?.fines, emptyClubDataSnapshot.fines),
    voteEntries: normalizeVoteEntries(asList(snapshot?.voteEntries, emptyClubDataSnapshot.voteEntries)),
  } satisfies ClubDataSnapshot;
}
