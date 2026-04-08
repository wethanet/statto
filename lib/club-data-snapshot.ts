import {
  attendanceRecords,
  availabilityRecords,
  fixtures,
  fines,
  players,
  trainingSessions,
  voteEntries,
} from '@/lib/mock-data';
import type {
  AttendanceRecord,
  AvailabilityRecord,
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
  fines: Fine[];
  voteEntries: VoteEntry[];
};

export const seedClubDataSnapshot: ClubDataSnapshot = {
  fixtures,
  trainingSessions,
  attendanceRecords,
  players,
  availabilityRecords,
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
    fines: asList(snapshot?.fines, seedClubDataSnapshot.fines),
    voteEntries: asList(snapshot?.voteEntries, seedClubDataSnapshot.voteEntries),
  } satisfies ClubDataSnapshot;
}
