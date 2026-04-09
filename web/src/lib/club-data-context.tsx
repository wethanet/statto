import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createDemoClubDataSnapshot,
  emptyClubDataSnapshot,
  normalizeClubDataSnapshot,
  type ClubDataSnapshot,
} from '@/lib/club-data-snapshot';
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

import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import {
  loadCloudCoreData,
  saveCloudCoreData,
  type CloudCoreData,
} from '@web/lib/storage/cloud-core-data-storage';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';

type ClubDataContextValue = {
  fixtures: Fixture[];
  setFixtures: Dispatch<SetStateAction<Fixture[]>>;
  trainingSessions: TrainingSession[];
  setTrainingSessions: Dispatch<SetStateAction<TrainingSession[]>>;
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: Dispatch<SetStateAction<AttendanceRecord[]>>;
  players: Player[];
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  availabilityRecords: AvailabilityRecord[];
  setAvailabilityRecords: Dispatch<SetStateAction<AvailabilityRecord[]>>;
  matchStats: MatchStatEntry[];
  setMatchStats: Dispatch<SetStateAction<MatchStatEntry[]>>;
  fitnessResults: FitnessResult[];
  setFitnessResults: Dispatch<SetStateAction<FitnessResult[]>>;
  fines: Fine[];
  setFines: Dispatch<SetStateAction<Fine[]>>;
  voteEntries: VoteEntry[];
  setVoteEntries: Dispatch<SetStateAction<VoteEntry[]>>;
  loadDemoData: () => void;
  isHydrated: boolean;
  storageMode: 'local' | 'cloud';
};

const STORAGE_KEYS = {
  fixtures: 'fixtures.json',
  trainingSessions: 'training-sessions.json',
  attendanceRecords: 'attendance-records.json',
  players: 'players.json',
  availabilityRecords: 'availability-records.json',
  matchStats: 'match-stats.json',
  fitnessResults: 'fitness-results.json',
  fines: 'fines.json',
  voteEntries: 'vote-entries.json',
} as const;

const ClubDataContext = createContext<ClubDataContextValue | null>(null);

async function loadLocalSnapshot() {
  const [
    fixtures,
    trainingSessions,
    attendanceRecords,
    players,
    availabilityRecords,
    matchStats,
    fitnessResults,
    fines,
    voteEntries,
  ] = await Promise.all([
    readJsonStorage<Fixture[]>(STORAGE_KEYS.fixtures),
    readJsonStorage<TrainingSession[]>(STORAGE_KEYS.trainingSessions),
    readJsonStorage<AttendanceRecord[]>(STORAGE_KEYS.attendanceRecords),
    readJsonStorage<Player[]>(STORAGE_KEYS.players),
    readJsonStorage<AvailabilityRecord[]>(STORAGE_KEYS.availabilityRecords),
    readJsonStorage<MatchStatEntry[]>(STORAGE_KEYS.matchStats),
    readJsonStorage<FitnessResult[]>(STORAGE_KEYS.fitnessResults),
    readJsonStorage<Fine[]>(STORAGE_KEYS.fines),
    readJsonStorage<VoteEntry[]>(STORAGE_KEYS.voteEntries),
  ]);

  return normalizeClubDataSnapshot({
    fixtures: fixtures ?? undefined,
    trainingSessions: trainingSessions ?? undefined,
    attendanceRecords: attendanceRecords ?? undefined,
    players: players ?? undefined,
    availabilityRecords: availabilityRecords ?? undefined,
    matchStats: matchStats ?? undefined,
    fitnessResults: fitnessResults ?? undefined,
    fines: fines ?? undefined,
    voteEntries: voteEntries ?? undefined,
  });
}

async function saveLocalSnapshot(snapshot: ClubDataSnapshot) {
  await Promise.all([
    writeJsonStorage(STORAGE_KEYS.fixtures, snapshot.fixtures),
    writeJsonStorage(STORAGE_KEYS.trainingSessions, snapshot.trainingSessions),
    writeJsonStorage(STORAGE_KEYS.attendanceRecords, snapshot.attendanceRecords),
    writeJsonStorage(STORAGE_KEYS.players, snapshot.players),
    writeJsonStorage(STORAGE_KEYS.availabilityRecords, snapshot.availabilityRecords),
    writeJsonStorage(STORAGE_KEYS.matchStats, snapshot.matchStats),
    writeJsonStorage(STORAGE_KEYS.fitnessResults, snapshot.fitnessResults),
    writeJsonStorage(STORAGE_KEYS.fines, snapshot.fines),
    writeJsonStorage(STORAGE_KEYS.voteEntries, snapshot.voteEntries),
  ]);
}

export function ClubDataProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const { activeClubId, isLoading: isClubAccessLoading } = useClubAccess();
  const [fixtures, setFixtures] = useState(emptyClubDataSnapshot.fixtures);
  const [trainingSessions, setTrainingSessions] = useState(emptyClubDataSnapshot.trainingSessions);
  const [attendanceRecords, setAttendanceRecords] = useState(emptyClubDataSnapshot.attendanceRecords);
  const [players, setPlayers] = useState(emptyClubDataSnapshot.players);
  const [availabilityRecords, setAvailabilityRecords] = useState(emptyClubDataSnapshot.availabilityRecords);
  const [matchStats, setMatchStats] = useState(emptyClubDataSnapshot.matchStats);
  const [fitnessResults, setFitnessResults] = useState(emptyClubDataSnapshot.fitnessResults);
  const [fines, setFines] = useState(emptyClubDataSnapshot.fines);
  const [voteEntries, setVoteEntries] = useState(emptyClubDataSnapshot.voteEntries);
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

  function loadDemoData() {
    applySnapshot(createDemoClubDataSnapshot());
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
        const localSnapshot = await loadLocalSnapshot();
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

  const snapshot = useMemo<ClubDataSnapshot>(() => {
    return {
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
  ]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveLocalSnapshot(snapshot).catch((error: unknown) => {
      console.warn('Failed to save local club data', error);
    });
  }, [isHydrated, snapshot]);

  const cloudCoreData = useMemo<CloudCoreData>(() => {
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
      loadDemoData,
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
    loadDemoData,
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
