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

import { normalizeTrainingSessions } from '@/lib/attendance';
import { normalizeFixtureSquad } from '@/lib/availability';
import {
  createDemoClubDataSnapshot,
  emptyClubDataSnapshot,
  normalizeClubDataSnapshot,
  type ClubDataSnapshot,
} from '@/lib/club-data-snapshot';
import { normalizeMatchStatQuarter } from '@/lib/match-stats';
import { normalizePlayerDevelopmentEntries } from '@/lib/player-development';
import { normalizePlayerSquad, normalizePlayers } from '@/lib/team';
import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fine,
  Fixture,
  MatchLineupAssignment,
  MatchRotationAssignment,
  MatchStatEntry,
  Player,
  PlayerDevelopmentEntry,
  PlayerVoteBallot,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';
import { normalizeVoteType } from '@/lib/votes';

import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import {
  deleteCloudAttendanceRecord,
  deleteCloudAttendanceRecordsForPlayer,
  deleteCloudAttendanceRecordsForSession,
  deleteCloudAvailabilityRecord,
  deleteCloudAvailabilityRecordsForFixture,
  deleteCloudAvailabilityRecordsForPlayer,
  deleteCloudFine,
  deleteCloudFinesForPlayer,
  deleteCloudFitnessResultsForPlayer,
  deleteCloudFitnessResult,
  deleteCloudFixture,
  deleteCloudMatchStatEntry,
  deleteCloudMatchLineupAssignment,
  deleteCloudMatchLineupAssignmentsForFixture,
  deleteCloudMatchLineupAssignmentsForPlayer,
  deleteCloudMatchRotationAssignment,
  deleteCloudMatchRotationAssignmentsForFixture,
  deleteCloudMatchRotationAssignmentsForPlayer,
  deleteCloudPlayer,
  deleteCloudPlayerDevelopmentEntriesForPlayer,
  deleteCloudPlayerDevelopmentEntry,
  deleteCloudPlayerVoteBallot,
  deleteCloudPlayerVoteBallotsForFixture,
  deleteCloudPlayerVoteBallotsForPlayer,
  deleteCloudTrainingSession,
  deleteCloudVoteEntriesForPlayer,
  deleteCloudVoteEntry,
  loadCloudCoreData,
  upsertCloudAttendanceRecord,
  upsertCloudAvailabilityRecord,
  upsertCloudFine,
  upsertCloudFitnessResult,
  upsertCloudFixture,
  upsertCloudMatchStatEntry,
  upsertCloudMatchLineupAssignment,
  upsertCloudMatchRotationAssignment,
  upsertCloudPlayer,
  upsertCloudPlayerDevelopmentEntry,
  upsertCloudPlayerVoteBallot,
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
  matchRotationAssignments: MatchRotationAssignment[];
  setMatchRotationAssignments: Dispatch<SetStateAction<MatchRotationAssignment[]>>;
  playerDevelopmentEntries: PlayerDevelopmentEntry[];
  setPlayerDevelopmentEntries: Dispatch<SetStateAction<PlayerDevelopmentEntry[]>>;
  fitnessResults: FitnessResult[];
  setFitnessResults: Dispatch<SetStateAction<FitnessResult[]>>;
  fines: Fine[];
  setFines: Dispatch<SetStateAction<Fine[]>>;
  voteEntries: VoteEntry[];
  setVoteEntries: Dispatch<SetStateAction<VoteEntry[]>>;
  playerVoteBallots: PlayerVoteBallot[];
  setPlayerVoteBallots: Dispatch<SetStateAction<PlayerVoteBallot[]>>;
  loadDemoData: () => void;
  isHydrated: boolean;
  storageMode: 'local' | 'cloud';
  syncDebug: {
    playersSource: 'cloud' | 'local' | 'empty';
    attendanceSource: 'cloud' | 'local' | 'empty';
    availabilitySource: 'cloud' | 'local' | 'empty';
    matchLineupSource: 'cloud' | 'local' | 'empty';
    lastSyncError: string | null;
  };
};

const LOCAL_STORAGE_NAMESPACE = 'club-data';
const STORAGE_KEYS = {
  fixtures: 'fixtures.json',
  trainingSessions: 'training-sessions.json',
  attendanceRecords: 'attendance-records.json',
  players: 'players.json',
  availabilityRecords: 'availability-records.json',
  matchStats: 'match-stats.json',
  matchLineupAssignments: 'match-lineup-assignments.json',
  matchRotationAssignments: 'match-rotation-assignments.json',
  playerDevelopmentEntries: 'player-development-entries.json',
  fitnessResults: 'fitness-results.json',
  fines: 'fines.json',
  voteEntries: 'vote-entries.json',
  playerVoteBallots: 'player-vote-ballots.json',
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
  'club_match_rotation_assignments',
  'club_player_development_entries',
  'club_vote_entries',
  'club_player_vote_ballots',
  'club_fitness_results',
  'club_fines',
] as const;

type CollectionConfig<T> = {
  label: string;
  realtimeTable: RealtimeTableName;
  keyOf: (item: T) => string;
  upsertRemote?: (clubId: string, item: T) => Promise<void>;
  deleteRemote?: (clubId: string, item: T) => Promise<void>;
};

type CloudRow = Record<string, unknown>;
type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';
type RealtimeTableName = (typeof REALTIME_TABLES)[number];
type RealtimePayload = {
  eventType: RealtimeEventType;
  table?: string;
  new: CloudRow;
  old: CloudRow;
};

type CollectionDiffOperation = {
  writeKey: string;
  run: () => Promise<void>;
};

function resolveArrayUpdate<T>(update: SetStateAction<T[]>, current: T[]) {
  return typeof update === 'function' ? update(current) : update;
}

function itemChanged<T>(left: T, right: T) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function getScopedStorageKey(storageScope: string, key: string) {
  return `${LOCAL_STORAGE_NAMESPACE}:${storageScope}:${key}`;
}

async function readScopedStorageWithLegacyFallback<T>(storageScope: string, key: string) {
  const scopedValue = await readJsonStorage<T>(getScopedStorageKey(storageScope, key));

  if (scopedValue !== null) {
    return scopedValue;
  }

  return readJsonStorage<T>(key);
}

async function loadLocalSnapshot(storageScope: string) {
  const [
    fixtures,
    trainingSessions,
    attendanceRecords,
    players,
    availabilityRecords,
    matchStats,
    matchLineupAssignments,
    matchRotationAssignments,
    playerDevelopmentEntries,
    fitnessResults,
    fines,
    voteEntries,
    playerVoteBallots,
  ] = await Promise.all([
    readScopedStorageWithLegacyFallback<Fixture[]>(storageScope, STORAGE_KEYS.fixtures),
    readScopedStorageWithLegacyFallback<TrainingSession[]>(storageScope, STORAGE_KEYS.trainingSessions),
    readScopedStorageWithLegacyFallback<AttendanceRecord[]>(storageScope, STORAGE_KEYS.attendanceRecords),
    readScopedStorageWithLegacyFallback<Player[]>(storageScope, STORAGE_KEYS.players),
    readScopedStorageWithLegacyFallback<AvailabilityRecord[]>(storageScope, STORAGE_KEYS.availabilityRecords),
    readScopedStorageWithLegacyFallback<MatchStatEntry[]>(storageScope, STORAGE_KEYS.matchStats),
    readScopedStorageWithLegacyFallback<MatchLineupAssignment[]>(
      storageScope,
      STORAGE_KEYS.matchLineupAssignments
    ),
    readScopedStorageWithLegacyFallback<MatchRotationAssignment[]>(
      storageScope,
      STORAGE_KEYS.matchRotationAssignments
    ),
    readScopedStorageWithLegacyFallback<PlayerDevelopmentEntry[]>(
      storageScope,
      STORAGE_KEYS.playerDevelopmentEntries
    ),
    readScopedStorageWithLegacyFallback<FitnessResult[]>(storageScope, STORAGE_KEYS.fitnessResults),
    readScopedStorageWithLegacyFallback<Fine[]>(storageScope, STORAGE_KEYS.fines),
    readScopedStorageWithLegacyFallback<VoteEntry[]>(storageScope, STORAGE_KEYS.voteEntries),
    readScopedStorageWithLegacyFallback<PlayerVoteBallot[]>(storageScope, STORAGE_KEYS.playerVoteBallots),
  ]);

  return normalizeClubDataSnapshot({
    fixtures: fixtures ?? undefined,
    trainingSessions: trainingSessions ?? undefined,
    attendanceRecords: attendanceRecords ?? undefined,
    players: players ?? undefined,
    availabilityRecords: availabilityRecords ?? undefined,
    matchStats: matchStats ?? undefined,
    matchLineupAssignments: matchLineupAssignments ?? undefined,
    matchRotationAssignments: matchRotationAssignments ?? undefined,
    playerDevelopmentEntries: playerDevelopmentEntries ?? undefined,
    fitnessResults: fitnessResults ?? undefined,
    fines: fines ?? undefined,
    voteEntries: voteEntries ?? undefined,
    playerVoteBallots: playerVoteBallots ?? undefined,
  });
}

async function saveLocalSnapshot(snapshot: ClubDataSnapshot, storageScope: string) {
  await Promise.all([
    writeJsonStorage(getScopedStorageKey(storageScope, STORAGE_KEYS.fixtures), snapshot.fixtures),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.trainingSessions),
      snapshot.trainingSessions
    ),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.attendanceRecords),
      snapshot.attendanceRecords
    ),
    writeJsonStorage(getScopedStorageKey(storageScope, STORAGE_KEYS.players), snapshot.players),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.availabilityRecords),
      snapshot.availabilityRecords
    ),
    writeJsonStorage(getScopedStorageKey(storageScope, STORAGE_KEYS.matchStats), snapshot.matchStats),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.matchLineupAssignments),
      snapshot.matchLineupAssignments
    ),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.matchRotationAssignments),
      snapshot.matchRotationAssignments
    ),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.playerDevelopmentEntries),
      snapshot.playerDevelopmentEntries
    ),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.fitnessResults),
      snapshot.fitnessResults
    ),
    writeJsonStorage(getScopedStorageKey(storageScope, STORAGE_KEYS.fines), snapshot.fines),
    writeJsonStorage(getScopedStorageKey(storageScope, STORAGE_KEYS.voteEntries), snapshot.voteEntries),
    writeJsonStorage(
      getScopedStorageKey(storageScope, STORAGE_KEYS.playerVoteBallots),
      snapshot.playerVoteBallots
    ),
  ]);
}

function hasSnapshotData(snapshot: ClubDataSnapshot) {
  return Object.values(snapshot).some((collection) => {
    return Array.isArray(collection) && collection.length > 0;
  });
}

function getCloudWriteKey(tableName: RealtimeTableName, rowKey: string) {
  return `${tableName}:${rowKey}`;
}

function getCollectionDiffOperations<T>(
  clubId: string,
  current: T[],
  next: T[],
  config: CollectionConfig<T>
): CollectionDiffOperation[] {
  const currentMap = new Map(current.map((item) => [config.keyOf(item), item] as const));
  const nextMap = new Map(next.map((item) => [config.keyOf(item), item] as const));
  const operations: CollectionDiffOperation[] = [];

  if (config.upsertRemote) {
    for (const [key, item] of nextMap.entries()) {
      const previous = currentMap.get(key);

      if (!previous || itemChanged(previous, item)) {
        operations.push({
          writeKey: getCloudWriteKey(config.realtimeTable, key),
          run: () => config.upsertRemote?.(clubId, item) ?? Promise.resolve(),
        });
      }
    }
  }

  if (config.deleteRemote) {
    for (const [key, item] of currentMap.entries()) {
      if (!nextMap.has(key)) {
        operations.push({
          writeKey: getCloudWriteKey(config.realtimeTable, key),
          run: () => config.deleteRemote?.(clubId, item) ?? Promise.resolve(),
        });
      }
    }
  }

  return operations;
}

function getString(row: CloudRow, key: string) {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function getNullableString(row: CloudRow, key: string) {
  const value = row[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNumber(row: CloudRow, key: string) {
  const value = row[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getBoolean(row: CloudRow, key: string, fallback: boolean) {
  const value = row[key];
  return typeof value === 'boolean' ? value : fallback;
}

function mapCloudPlayer(row: CloudRow) {
  const id = getString(row, 'id');
  const name = getString(row, 'name');

  if (!id || !name) {
    return null;
  }

  return normalizePlayers([
    {
      id,
      name,
      nickname: getNullableString(row, 'nickname'),
      number: getNumber(row, 'number'),
      squad: getNullableString(row, 'squad'),
      role: (getString(row, 'role') ?? 'player') as Player['role'],
      active: getBoolean(row, 'active', true),
      primary_position: getNullableString(row, 'primary_position'),
      secondary_position: getNullableString(row, 'secondary_position'),
      running_profile: getNullableString(row, 'running_profile'),
      rotation_group_overrides: row.rotation_group_overrides,
      season_goals: getNullableString(row, 'season_goals'),
      skill_summary: getNullableString(row, 'skill_summary'),
      development_level: getNullableString(row, 'development_level'),
    },
  ])[0] ?? null;
}

function mapCloudTrainingSession(row: CloudRow) {
  const id = getString(row, 'id');
  const title = getString(row, 'title');
  const date = getString(row, 'date');
  const location = getString(row, 'location');

  if (!id || !title || !date || !location) {
    return null;
  }

  return normalizeTrainingSessions([
    {
      id,
      title,
      date,
      location,
      squad: normalizePlayerSquad(getNullableString(row, 'squad')),
      goal: getNullableString(row, 'goal'),
      focus: getNullableString(row, 'focus'),
      sessionPlan: row.session_plan as TrainingSession['sessionPlan'],
      runPlan: Array.isArray(row.run_plan) ? row.run_plan : [],
    },
  ])[0] ?? null;
}

function mapCloudFixture(row: CloudRow): Fixture | null {
  const id = getString(row, 'id');
  const opponent = getString(row, 'opponent');
  const date = getString(row, 'date');
  const venue = getString(row, 'venue');

  if (!id || !opponent || !date || !venue) {
    return null;
  }

  const grade = getNullableString(row, 'grade');
  const squad = normalizePlayerSquad(getNullableString(row, 'squad'));

  return {
    id,
    opponent,
    grade,
    squad: normalizeFixtureSquad({ grade, squad }),
    date,
    venue,
    isHome: getBoolean(row, 'is_home', true),
  };
}

function mapCloudAttendanceRecord(row: CloudRow): AttendanceRecord | null {
  const sessionId = getString(row, 'session_id');
  const playerId = getString(row, 'player_id');
  const status = getString(row, 'status');

  if (!sessionId || !playerId || !status) {
    return null;
  }

  return {
    sessionId,
    playerId,
    status: status as AttendanceRecord['status'],
  };
}

function mapCloudAvailabilityRecord(row: CloudRow): AvailabilityRecord | null {
  const fixtureId = getString(row, 'fixture_id');
  const playerId = getString(row, 'player_id');
  const status = getString(row, 'status');

  if (!fixtureId || !playerId || !status) {
    return null;
  }

  return {
    fixtureId,
    playerId,
    status: status as AvailabilityRecord['status'],
  };
}

function mapCloudMatchStat(row: CloudRow): MatchStatEntry | null {
  const fixtureId = getString(row, 'fixture_id');
  const metric = getString(row, 'metric');
  const team = getString(row, 'team');
  const value = getNumber(row, 'value');

  if (!fixtureId || !metric || !team || value === null) {
    return null;
  }

  return {
    fixtureId,
    quarter: normalizeMatchStatQuarter(getNullableString(row, 'quarter')),
    metric: metric as MatchStatEntry['metric'],
    team: team as MatchStatEntry['team'],
    value,
  };
}

function mapCloudMatchLineupAssignment(row: CloudRow): MatchLineupAssignment | null {
  const fixtureId = getString(row, 'fixture_id');
  const playerId = getString(row, 'player_id');
  const position = getString(row, 'position');

  if (!fixtureId || !playerId || !position) {
    return null;
  }

  return {
    fixtureId,
    playerId,
    position: position as MatchLineupAssignment['position'],
  };
}

function mapCloudMatchRotationAssignment(row: CloudRow): MatchRotationAssignment | null {
  const fixtureId = getString(row, 'fixture_id');
  const playerId = getString(row, 'player_id');
  const group = getString(row, 'rotation_group');

  if (!fixtureId || !playerId || !group) {
    return null;
  }

  return {
    fixtureId,
    playerId,
    group: group as MatchRotationAssignment['group'],
  };
}

function mapCloudPlayerDevelopmentEntry(row: CloudRow) {
  const playerId = getString(row, 'player_id');

  if (!playerId) {
    return null;
  }

  return normalizePlayerDevelopmentEntries([
    {
      playerId,
      week_start: getString(row, 'week_start'),
      focus_areas: row.focus_areas,
      coaching_note: getNullableString(row, 'coaching_note'),
      progress_status: getNullableString(row, 'progress_status'),
      proficiency: row.proficiency,
      progress_note: getNullableString(row, 'progress_note'),
      generated_at: getNullableString(row, 'generated_at'),
      updated_at: getNullableString(row, 'updated_at'),
    },
  ])[0] ?? null;
}

function mapCloudVoteEntry(row: CloudRow): VoteEntry | null {
  const fixtureId = getString(row, 'fixture_id');
  const playerId = getString(row, 'player_id');
  const points = getNumber(row, 'points');

  if (!fixtureId || !playerId || points === null) {
    return null;
  }

  return {
    fixtureId,
    playerId,
    voteType: normalizeVoteType(getString(row, 'vote_type')),
    points,
  };
}

function mapCloudPlayerVoteBallot(row: CloudRow): PlayerVoteBallot | null {
  const fixtureId = getString(row, 'fixture_id');
  const voterPlayerId = getString(row, 'voter_player_id');
  const nomineePlayerId = getString(row, 'nominee_player_id');

  if (!fixtureId || !voterPlayerId || !nomineePlayerId) {
    return null;
  }

  return { fixtureId, voterPlayerId, nomineePlayerId };
}

function mapCloudFitnessResult(row: CloudRow): FitnessResult | null {
  const playerId = getString(row, 'player_id');
  const metric = getString(row, 'metric');
  const phase = getString(row, 'phase');
  const value = getNumber(row, 'value');
  const recordedAt = getString(row, 'recorded_at');

  if (!playerId || !metric || !phase || value === null || !recordedAt) {
    return null;
  }

  return {
    playerId,
    metric: metric as FitnessResult['metric'],
    phase: phase as FitnessResult['phase'],
    value,
    recordedAt,
  };
}

function mapCloudFine(row: CloudRow): Fine | null {
  const id = getString(row, 'id');
  const playerId = getString(row, 'player_id');
  const reason = getString(row, 'reason');
  const amount = getNumber(row, 'amount');
  const issuedAt = getString(row, 'issued_at');

  if (!id || !playerId || !reason || amount === null || !issuedAt) {
    return null;
  }

  return {
    id,
    playerId,
    reason,
    amount,
    issuedAt,
    paid: getBoolean(row, 'paid', false),
  };
}

export function ClubDataProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
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
  const [matchRotationAssignmentsState, setMatchRotationAssignmentsState] = useState(
    emptyClubDataSnapshot.matchRotationAssignments
  );
  const [playerDevelopmentEntriesState, setPlayerDevelopmentEntriesState] = useState(
    emptyClubDataSnapshot.playerDevelopmentEntries
  );
  const [fitnessResultsState, setFitnessResultsState] = useState(emptyClubDataSnapshot.fitnessResults);
  const [finesState, setFinesState] = useState(emptyClubDataSnapshot.fines);
  const [voteEntriesState, setVoteEntriesState] = useState(emptyClubDataSnapshot.voteEntries);
  const [playerVoteBallotsState, setPlayerVoteBallotsState] = useState(
    emptyClubDataSnapshot.playerVoteBallots
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncDebug, setSyncDebug] = useState<ClubDataContextValue['syncDebug']>({
    playersSource: 'empty',
    attendanceSource: 'empty',
    availabilitySource: 'empty',
    matchLineupSource: 'empty',
    lastSyncError: null,
  });
  const pendingCloudSyncCountRef = useRef(0);
  const pendingCloudRefreshRequestedRef = useRef(false);
  const refreshFromCloudTimeoutRef = useRef<number | null>(null);
  const refreshFromCloudRef = useRef<() => Promise<void>>(async () => {});
  const refreshFromCloudPromiseRef = useRef<Promise<void> | null>(null);
  const hydratedStorageScopeRef = useRef<string | null>(null);
  const stateMutationVersionRef = useRef(0);
  const pendingCloudWriteKeysRef = useRef(new Map<string, number>());
  const cloudWriteQueuesRef = useRef(new Map<string, Promise<void>>());

  const fixturesRef = useRef(fixturesState);
  const trainingSessionsRef = useRef(trainingSessionsState);
  const attendanceRecordsRef = useRef(attendanceRecordsState);
  const playersRef = useRef(playersState);
  const availabilityRecordsRef = useRef(availabilityRecordsState);
  const matchStatsRef = useRef(matchStatsState);
  const matchLineupAssignmentsRef = useRef(matchLineupAssignmentsState);
  const matchRotationAssignmentsRef = useRef(matchRotationAssignmentsState);
  const playerDevelopmentEntriesRef = useRef(playerDevelopmentEntriesState);
  const fitnessResultsRef = useRef(fitnessResultsState);
  const finesRef = useRef(finesState);
  const voteEntriesRef = useRef(voteEntriesState);
  const playerVoteBallotsRef = useRef(playerVoteBallotsState);

  fixturesRef.current = fixturesState;
  trainingSessionsRef.current = trainingSessionsState;
  attendanceRecordsRef.current = attendanceRecordsState;
  playersRef.current = playersState;
  availabilityRecordsRef.current = availabilityRecordsState;
  matchStatsRef.current = matchStatsState;
  matchLineupAssignmentsRef.current = matchLineupAssignmentsState;
  matchRotationAssignmentsRef.current = matchRotationAssignmentsState;
  playerDevelopmentEntriesRef.current = playerDevelopmentEntriesState;
  fitnessResultsRef.current = fitnessResultsState;
  finesRef.current = finesState;
  voteEntriesRef.current = voteEntriesState;
  playerVoteBallotsRef.current = playerVoteBallotsState;

  const storageScope = useMemo(() => {
    if (isConfigured) {
      if (activeClubId) {
        return `cloud:${activeClubId}`;
      }

      return `cloud:${user?.id ?? 'anonymous'}:no-club`;
    }

    return `local:${user?.id ?? 'anonymous'}`;
  }, [activeClubId, isConfigured, user?.id]);

  function requestCloudRefresh() {
    pendingCloudRefreshRequestedRef.current = true;

    if (refreshFromCloudTimeoutRef.current != null) {
      return;
    }

    refreshFromCloudTimeoutRef.current = window.setTimeout(() => {
      refreshFromCloudTimeoutRef.current = null;
      void refreshFromCloudRef.current();
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }

  function applySnapshot(snapshot: ClubDataSnapshot) {
    fixturesRef.current = snapshot.fixtures;
    trainingSessionsRef.current = snapshot.trainingSessions;
    attendanceRecordsRef.current = snapshot.attendanceRecords;
    playersRef.current = snapshot.players;
    availabilityRecordsRef.current = snapshot.availabilityRecords;
    matchStatsRef.current = snapshot.matchStats;
    matchLineupAssignmentsRef.current = snapshot.matchLineupAssignments;
    matchRotationAssignmentsRef.current = snapshot.matchRotationAssignments;
    playerDevelopmentEntriesRef.current = snapshot.playerDevelopmentEntries;
    fitnessResultsRef.current = snapshot.fitnessResults;
    finesRef.current = snapshot.fines;
    voteEntriesRef.current = snapshot.voteEntries;
    playerVoteBallotsRef.current = snapshot.playerVoteBallots;

    setFixturesState(snapshot.fixtures);
    setTrainingSessionsState(snapshot.trainingSessions);
    setAttendanceRecordsState(snapshot.attendanceRecords);
    setPlayersState(snapshot.players);
    setAvailabilityRecordsState(snapshot.availabilityRecords);
    setMatchStatsState(snapshot.matchStats);
    setMatchLineupAssignmentsState(snapshot.matchLineupAssignments);
    setMatchRotationAssignmentsState(snapshot.matchRotationAssignments);
    setPlayerDevelopmentEntriesState(snapshot.playerDevelopmentEntries);
    setFitnessResultsState(snapshot.fitnessResults);
    setFinesState(snapshot.fines);
    setVoteEntriesState(snapshot.voteEntries);
    setPlayerVoteBallotsState(snapshot.playerVoteBallots);
  }

  function hasPendingCloudWrite(writeKey: string) {
    return (pendingCloudWriteKeysRef.current.get(writeKey) ?? 0) > 0;
  }

  function queueCloudWrite(label: string, operation: CollectionDiffOperation) {
    pendingCloudSyncCountRef.current += 1;
    pendingCloudWriteKeysRef.current.set(
      operation.writeKey,
      (pendingCloudWriteKeysRef.current.get(operation.writeKey) ?? 0) + 1
    );

    const previousWrite = cloudWriteQueuesRef.current.get(operation.writeKey) ?? Promise.resolve();
    const queuedWrite = previousWrite.catch(() => {}).then(operation.run);

    cloudWriteQueuesRef.current.set(operation.writeKey, queuedWrite);

    queuedWrite
      .then(() => {
        setSyncDebug((syncState) => {
          if (syncState.lastSyncError === null) {
            return syncState;
          }

          return {
            ...syncState,
            lastSyncError: null,
          };
        });
      })
      .catch((error: unknown) => {
        console.warn(`Failed to sync ${label}`, error);
        setSyncDebug((syncState) => {
          return {
            ...syncState,
            lastSyncError:
              error instanceof Error ? `Failed to sync ${label}: ${error.message}` : `Failed to sync ${label}.`,
          };
        });
      })
      .finally(() => {
        pendingCloudSyncCountRef.current = Math.max(0, pendingCloudSyncCountRef.current - 1);

        const pendingKeyCount = pendingCloudWriteKeysRef.current.get(operation.writeKey) ?? 0;
        if (pendingKeyCount <= 1) {
          pendingCloudWriteKeysRef.current.delete(operation.writeKey);
        } else {
          pendingCloudWriteKeysRef.current.set(operation.writeKey, pendingKeyCount - 1);
        }

        if (cloudWriteQueuesRef.current.get(operation.writeKey) === queuedWrite) {
          cloudWriteQueuesRef.current.delete(operation.writeKey);
        }

        if (
          pendingCloudSyncCountRef.current === 0 &&
          pendingCloudRefreshRequestedRef.current
        ) {
          requestCloudRefresh();
        }
      });
  }

  function upsertRealtimeItem<T>(
    ref: { current: T[] },
    setState: Dispatch<SetStateAction<T[]>>,
    keyOf: (item: T) => string,
    item: T
  ) {
    const itemKey = keyOf(item);
    const current = ref.current;
    const existingIndex = current.findIndex((currentItem) => keyOf(currentItem) === itemKey);
    const existingItem = existingIndex >= 0 ? current[existingIndex] : null;

    if (existingItem && !itemChanged(existingItem, item)) {
      return;
    }

    const next =
      existingIndex >= 0
        ? current.map((currentItem, index) => (index === existingIndex ? item : currentItem))
        : [...current, item];

    ref.current = next;
    setState(next);
    stateMutationVersionRef.current += 1;
  }

  function deleteRealtimeItem<T>(
    ref: { current: T[] },
    setState: Dispatch<SetStateAction<T[]>>,
    keyOf: (item: T) => string,
    itemKey: string
  ) {
    const current = ref.current;
    const next = current.filter((item) => keyOf(item) !== itemKey);

    if (next.length === current.length) {
      return;
    }

    ref.current = next;
    setState(next);
    stateMutationVersionRef.current += 1;
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
      matchRotationAssignments: matchRotationAssignmentsRef.current,
      playerDevelopmentEntries: playerDevelopmentEntriesRef.current,
      fitnessResults: fitnessResultsRef.current,
      fines: finesRef.current,
      voteEntries: voteEntriesRef.current,
      playerVoteBallots: playerVoteBallotsRef.current,
    };
  }, []);

  const setSyncDebugFromSources = useCallback(
    (localSnapshot: ClubDataSnapshot, remoteCoreData: Partial<ClubDataSnapshot> | null) => {
      const hasRemotePlayers = Boolean(remoteCoreData && Object.prototype.hasOwnProperty.call(remoteCoreData, 'players'));
      const hasRemoteAttendance = Boolean(
        remoteCoreData && Object.prototype.hasOwnProperty.call(remoteCoreData, 'attendanceRecords')
      );
      const hasRemoteAvailability = Boolean(
        remoteCoreData && Object.prototype.hasOwnProperty.call(remoteCoreData, 'availabilityRecords')
      );
      const hasRemoteMatchLineup = Boolean(
        remoteCoreData && Object.prototype.hasOwnProperty.call(remoteCoreData, 'matchLineupAssignments')
      );

      setSyncDebug((current) => ({
        playersSource: hasRemotePlayers
          ? 'cloud'
          : localSnapshot.players.length > 0
            ? 'local'
            : 'empty',
        attendanceSource: hasRemoteAttendance
          ? 'cloud'
          : localSnapshot.attendanceRecords.length > 0
            ? 'local'
            : 'empty',
        availabilitySource: hasRemoteAvailability
          ? 'cloud'
          : localSnapshot.availabilityRecords.length > 0
            ? 'local'
            : 'empty',
        matchLineupSource: hasRemoteMatchLineup
          ? 'cloud'
          : localSnapshot.matchLineupAssignments.length > 0
            ? 'local'
            : 'empty',
        lastSyncError: current.lastSyncError,
      }));
    },
    []
  );

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
      stateMutationVersionRef.current += 1;

      if (!config || !isConfigured || !activeClubId) {
        return;
      }

      const operations = getCollectionDiffOperations(activeClubId, current, next, config);
      operations.forEach((operation) => {
        queueCloudWrite(config.label, operation);
      });
    };
  }

  const setFixtures = createCollectionSetter(fixturesRef, setFixturesState, {
    label: 'fixtures',
    realtimeTable: 'club_fixtures',
    keyOf: (fixture) => fixture.id,
    upsertRemote: upsertCloudFixture,
    deleteRemote: (clubId, fixture) => deleteCloudFixture(clubId, fixture.id),
  });

  const setTrainingSessions = createCollectionSetter(trainingSessionsRef, setTrainingSessionsState, {
    label: 'training sessions',
    realtimeTable: 'club_training_sessions',
    keyOf: (session) => session.id,
    upsertRemote: upsertCloudTrainingSession,
    deleteRemote: (clubId, session) => deleteCloudTrainingSession(clubId, session.id),
  });

  const setAttendanceRecords = createCollectionSetter(attendanceRecordsRef, setAttendanceRecordsState, {
    label: 'attendance records',
    realtimeTable: 'club_attendance_records',
    keyOf: (record) => `${record.sessionId}::${record.playerId}`,
    upsertRemote: upsertCloudAttendanceRecord,
    deleteRemote: (clubId, record) => deleteCloudAttendanceRecord(clubId, record.sessionId, record.playerId),
  });

  const setPlayers = createCollectionSetter(playersRef, setPlayersState, {
    label: 'players',
    realtimeTable: 'club_players',
    keyOf: (player) => player.id,
    upsertRemote: upsertCloudPlayer,
    deleteRemote: async (clubId, player) => {
      await deleteCloudAttendanceRecordsForPlayer(clubId, player.id);
      await deleteCloudAvailabilityRecordsForPlayer(clubId, player.id);
      await deleteCloudMatchLineupAssignmentsForPlayer(clubId, player.id);
      await deleteCloudMatchRotationAssignmentsForPlayer(clubId, player.id);
      await deleteCloudPlayerDevelopmentEntriesForPlayer(clubId, player.id);
      await deleteCloudFitnessResultsForPlayer(clubId, player.id);
      await deleteCloudFinesForPlayer(clubId, player.id);
      await deleteCloudVoteEntriesForPlayer(clubId, player.id);
      await deleteCloudPlayer(clubId, player.id);
    },
  });

  const setAvailabilityRecords = createCollectionSetter(
    availabilityRecordsRef,
    setAvailabilityRecordsState,
    {
      label: 'availability records',
      realtimeTable: 'club_availability_records',
      keyOf: (record) => `${record.fixtureId}::${record.playerId}`,
      upsertRemote: upsertCloudAvailabilityRecord,
      deleteRemote: (clubId, record) => deleteCloudAvailabilityRecord(clubId, record.fixtureId, record.playerId),
    }
  );

  const setMatchStats = createCollectionSetter(matchStatsRef, setMatchStatsState, {
    label: 'match stats',
    realtimeTable: 'club_match_stats',
    keyOf: (entry) => `${entry.fixtureId}::${entry.quarter}::${entry.metric}::${entry.team}`,
    upsertRemote: upsertCloudMatchStatEntry,
    deleteRemote: (clubId, entry) =>
      deleteCloudMatchStatEntry(clubId, entry.fixtureId, entry.quarter, entry.metric, entry.team),
  });

  const setMatchLineupAssignments = createCollectionSetter(
    matchLineupAssignmentsRef,
    setMatchLineupAssignmentsState,
    {
      label: 'match lineup assignments',
      realtimeTable: 'club_match_lineup_assignments',
      keyOf: (assignment) => `${assignment.fixtureId}::${assignment.playerId}`,
      upsertRemote: upsertCloudMatchLineupAssignment,
      deleteRemote: (clubId, assignment) =>
        deleteCloudMatchLineupAssignment(clubId, assignment.fixtureId, assignment.playerId),
    }
  );

  const setMatchRotationAssignments = createCollectionSetter(
    matchRotationAssignmentsRef,
    setMatchRotationAssignmentsState,
    {
      label: 'match rotation assignments',
      realtimeTable: 'club_match_rotation_assignments',
      keyOf: (assignment) => `${assignment.fixtureId}::${assignment.playerId}`,
      upsertRemote: upsertCloudMatchRotationAssignment,
      deleteRemote: (clubId, assignment) =>
        deleteCloudMatchRotationAssignment(clubId, assignment.fixtureId, assignment.playerId),
    }
  );

  const setFitnessResults = createCollectionSetter(fitnessResultsRef, setFitnessResultsState, {
    label: 'fitness results',
    realtimeTable: 'club_fitness_results',
    keyOf: (result) => `${result.playerId}::${result.metric}::${result.phase}`,
    upsertRemote: upsertCloudFitnessResult,
    deleteRemote: (clubId, result) =>
      deleteCloudFitnessResult(clubId, result.playerId, result.metric, result.phase),
  });

  const setPlayerDevelopmentEntries = createCollectionSetter(
    playerDevelopmentEntriesRef,
    setPlayerDevelopmentEntriesState,
    {
      label: 'player development entries',
      realtimeTable: 'club_player_development_entries',
      keyOf: (entry) => `${entry.playerId}::${entry.weekStart}`,
      upsertRemote: upsertCloudPlayerDevelopmentEntry,
      deleteRemote: (clubId, entry) =>
        deleteCloudPlayerDevelopmentEntry(clubId, entry.playerId, entry.weekStart),
    }
  );

  const setVoteEntries = createCollectionSetter(voteEntriesRef, setVoteEntriesState, {
    label: 'vote entries',
    realtimeTable: 'club_vote_entries',
    keyOf: (entry) => `${entry.fixtureId}::${entry.playerId}::${entry.voteType}`,
    upsertRemote: upsertCloudVoteEntry,
    deleteRemote: (clubId, entry) =>
      deleteCloudVoteEntry(clubId, entry.fixtureId, entry.playerId, entry.voteType),
  });

  const setPlayerVoteBallots = createCollectionSetter(
    playerVoteBallotsRef,
    setPlayerVoteBallotsState,
    {
      label: 'player vote ballots',
      realtimeTable: 'club_player_vote_ballots',
      keyOf: (ballot) => `${ballot.fixtureId}::${ballot.voterPlayerId}`,
      upsertRemote: upsertCloudPlayerVoteBallot,
      deleteRemote: (clubId, ballot) =>
        deleteCloudPlayerVoteBallot(clubId, ballot.fixtureId, ballot.voterPlayerId),
    }
  );

  const setFines = createCollectionSetter(finesRef, setFinesState, {
    label: 'fines',
    realtimeTable: 'club_fines',
    keyOf: (fine) => fine.id,
    upsertRemote: upsertCloudFine,
    deleteRemote: (clubId, fine) => deleteCloudFine(clubId, fine.id),
  });

  function applyRealtimeCollectionPayload<T>(
    payload: RealtimePayload,
    tableName: RealtimeTableName,
    getRowKey: (row: CloudRow) => string | null,
    mapRow: (row: CloudRow) => T | null,
    ref: { current: T[] },
    setState: Dispatch<SetStateAction<T[]>>,
    keyOf: (item: T) => string
  ) {
    const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
    const rowClubId = getString(row, 'club_id');

    if (rowClubId !== activeClubId) {
      return rowClubId !== null;
    }

    const rowKey = getRowKey(row);

    if (!rowKey) {
      return false;
    }

    if (hasPendingCloudWrite(getCloudWriteKey(tableName, rowKey))) {
      return true;
    }

    if (payload.eventType === 'DELETE') {
      deleteRealtimeItem(ref, setState, keyOf, rowKey);
      return true;
    }

    const item = mapRow(row);

    if (!item) {
      return false;
    }

    upsertRealtimeItem(ref, setState, keyOf, item);
    return true;
  }

  function applyRealtimePayload(tableName: RealtimeTableName, payload: RealtimePayload) {
    if (!activeClubId) {
      return false;
    }

    switch (tableName) {
      case 'club_players':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => getString(row, 'id'),
          mapCloudPlayer,
          playersRef,
          setPlayersState,
          (player) => player.id
        );
      case 'club_training_sessions':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => getString(row, 'id'),
          mapCloudTrainingSession,
          trainingSessionsRef,
          setTrainingSessionsState,
          (session) => session.id
        );
      case 'club_attendance_records':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const sessionId = getString(row, 'session_id');
            const playerId = getString(row, 'player_id');
            return sessionId && playerId ? `${sessionId}::${playerId}` : null;
          },
          mapCloudAttendanceRecord,
          attendanceRecordsRef,
          setAttendanceRecordsState,
          (record) => `${record.sessionId}::${record.playerId}`
        );
      case 'club_fixtures':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => getString(row, 'id'),
          mapCloudFixture,
          fixturesRef,
          setFixturesState,
          (fixture) => fixture.id
        );
      case 'club_availability_records':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const fixtureId = getString(row, 'fixture_id');
            const playerId = getString(row, 'player_id');
            return fixtureId && playerId ? `${fixtureId}::${playerId}` : null;
          },
          mapCloudAvailabilityRecord,
          availabilityRecordsRef,
          setAvailabilityRecordsState,
          (record) => `${record.fixtureId}::${record.playerId}`
        );
      case 'club_match_stats':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const fixtureId = getString(row, 'fixture_id');
            const quarter = normalizeMatchStatQuarter(getNullableString(row, 'quarter'));
            const metric = getString(row, 'metric');
            const team = getString(row, 'team');
            return fixtureId && metric && team ? `${fixtureId}::${quarter}::${metric}::${team}` : null;
          },
          mapCloudMatchStat,
          matchStatsRef,
          setMatchStatsState,
          (entry) => `${entry.fixtureId}::${entry.quarter}::${entry.metric}::${entry.team}`
        );
      case 'club_match_lineup_assignments':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const fixtureId = getString(row, 'fixture_id');
            const playerId = getString(row, 'player_id');
            return fixtureId && playerId ? `${fixtureId}::${playerId}` : null;
          },
          mapCloudMatchLineupAssignment,
          matchLineupAssignmentsRef,
          setMatchLineupAssignmentsState,
          (assignment) => `${assignment.fixtureId}::${assignment.playerId}`
        );
      case 'club_match_rotation_assignments':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const fixtureId = getString(row, 'fixture_id');
            const playerId = getString(row, 'player_id');
            return fixtureId && playerId ? `${fixtureId}::${playerId}` : null;
          },
          mapCloudMatchRotationAssignment,
          matchRotationAssignmentsRef,
          setMatchRotationAssignmentsState,
          (assignment) => `${assignment.fixtureId}::${assignment.playerId}`
        );
      case 'club_player_development_entries':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const playerId = getString(row, 'player_id');
            const weekStart = getString(row, 'week_start');
            return playerId && weekStart ? `${playerId}::${weekStart}` : null;
          },
          mapCloudPlayerDevelopmentEntry,
          playerDevelopmentEntriesRef,
          setPlayerDevelopmentEntriesState,
          (entry) => `${entry.playerId}::${entry.weekStart}`
        );
      case 'club_vote_entries':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const fixtureId = getString(row, 'fixture_id');
            const playerId = getString(row, 'player_id');
            const voteType = normalizeVoteType(getString(row, 'vote_type'));
            return fixtureId && playerId ? `${fixtureId}::${playerId}::${voteType}` : null;
          },
          mapCloudVoteEntry,
          voteEntriesRef,
          setVoteEntriesState,
          (entry) => `${entry.fixtureId}::${entry.playerId}::${entry.voteType}`
        );
      case 'club_player_vote_ballots':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const fixtureId = getString(row, 'fixture_id');
            const voterPlayerId = getString(row, 'voter_player_id');
            return fixtureId && voterPlayerId ? `${fixtureId}::${voterPlayerId}` : null;
          },
          mapCloudPlayerVoteBallot,
          playerVoteBallotsRef,
          setPlayerVoteBallotsState,
          (ballot) => `${ballot.fixtureId}::${ballot.voterPlayerId}`
        );
      case 'club_fitness_results':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => {
            const playerId = getString(row, 'player_id');
            const metric = getString(row, 'metric');
            const phase = getString(row, 'phase');
            return playerId && metric && phase ? `${playerId}::${metric}::${phase}` : null;
          },
          mapCloudFitnessResult,
          fitnessResultsRef,
          setFitnessResultsState,
          (result) => `${result.playerId}::${result.metric}::${result.phase}`
        );
      case 'club_fines':
        return applyRealtimeCollectionPayload(
          payload,
          tableName,
          (row) => getString(row, 'id'),
          mapCloudFine,
          finesRef,
          setFinesState,
          (fine) => fine.id
        );
      default:
        return false;
    }
  }

  function loadDemoData() {
    const snapshot = createDemoClubDataSnapshot();
    setFixtures(snapshot.fixtures);
    setTrainingSessions(snapshot.trainingSessions);
    setAttendanceRecords(snapshot.attendanceRecords);
    setPlayers(snapshot.players);
    setAvailabilityRecords(snapshot.availabilityRecords);
    setMatchStats(snapshot.matchStats);
    setMatchLineupAssignments(snapshot.matchLineupAssignments);
    setMatchRotationAssignments(snapshot.matchRotationAssignments);
    setPlayerDevelopmentEntries(snapshot.playerDevelopmentEntries);
    setFitnessResults(snapshot.fitnessResults);
    setFines(snapshot.fines);
    setVoteEntries(snapshot.voteEntries);
    setPlayerVoteBallots(snapshot.playerVoteBallots);
  }

  const refreshFromCloud = useCallback(async () => {
    if (!isConfigured || !activeClubId) {
      return;
    }

    if (pendingCloudSyncCountRef.current > 0) {
      pendingCloudRefreshRequestedRef.current = true;
      return;
    }

    if (refreshFromCloudPromiseRef.current) {
      pendingCloudRefreshRequestedRef.current = true;
      await refreshFromCloudPromiseRef.current;
      return;
    }

    const refreshPromise = (async () => {
      try {
        pendingCloudRefreshRequestedRef.current = false;
        const refreshStartedAtVersion = stateMutationVersionRef.current;
        const remoteCoreData = await loadCloudCoreData(activeClubId);

        if (!remoteCoreData) {
          return;
        }

        if (stateMutationVersionRef.current !== refreshStartedAtVersion) {
          requestCloudRefresh();
          return;
        }

        const currentSnapshot = getSnapshotFromRefs();
        setSyncDebugFromSources(currentSnapshot, remoteCoreData);
        applySnapshot(
          normalizeClubDataSnapshot({
            ...currentSnapshot,
            ...remoteCoreData,
          })
        );
      } catch (error: unknown) {
        console.warn('Failed to refresh cloud club data', error);
      } finally {
        refreshFromCloudPromiseRef.current = null;
      }
    })();

    refreshFromCloudPromiseRef.current = refreshPromise;
    await refreshPromise;
  }, [activeClubId, getSnapshotFromRefs, isConfigured, setSyncDebugFromSources]);

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
    hydratedStorageScopeRef.current = null;
    setIsHydrated(false);

    async function hydrate() {
      let didHydrateFromLocal = false;

      try {
        const localSnapshot = await loadLocalSnapshot(storageScope);

        if (!isMounted) {
          return;
        }

        if (!isConfigured || !activeClubId || hasSnapshotData(localSnapshot)) {
          applySnapshot(localSnapshot);
          hydratedStorageScopeRef.current = storageScope;
          setSyncDebugFromSources(localSnapshot, null);
          setIsHydrated(true);
          didHydrateFromLocal = true;
        }

        if (isConfigured && activeClubId) {
          try {
            const remoteCoreData = await loadCloudCoreData(activeClubId);

            if (remoteCoreData) {
              setSyncDebugFromSources(localSnapshot, remoteCoreData);
              const nextSnapshot = normalizeClubDataSnapshot({
                ...localSnapshot,
                ...remoteCoreData,
              });

              if (!isMounted) {
                return;
              }

              applySnapshot(nextSnapshot);
              hydratedStorageScopeRef.current = storageScope;
              setIsHydrated(true);
              return;
            } else {
              setSyncDebugFromSources(localSnapshot, null);
            }
          } catch (error: unknown) {
            console.warn('Failed to load cloud club data', error);
            setSyncDebugFromSources(localSnapshot, null);
          }
        }

        if (!didHydrateFromLocal) {
          applySnapshot(localSnapshot);
          hydratedStorageScopeRef.current = storageScope;
        }
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
  }, [activeClubId, isAuthLoading, isClubAccessLoading, isConfigured, storageScope]);

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
        (payload) => {
          const didApplyPatch = applyRealtimePayload(table, payload as RealtimePayload);

          if (!didApplyPatch) {
            requestCloudRefresh();
          }
        }
      );
    }, client.channel(`club-data:${activeClubId}`));

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeClubId, isConfigured, isHydrated]);

  const snapshot = useMemo<ClubDataSnapshot>(() => {
    return {
      fixtures: fixturesState,
      trainingSessions: trainingSessionsState,
      attendanceRecords: attendanceRecordsState,
      players: playersState,
      availabilityRecords: availabilityRecordsState,
      matchStats: matchStatsState,
      matchLineupAssignments: matchLineupAssignmentsState,
      matchRotationAssignments: matchRotationAssignmentsState,
      playerDevelopmentEntries: playerDevelopmentEntriesState,
      fitnessResults: fitnessResultsState,
      fines: finesState,
      voteEntries: voteEntriesState,
      playerVoteBallots: playerVoteBallotsState,
    };
  }, [
    attendanceRecordsState,
    availabilityRecordsState,
    finesState,
    fitnessResultsState,
    fixturesState,
    matchLineupAssignmentsState,
    matchRotationAssignmentsState,
    matchStatsState,
    playerDevelopmentEntriesState,
    playersState,
    playerVoteBallotsState,
    trainingSessionsState,
    voteEntriesState,
  ]);

  useEffect(() => {
    if (!isHydrated || hydratedStorageScopeRef.current !== storageScope) {
      return;
    }

    saveLocalSnapshot(snapshot, storageScope).catch((error: unknown) => {
      console.warn('Failed to save local club data', error);
    });
  }, [isHydrated, snapshot, storageScope]);

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
      matchRotationAssignments: matchRotationAssignmentsState,
      setMatchRotationAssignments,
      playerDevelopmentEntries: playerDevelopmentEntriesState,
      setPlayerDevelopmentEntries,
      fitnessResults: fitnessResultsState,
      setFitnessResults,
      fines: finesState,
      setFines,
      voteEntries: voteEntriesState,
      setVoteEntries,
      playerVoteBallots: playerVoteBallotsState,
      setPlayerVoteBallots,
      loadDemoData,
      isHydrated,
      storageMode: isConfigured && activeClubId ? 'cloud' : 'local',
      syncDebug,
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
    matchRotationAssignmentsState,
    matchStatsState,
    playerDevelopmentEntriesState,
    playerVoteBallotsState,
    playersState,
    setPlayerVoteBallots,
    setPlayerDevelopmentEntries,
    syncDebug,
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
