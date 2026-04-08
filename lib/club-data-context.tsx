import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { normalizeClubDataSnapshot, seedClubDataSnapshot, type ClubDataSnapshot } from '@/lib/club-data-snapshot';
import { useClubAccess } from '@/lib/club-access-context';
import { useAuth } from '@/lib/auth-context';
import { loadFines, saveFines } from '@/lib/storage/fines-storage';
import { loadAttendanceRecords, saveAttendanceRecords } from '@/lib/storage/attendance-storage';
import { loadAvailabilityRecords, saveAvailabilityRecords } from '@/lib/storage/availability-storage';
import { loadCloudCoreData, saveCloudCoreData } from '@/lib/storage/cloud-core-data-storage';
import { loadFixtures, saveFixtures } from '@/lib/storage/fixtures-storage';
import { loadPlayers, savePlayers } from '@/lib/storage/players-storage';
import { loadTrainingSessions, saveTrainingSessions } from '@/lib/storage/training-sessions-storage';
import { loadVoteEntries, saveVoteEntries } from '@/lib/storage/votes-storage';
import type {
  AttendanceRecord,
  AvailabilityRecord,
  Fine,
  Fixture,
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
  const [fines, setFines] = useState(seedClubDataSnapshot.fines);
  const [voteEntries, setVoteEntries] = useState(seedClubDataSnapshot.voteEntries);
  const [isHydrated, setIsHydrated] = useState(false);

  function applySnapshot(snapshot: ClubDataSnapshot) {
    setFixtures(snapshot.fixtures);
    setTrainingSessions(snapshot.trainingSessions);
    setAttendanceRecords(snapshot.attendanceRecords);
    setPlayers(snapshot.players);
    setAvailabilityRecords(snapshot.availabilityRecords);
    setFines(snapshot.fines);
    setVoteEntries(snapshot.voteEntries);
  }

  useEffect(() => {
    if (isAuthLoading || isClubAccessLoading) {
      return;
    }

    let isMounted = true;
    setIsHydrated(false);

    async function hydrate() {
      try {
        const [
          storedFixtures,
          storedTrainingSessions,
          storedAttendance,
          storedPlayers,
          storedAvailability,
          storedFines,
          storedVoteEntries,
        ] = await Promise.all([
          loadFixtures(),
          loadTrainingSessions(),
          loadAttendanceRecords(),
          loadPlayers(),
          loadAvailabilityRecords(),
          loadFines(),
          loadVoteEntries(),
        ]);

        const localSnapshot = normalizeClubDataSnapshot({
          fixtures: storedFixtures,
          trainingSessions: storedTrainingSessions,
          attendanceRecords: storedAttendance,
          players: storedPlayers,
          availabilityRecords: storedAvailability,
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
          } catch (error: unknown) {
            console.warn('Failed to load cloud club data', error);
          }
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
      voteEntries,
    };
  }, [players, trainingSessions, attendanceRecords, fixtures, availabilityRecords, voteEntries]);

  useEffect(() => {
    if (!isHydrated || !isConfigured || !activeClubId) {
      return;
    }

    saveCloudCoreData(activeClubId, cloudCoreData).catch((error: unknown) => {
      console.warn('Failed to save cloud core data', error);
    });
  }, [activeClubId, cloudCoreData, isConfigured, isHydrated]);

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
