import {
  attendanceRecords,
  availabilityRecords,
  fitnessResults,
  fixtures,
  fines,
  matchStats,
  players,
  trainingSessions,
  voteEntries,
} from '@/lib/mock-data';
import { normalizeVoteEntries } from '@/lib/votes';
import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fine,
  Fixture,
  MatchStatEntry,
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
  fitnessResults: FitnessResult[];
  fines: Fine[];
  voteEntries: VoteEntry[];
};

export const seedClubDataSnapshot: ClubDataSnapshot = {
  fixtures,
  trainingSessions,
  attendanceRecords,
  players,
  availabilityRecords,
  matchStats,
  fitnessResults,
  fines,
  voteEntries,
};

function asList<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function normalizeClubDataSnapshot(snapshot: Partial<ClubDataSnapshot> | null | undefined) {
  return {
    fixtures: asList(snapshot?.fixtures, seedClubDataSnapshot.fixtures),
    trainingSessions: asList(snapshot?.trainingSessions, seedClubDataSnapshot.trainingSessions),
    attendanceRecords: asList(snapshot?.attendanceRecords, seedClubDataSnapshot.attendanceRecords),
    players: normalizePlayers(asList(snapshot?.players, seedClubDataSnapshot.players)),
    availabilityRecords: asList(snapshot?.availabilityRecords, seedClubDataSnapshot.availabilityRecords),
    matchStats: asList(snapshot?.matchStats, seedClubDataSnapshot.matchStats),
    fitnessResults: asList(snapshot?.fitnessResults, seedClubDataSnapshot.fitnessResults),
    fines: asList(snapshot?.fines, seedClubDataSnapshot.fines),
    voteEntries: normalizeVoteEntries(asList(snapshot?.voteEntries, seedClubDataSnapshot.voteEntries)),
  } satisfies ClubDataSnapshot;
}
