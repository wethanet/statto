import {
  attendanceRecords,
  availabilityRecords,
  fitnessResults,
  fixtures,
  fines,
  players,
  trainingSessions,
  voteEntries,
} from '@/lib/mock-data';
import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fine,
  Fixture,
  Player,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';

export type ClubDataSnapshot = {
  fixtures: Fixture[];
  trainingSessions: TrainingSession[];
  attendanceRecords: AttendanceRecord[];
  players: Player[];
  availabilityRecords: AvailabilityRecord[];
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
    players: asList(snapshot?.players, seedClubDataSnapshot.players),
    availabilityRecords: asList(snapshot?.availabilityRecords, seedClubDataSnapshot.availabilityRecords),
    fitnessResults: asList(snapshot?.fitnessResults, seedClubDataSnapshot.fitnessResults),
    fines: asList(snapshot?.fines, seedClubDataSnapshot.fines),
    voteEntries: asList(snapshot?.voteEntries, seedClubDataSnapshot.voteEntries),
  } satisfies ClubDataSnapshot;
}
