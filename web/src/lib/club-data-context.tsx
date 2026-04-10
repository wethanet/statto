import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  MatchLineupAssignment,
  MatchStatEntry,
  Player,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';

import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import {
  deleteCloudAttendanceRecord,
  deleteCloudAttendanceRecordsForPlayer,
  deleteCloudAttendanceRecordsForSession,
  deleteCloudAvailabilityRecord,
  deleteCloudAvailabilityRecordsForFixture,
  deleteCloudAvailabilityRecordsForPlayer,
  deleteCloudFitnessResultsForPlayer,
  deleteCloudFitnessResult,
  deleteCloudFixture,
  deleteCloudMatchStatEntry,
  deleteCloudMatchLineupAssignment,
  deleteCloudMatchLineupAssignmentsForFixture,
  deleteCloudMatchLineupAssignmentsForPlayer,
  deleteCloudPlayer,
  deleteCloudTrainingSession,
  deleteCloudVoteEntriesForPlayer,
  deleteCloudVoteEntry,
  loadCloudCoreData,
  upsertCloudAttendanceRecord,
  upsertCloudAvailabilityRecord,
  upsertCloudFitnessResult,
  upsertCloudFixture,
  upsertCloudMatchStatEntry,
  upsertCloudMatchLineupAssignment,
  upsertCloudPlayer,
  upsertCloudTrainingSession,
  upsertCloudVoteEntry,
} from '@web/lib/storage/cloud-core-data-storage';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';
import { supabase } from '@web/lib/supabase';

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
  matchLineupAssignments: MatchLineupAssignment[];
  setMatchLineupAssignments: Dispatch<SetStateAction<MatchLineupAssignment[]>>;
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
  matchLineupAssignments: 'match-lineup-assignments.json',
  fitnessResults: 'fitness-results.json',
  fines: 'fines.json',
  voteEntries: 'vote-entries.json',
} as const;

const ClubDataContext = createContext<ClubDataContextValue | null>(null);

const CLOUD_REFRESH_INTERVAL_MS = 60000;
const REALTIME_REFRESH_DEBOUNCE_MS = 400;
const REALTIME_TABLES = [
  'club_players',
  'club_training_sessions',
  'club_attendance_records',
  'club_fixtures',
  'club_availability_records',
  'club_match_stats',
  'club_match_lineup_assignments',
  'club_vote_entries',
  'club_fitness_results',
] as const;

type CollectionConfig<T> = {
  label: string;
  keyOf: (item: T) => string;
  upsertRemote?: (clubId: string, item: T) => Promise<void>;
  deleteRemote?: (clubId: string, item: T) => Promise<void>;
};

function resolveArrayUpdate<T>(update: SetStateAction<T[]>, current: T[]) {
  return typeof update === 'function' ? update(current) : update;
}

function itemChanged<T>(left: T, right: T) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

async function loadLocalSnapshot() {
  const [
    fixtures,
    trainingSessions,
    attendanceRecords,
    players,
    availabilityRecords,
    matchStats,
    matchLineupAssignments,
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
    readJsonStorage<MatchLineupAssignment[]>(STORAGE_KEYS.matchLineupAssignments),
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
    matchLineupAssignments: matchLineupAssignments ?? undefined,
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
    writeJsonStorage(STORAGE_KEYS.matchLineupAssignments, snapshot.matchLineupAssignments),
    writeJsonStorage(STORAGE_KEYS.fitnessResults, snapshot.fitnessResults),
    writeJsonStorage(STORAGE_KEYS.fines, snapshot.fines),
    writeJsonStorage(STORAGE_KEYS.voteEntries, snapshot.voteEntries),
  ]);
}

async function syncCollectionDiff<T>(
  clubId: string,
  current: T[],
  next: T[],
  config: CollectionConfig<T>
) {
  const currentMap = new Map(current.map((item) => [config.keyOf(item), item] as const));
  const nextMap = new Map(next.map((item) => [config.keyOf(item), item] as const));
  const tasks: Promise<void>[] = [];

  if (config.upsertRemote) {
    for (const [key, item] of nextMap.entries()) {
      const previous = currentMap.get(key);

      if (!previous || itemChanged(previous, item)) {
        tasks.push(config.upsertRemote(clubId, item));
      }
    }
  }

  if (config.deleteRemote) {
    for (const [key, item] of currentMap.entries()) {
      if (!nextMap.has(key)) {
        tasks.push(config.deleteRemote(clubId, item));
      }
    }
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}

export function ClubDataProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const { activeClubId, isLoading: isClubAccessLoading } = useClubAccess();

  const [fixturesState, setFixturesState] = useState(emptyClubDataSnapshot.fixtures);
  const [trainingSessionsState, setTrainingSessionsState] = useState(emptyClubDataSnapshot.trainingSessions);
  const [attendanceRecordsState, setAttendanceRecordsState] = useState(emptyClubDataSnapshot.attendanceRecords);
  const [playersState, setPlayersState] = useState(emptyClubDataSnapshot.players);
  const [availabilityRecordsState, setAvailabilityRecordsState] = useState(
    emptyClubDataSnapshot.availabilityRecords
  );
  const [matchStatsState, setMatchStatsState] = useState(emptyClubDataSnapshot.matchStats);
  const [matchLineupAssignmentsState, setMatchLineupAssignmentsState] = useState(
    emptyClubDataSnapshot.matchLineupAssignments
  );
  const [fitnessResultsState, setFitnessResultsState] = useState(emptyClubDataSnapshot.fitnessResults);
  const [finesState, setFinesState] = useState(emptyClubDataSnapshot.fines);
  const [voteEntriesState, setVoteEntriesState] = useState(emptyClubDataSnapshot.voteEntries);
  const [isHydrated, setIsHydrated] = useState(false);
  const pendingCloudSyncCountRef = useRef(0);
  const pendingCloudRefreshRequestedRef = useRef(false);
  const refreshFromCloudTimeoutRef = useRef<number | null>(null);
  const refreshFromCloudRef = useRef<() => Promise<void>>(async () => {});

  const fixturesRef = useRef(fixturesState);
  const trainingSessionsRef = useRef(trainingSessionsState);
  const attendanceRecordsRef = useRef(attendanceRecordsState);
  const playersRef = useRef(playersState);
  const availabilityRecordsRef = useRef(availabilityRecordsState);
  const matchStatsRef = useRef(matchStatsState);
  const matchLineupAssignmentsRef = useRef(matchLineupAssignmentsState);
  const fitnessResultsRef = useRef(fitnessResultsState);
  const finesRef = useRef(finesState);
  const voteEntriesRef = useRef(voteEntriesState);

  fixturesRef.current = fixturesState;
  trainingSessionsRef.current = trainingSessionsState;
  attendanceRecordsRef.current = attendanceRecordsState;
  playersRef.current = playersState;
  availabilityRecordsRef.current = availabilityRecordsState;
  matchStatsRef.current = matchStatsState;
  matchLineupAssignmentsRef.current = matchLineupAssignmentsState;
  fitnessResultsRef.current = fitnessResultsState;
  finesRef.current = finesState;
  voteEntriesRef.current = voteEntriesState;

  function applySnapshot(snapshot: ClubDataSnapshot) {
    fixturesRef.current = snapshot.fixtures;
    trainingSessionsRef.current = snapshot.trainingSessions;
    attendanceRecordsRef.current = snapshot.attendanceRecords;
    playersRef.current = snapshot.players;
    availabilityRecordsRef.current = snapshot.availabilityRecords;
    matchStatsRef.current = snapshot.matchStats;
    matchLineupAssignmentsRef.current = snapshot.matchLineupAssignments;
    fitnessResultsRef.current = snapshot.fitnessResults;
    finesRef.current = snapshot.fines;
    voteEntriesRef.current = snapshot.voteEntries;

    setFixturesState(snapshot.fixtures);
    setTrainingSessionsState(snapshot.trainingSessions);
    setAttendanceRecordsState(snapshot.attendanceRecords);
    setPlayersState(snapshot.players);
    setAvailabilityRecordsState(snapshot.availabilityRecords);
    setMatchStatsState(snapshot.matchStats);
    setMatchLineupAssignmentsState(snapshot.matchLineupAssignments);
    setFitnessResultsState(snapshot.fitnessResults);
    setFinesState(snapshot.fines);
    setVoteEntriesState(snapshot.voteEntries);
  }

  const getSnapshotFromRefs = useCallback((): ClubDataSnapshot => {
    return {
      fixtures: fixturesRef.current,
      trainingSessions: trainingSessionsRef.current,
      attendanceRecords: attendanceRecordsRef.current,
      players: playersRef.current,
      availabilityRecords: availabilityRecordsRef.current,
      matchStats: matchStatsRef.current,
      matchLineupAssignments: matchLineupAssignmentsRef.current,
      fitnessResults: fitnessResultsRef.current,
      fines: finesRef.current,
      voteEntries: voteEntriesRef.current,
    };
  }, []);

  function createCollectionSetter<T>(
    ref: { current: T[] },
    setState: Dispatch<SetStateAction<T[]>>,
    config?: CollectionConfig<T>
  ): Dispatch<SetStateAction<T[]>> {
    return (update) => {
      const current = ref.current;
      const next = resolveArrayUpdate(update, current);

      ref.current = next;
      setState(next);

      if (!config || !isConfigured || !activeClubId) {
        return;
      }

      pendingCloudSyncCountRef.current += 1;
      syncCollectionDiff(activeClubId, current, next, config)
        .catch((error: unknown) => {
          console.warn(`Failed to sync ${config.label}`, error);
        })
        .finally(() => {
          pendingCloudSyncCountRef.current = Math.max(0, pendingCloudSyncCountRef.current - 1);

          if (
            pendingCloudSyncCountRef.current === 0 &&
            pendingCloudRefreshRequestedRef.current
          ) {
            void refreshFromCloudRef.current();
          }
        });
    };
  }

  const setFixtures = createCollectionSetter(fixturesRef, setFixturesState, {
    label: 'fixtures',
    keyOf: (fixture) => fixture.id,
    upsertRemote: upsertCloudFixture,
    deleteRemote: (clubId, fixture) => deleteCloudFixture(clubId, fixture.id),
  });

  const setTrainingSessions = createCollectionSetter(trainingSessionsRef, setTrainingSessionsState, {
    label: 'training sessions',
    keyOf: (session) => session.id,
    upsertRemote: upsertCloudTrainingSession,
    deleteRemote: (clubId, session) => deleteCloudTrainingSession(clubId, session.id),
  });

  const setAttendanceRecords = createCollectionSetter(attendanceRecordsRef, setAttendanceRecordsState, {
    label: 'attendance records',
    keyOf: (record) => `${record.sessionId}::${record.playerId}`,
    upsertRemote: upsertCloudAttendanceRecord,
    deleteRemote: (clubId, record) => deleteCloudAttendanceRecord(clubId, record.sessionId, record.playerId),
  });

  const setPlayers = createCollectionSetter(playersRef, setPlayersState, {
    label: 'players',
    keyOf: (player) => player.id,
    upsertRemote: upsertCloudPlayer,
    deleteRemote: async (clubId, player) => {
      await deleteCloudAttendanceRecordsForPlayer(clubId, player.id);
      await deleteCloudAvailabilityRecordsForPlayer(clubId, player.id);
      await deleteCloudMatchLineupAssignmentsForPlayer(clubId, player.id);
      await deleteCloudFitnessResultsForPlayer(clubId, player.id);
      await deleteCloudVoteEntriesForPlayer(clubId, player.id);
      await deleteCloudPlayer(clubId, player.id);
    },
  });

  const setAvailabilityRecords = createCollectionSetter(
    availabilityRecordsRef,
    setAvailabilityRecordsState,
    {
      label: 'availability records',
      keyOf: (record) => `${record.fixtureId}::${record.playerId}`,
      upsertRemote: upsertCloudAvailabilityRecord,
      deleteRemote: (clubId, record) => deleteCloudAvailabilityRecord(clubId, record.fixtureId, record.playerId),
    }
  );

  const setMatchStats = createCollectionSetter(matchStatsRef, setMatchStatsState, {
    label: 'match stats',
    keyOf: (entry) => `${entry.fixtureId}::${entry.metric}::${entry.team}`,
    upsertRemote: upsertCloudMatchStatEntry,
    deleteRemote: (clubId, entry) => deleteCloudMatchStatEntry(clubId, entry.fixtureId, entry.metric, entry.team),
  });

  const setMatchLineupAssignments = createCollectionSetter(
    matchLineupAssignmentsRef,
    setMatchLineupAssignmentsState,
    {
      label: 'match lineup assignments',
      keyOf: (assignment) => `${assignment.fixtureId}::${assignment.playerId}`,
      upsertRemote: upsertCloudMatchLineupAssignment,
      deleteRemote: (clubId, assignment) =>
        deleteCloudMatchLineupAssignment(clubId, assignment.fixtureId, assignment.playerId),
    }
  );

  const setFitnessResults = createCollectionSetter(fitnessResultsRef, setFitnessResultsState, {
    label: 'fitness results',
    keyOf: (result) => `${result.playerId}::${result.metric}::${result.phase}`,
    upsertRemote: upsertCloudFitnessResult,
    deleteRemote: (clubId, result) =>
      deleteCloudFitnessResult(clubId, result.playerId, result.metric, result.phase),
  });

  const setVoteEntries = createCollectionSetter(voteEntriesRef, setVoteEntriesState, {
    label: 'vote entries',
    keyOf: (entry) => `${entry.fixtureId}::${entry.playerId}::${entry.voteType}`,
    upsertRemote: upsertCloudVoteEntry,
    deleteRemote: (clubId, entry) =>
      deleteCloudVoteEntry(clubId, entry.fixtureId, entry.playerId, entry.voteType),
  });

  const setFines = createCollectionSetter(finesRef, setFinesState);

  function loadDemoData() {
    const snapshot = createDemoClubDataSnapshot();
    setFixtures(snapshot.fixtures);
    setTrainingSessions(snapshot.trainingSessions);
    setAttendanceRecords(snapshot.attendanceRecords);
    setPlayers(snapshot.players);
    setAvailabilityRecords(snapshot.availabilityRecords);
    setMatchStats(snapshot.matchStats);
    setMatchLineupAssignments(snapshot.matchLineupAssignments);
    setFitnessResults(snapshot.fitnessResults);
    setFines(snapshot.fines);
    setVoteEntries(snapshot.voteEntries);
  }

  const refreshFromCloud = useCallback(async () => {
    if (!isConfigured || !activeClubId) {
      return;
    }

    if (pendingCloudSyncCountRef.current > 0) {
      pendingCloudRefreshRequestedRef.current = true;
      return;
    }

    try {
      pendingCloudRefreshRequestedRef.current = false;
      const remoteCoreData = await loadCloudCoreData(activeClubId);

      if (!remoteCoreData) {
        return;
      }

      applySnapshot(
        normalizeClubDataSnapshot({
          ...getSnapshotFromRefs(),
          ...remoteCoreData,
        })
      );
    } catch (error: unknown) {
      console.warn('Failed to refresh cloud club data', error);
    }
  }, [activeClubId, getSnapshotFromRefs, isConfigured]);

  refreshFromCloudRef.current = refreshFromCloud;

  const scheduleRefreshFromCloud = useCallback(() => {
    if (!isConfigured || !activeClubId) {
      return;
    }

    pendingCloudRefreshRequestedRef.current = true;

    if (refreshFromCloudTimeoutRef.current != null) {
      return;
    }

    refreshFromCloudTimeoutRef.current = window.setTimeout(() => {
      refreshFromCloudTimeoutRef.current = null;
      void refreshFromCloud();
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }, [activeClubId, isConfigured, refreshFromCloud]);

  useEffect(() => {
    if (isAuthLoading || isClubAccessLoading) {
      return;
    }

    let isMounted = true;
    setIsHydrated(false);

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
    if (!isHydrated || !isConfigured || !activeClubId) {
      return;
    }

    const interval = window.setInterval(() => {
      scheduleRefreshFromCloud();
    }, CLOUD_REFRESH_INTERVAL_MS);

    function handleFocus() {
      scheduleRefreshFromCloud();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        scheduleRefreshFromCloud();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      if (refreshFromCloudTimeoutRef.current != null) {
        window.clearTimeout(refreshFromCloudTimeoutRef.current);
        refreshFromCloudTimeoutRef.current = null;
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeClubId, isConfigured, isHydrated, scheduleRefreshFromCloud]);

  useEffect(() => {
    if (!isHydrated || !isConfigured || !activeClubId || !supabase) {
      return;
    }

    const client = supabase;
    const channel = REALTIME_TABLES.reduce((currentChannel, table) => {
      return currentChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `club_id=eq.${activeClubId}`,
        },
        () => {
          scheduleRefreshFromCloud();
        }
      );
    }, client.channel(`club-data:${activeClubId}`));

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeClubId, isConfigured, isHydrated, scheduleRefreshFromCloud]);

  const snapshot = useMemo<ClubDataSnapshot>(() => {
    return {
      fixtures: fixturesState,
      trainingSessions: trainingSessionsState,
      attendanceRecords: attendanceRecordsState,
      players: playersState,
      availabilityRecords: availabilityRecordsState,
      matchStats: matchStatsState,
      matchLineupAssignments: matchLineupAssignmentsState,
      fitnessResults: fitnessResultsState,
      fines: finesState,
      voteEntries: voteEntriesState,
    };
  }, [
    attendanceRecordsState,
    availabilityRecordsState,
    finesState,
    fitnessResultsState,
    fixturesState,
    matchLineupAssignmentsState,
    matchStatsState,
    playersState,
    trainingSessionsState,
    voteEntriesState,
  ]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveLocalSnapshot(snapshot).catch((error: unknown) => {
      console.warn('Failed to save local club data', error);
    });
  }, [isHydrated, snapshot]);

  const value = useMemo<ClubDataContextValue>(() => {
    return {
      fixtures: fixturesState,
      setFixtures,
      trainingSessions: trainingSessionsState,
      setTrainingSessions,
      attendanceRecords: attendanceRecordsState,
      setAttendanceRecords,
      players: playersState,
      setPlayers,
      availabilityRecords: availabilityRecordsState,
      setAvailabilityRecords,
      matchStats: matchStatsState,
      setMatchStats,
      matchLineupAssignments: matchLineupAssignmentsState,
      setMatchLineupAssignments,
      fitnessResults: fitnessResultsState,
      setFitnessResults,
      fines: finesState,
      setFines,
      voteEntries: voteEntriesState,
      setVoteEntries,
      loadDemoData,
      isHydrated,
      storageMode: isConfigured && activeClubId ? 'cloud' : 'local',
    };
  }, [
    activeClubId,
    attendanceRecordsState,
    availabilityRecordsState,
    finesState,
    fitnessResultsState,
    fixturesState,
    isConfigured,
    isHydrated,
    matchLineupAssignmentsState,
    matchStatsState,
    playersState,
    trainingSessionsState,
    voteEntriesState,
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
