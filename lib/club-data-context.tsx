import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { normalizeClubDataSnapshot, seedClubDataSnapshot, type ClubDataSnapshot } from '@/lib/club-data-snapshot';
import { useClubAccess } from '@/lib/club-access-context';
import { useAuth } from '@/lib/auth-context';
import { loadFines, saveFines } from '@/lib/storage/fines-storage';
import { loadMatchStats, saveMatchStats } from '@/lib/storage/match-stats-storage';
import { loadAttendanceRecords, saveAttendanceRecords } from '@/lib/storage/attendance-storage';
import { loadAvailabilityRecords, saveAvailabilityRecords } from '@/lib/storage/availability-storage';
import { loadFitnessResults, saveFitnessResults } from '@/lib/storage/fitness-results-storage';
import { loadCloudCoreData, saveCloudCoreData } from '@/lib/storage/cloud-core-data-storage';
import { loadFixtures, saveFixtures } from '@/lib/storage/fixtures-storage';
import { loadPlayers, savePlayers } from '@/lib/storage/players-storage';
import { loadTrainingSessions, saveTrainingSessions } from '@/lib/storage/training-sessions-storage';
import { loadVoteEntries, saveVoteEntries } from '@/lib/storage/votes-storage';
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

type ClubDataContextValue = {
  fixtures: Fixture[];
  setFixtures: React.Dispatch<React.SetStateAction<Fixture[]>>;
  trainingSessions: TrainingSession[];
  setTrainingSessions: React.Dispatch<React.SetStateAction<TrainingSession[]>>;
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  availabilityRecords: AvailabilityRecord[];
  setAvailabilityRecords: React.Dispatch<React.SetStateAction<AvailabilityRecord[]>>;
  matchStats: MatchStatEntry[];
  setMatchStats: React.Dispatch<React.SetStateAction<MatchStatEntry[]>>;
  fitnessResults: FitnessResult[];
  setFitnessResults: React.Dispatch<React.SetStateAction<FitnessResult[]>>;
  fines: Fine[];
  setFines: React.Dispatch<React.SetStateAction<Fine[]>>;
  voteEntries: VoteEntry[];
  setVoteEntries: React.Dispatch<React.SetStateAction<VoteEntry[]>>;
  isHydrated: boolean;
  storageMode: 'local' | 'cloud';
};

const ClubDataContext = createContext<ClubDataContextValue | null>(null);

export function ClubDataProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const { activeClubId, isLoading: isClubAccessLoading } = useClubAccess();
  const [fixtures, setFixtures] = useState(seedClubDataSnapshot.fixtures);
  const [trainingSessions, setTrainingSessions] = useState(seedClubDataSnapshot.trainingSessions);
  const [attendanceRecords, setAttendanceRecords] = useState(seedClubDataSnapshot.attendanceRecords);
  const [players, setPlayers] = useState(seedClubDataSnapshot.players);
  const [availabilityRecords, setAvailabilityRecords] = useState(seedClubDataSnapshot.availabilityRecords);
  const [matchStats, setMatchStats] = useState(seedClubDataSnapshot.matchStats);
  const [fitnessResults, setFitnessResults] = useState(seedClubDataSnapshot.fitnessResults);
  const [fines, setFines] = useState(seedClubDataSnapshot.fines);
  const [voteEntries, setVoteEntries] = useState(seedClubDataSnapshot.voteEntries);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCloudSyncReady, setIsCloudSyncReady] = useState(!isConfigured);

  function applySnapshot(snapshot: ClubDataSnapshot) {
    setFixtures(snapshot.fixtures);
    setTrainingSessions(snapshot.trainingSessions);
    setAttendanceRecords(snapshot.attendanceRecords);
    setPlayers(snapshot.players);
    setAvailabilityRecords(snapshot.availabilityRecords);
    setMatchStats(snapshot.matchStats);
    setFitnessResults(snapshot.fitnessResults);
    setFines(snapshot.fines);
    setVoteEntries(snapshot.voteEntries);
  }

  useEffect(() => {
    if (isAuthLoading || isClubAccessLoading) {
      return;
    }

    let isMounted = true;
    setIsHydrated(false);
    setIsCloudSyncReady(!isConfigured || !activeClubId);

    async function hydrate() {
      try {
        const [
          storedFixtures,
          storedTrainingSessions,
          storedAttendance,
          storedPlayers,
          storedAvailability,
          storedMatchStats,
          storedFitnessResults,
          storedFines,
          storedVoteEntries,
        ] = await Promise.all([
          loadFixtures(),
          loadTrainingSessions(),
          loadAttendanceRecords(),
          loadPlayers(),
          loadAvailabilityRecords(),
          loadMatchStats(),
          loadFitnessResults(),
          loadFines(),
          loadVoteEntries(),
        ]);

        const localSnapshot = normalizeClubDataSnapshot({
          fixtures: storedFixtures,
          trainingSessions: storedTrainingSessions,
          attendanceRecords: storedAttendance,
          players: storedPlayers,
          availabilityRecords: storedAvailability,
          matchStats: storedMatchStats,
          fitnessResults: storedFitnessResults,
          fines: storedFines,
          voteEntries: storedVoteEntries,
        });

        let nextSnapshot = localSnapshot;

        if (isConfigured && activeClubId) {
          try {
            const remoteCoreData = await loadCloudCoreData(activeClubId);

            if (remoteCoreData) {
              nextSnapshot = normalizeClubDataSnapshot({
                ...localSnapshot,
                ...remoteCoreData,
              });
            }

            if (isMounted) {
              setIsCloudSyncReady(true);
            }
          } catch (error: unknown) {
            console.warn('Failed to load cloud club data', error);

            if (isMounted) {
              setIsCloudSyncReady(false);
            }
          }
        } else if (isMounted) {
          setIsCloudSyncReady(true);
        }

        if (!isMounted) {
          return;
        }

        applySnapshot(nextSnapshot);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [activeClubId, isAuthLoading, isClubAccessLoading, isConfigured]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveFixtures(fixtures).catch((error: unknown) => {
      console.warn('Failed to save fixtures', error);
    });
  }, [fixtures, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveTrainingSessions(trainingSessions).catch((error: unknown) => {
      console.warn('Failed to save training sessions', error);
    });
  }, [trainingSessions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveAttendanceRecords(attendanceRecords).catch((error: unknown) => {
      console.warn('Failed to save attendance records', error);
    });
  }, [attendanceRecords, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    savePlayers(players).catch((error: unknown) => {
      console.warn('Failed to save players', error);
    });
  }, [players, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveAvailabilityRecords(availabilityRecords).catch((error: unknown) => {
      console.warn('Failed to save availability records', error);
    });
  }, [availabilityRecords, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveMatchStats(matchStats).catch((error: unknown) => {
      console.warn('Failed to save match stats', error);
    });
  }, [isHydrated, matchStats]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveFitnessResults(fitnessResults).catch((error: unknown) => {
      console.warn('Failed to save fitness results', error);
    });
  }, [fitnessResults, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveFines(fines).catch((error: unknown) => {
      console.warn('Failed to save fines', error);
    });
  }, [fines, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveVoteEntries(voteEntries).catch((error: unknown) => {
      console.warn('Failed to save vote entries', error);
    });
  }, [voteEntries, isHydrated]);

  const cloudCoreData = useMemo(() => {
    return {
      players,
      trainingSessions,
      attendanceRecords,
      fixtures,
      availabilityRecords,
      matchStats,
      voteEntries,
      fitnessResults,
    };
  }, [
    players,
    trainingSessions,
    attendanceRecords,
    fixtures,
    availabilityRecords,
    matchStats,
    voteEntries,
    fitnessResults,
  ]);

  useEffect(() => {
    if (!isHydrated || !isConfigured || !activeClubId || !isCloudSyncReady) {
      return;
    }

    saveCloudCoreData(activeClubId, cloudCoreData).catch((error: unknown) => {
      console.warn('Failed to save cloud core data', error);
    });
  }, [activeClubId, cloudCoreData, isCloudSyncReady, isConfigured, isHydrated]);

  const value = useMemo<ClubDataContextValue>(() => {
    return {
      fixtures,
      setFixtures,
      trainingSessions,
      setTrainingSessions,
      attendanceRecords,
      setAttendanceRecords,
      players,
      setPlayers,
      availabilityRecords,
      setAvailabilityRecords,
      matchStats,
      setMatchStats,
      fitnessResults,
      setFitnessResults,
      fines,
      setFines,
      voteEntries,
      setVoteEntries,
      isHydrated,
      storageMode: isConfigured && activeClubId ? 'cloud' : 'local',
    };
  }, [
    fixtures,
    trainingSessions,
    attendanceRecords,
    players,
    availabilityRecords,
    matchStats,
    fitnessResults,
    fines,
    voteEntries,
    isHydrated,
    activeClubId,
    isConfigured,
  ]);

  return <ClubDataContext.Provider value={value}>{children}</ClubDataContext.Provider>;
}

export function useClubData() {
  const context = useContext(ClubDataContext);

  if (!context) {
    throw new Error('useClubData must be used within ClubDataProvider');
  }

  return context;
}
