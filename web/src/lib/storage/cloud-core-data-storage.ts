import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fine,
  Fixture,
  PlayerDevelopmentEntry,
  MatchStatEntry,
  MatchLineupAssignment,
  MatchRotationAssignment,
  Player,
  TrainingSession,
  PlayerVoteBallot,
  VoteEntry,
} from '@/lib/types';
import { normalizeMatchStats } from '@/lib/match-stats';
import { normalizePlayerDevelopmentEntries } from '@/lib/player-development';
import { normalizePlayers, normalizePlayerSquad } from '@/lib/team';
import { normalizeVoteEntries, normalizeVoteType } from '@/lib/votes';
import { normalizeTrainingSessions } from '@/lib/attendance';
import { normalizeFixtureSquad } from '@/lib/availability';

import { supabase } from '@web/lib/supabase';

export type CloudCoreData = {
  players: Player[];
  trainingSessions: TrainingSession[];
  attendanceRecords: AttendanceRecord[];
  fixtures: Fixture[];
  availabilityRecords: AvailabilityRecord[];
  matchStats: MatchStatEntry[];
  matchLineupAssignments: MatchLineupAssignment[];
  matchRotationAssignments: MatchRotationAssignment[];
  playerDevelopmentEntries: PlayerDevelopmentEntry[];
  voteEntries: VoteEntry[];
  fitnessResults: FitnessResult[];
  fines: Fine[];
  playerVoteBallots: PlayerVoteBallot[];
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

async function throwOnError(error: { message?: string } | null) {
  if (error) {
    throw error;
  }
}

function logCloudCollectionError(label: string, error: { message?: string } | null) {
  if (error) {
    console.warn(`Failed to load ${label} from Supabase`, error);
  }
}

function logMissingOptionalTable(label: string, tableName: string) {
  console.warn(
    `Skipping ${label} because ${tableName} is missing in Supabase. Run the latest supabase/schema.sql to align the remote schema.`
  );
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === 'PGRST205' ||
    error.message?.includes('Could not find the table') === true
  );
}

function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  columnName?: string
) {
  if (!error) {
    return false;
  }

  if (error.code !== '42703') {
    return false;
  }

  if (!columnName) {
    return true;
  }

  return error.message?.includes(`column ${columnName} does not exist`) === true;
}

type CloudAvailabilityRow = {
  fixture_id?: unknown;
  player_id?: unknown;
  status?: unknown;
};

function mapCloudAvailabilityRecord(record: CloudAvailabilityRow): AvailabilityRecord {
  return {
    fixtureId: record.fixture_id as string,
    playerId: record.player_id as string,
    status: record.status as AvailabilityRecord['status'],
  };
}

async function loadCloudPlayers(clubId: string) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const preferredResult = await supabase
    .from('club_players')
    .select(
      'id, name, nickname, number, squad, role, active, primary_position, secondary_position, running_profile, rotation_group_overrides, season_goals, skill_summary, development_level'
    )
    .eq('club_id', clubId)
    .order('number', { ascending: true });

  if (!preferredResult.error) {
    return preferredResult;
  }

  const fallbackResult = await supabase
    .from('club_players')
    .select('*')
    .eq('club_id', clubId)
    .order('number', { ascending: true });

  if (!fallbackResult.error) {
    console.warn(
      'Loaded players from Supabase using select(*) fallback. Run the latest supabase/schema.sql to align the remote schema.'
    );
    return fallbackResult;
  }

  return preferredResult;
}

async function loadCloudMatchStats(clubId: string) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const preferredResult = await supabase
    .from('club_match_stats')
    .select('fixture_id, quarter, metric, team, value')
    .eq('club_id', clubId);

  if (!preferredResult.error) {
    return preferredResult;
  }

  const fallbackResult = await supabase
    .from('club_match_stats')
    .select('fixture_id, metric, team, value')
    .eq('club_id', clubId);

  if (!fallbackResult.error) {
    console.warn(
      'Loaded match stats from Supabase using legacy schema fallback. Run the latest supabase/schema.sql to enable quarter capture.'
    );
    return fallbackResult;
  }

  return preferredResult;
}

async function loadCloudTrainingSessions(clubId: string) {
  if (!supabase) {
    return { data: null, error: null };
  }

  return supabase
    .from('club_training_sessions')
    .select('id, title, date, location, squad, goal, focus, updated_at')
    .eq('club_id', clubId)
    .order('date', { ascending: true });
}

export async function loadCloudTrainingSessionDetails(clubId: string, sessionId: string) {
  const client = requireSupabase();

  const { data, error } = await client
    .from('club_training_sessions')
    .select('id, session_plan, run_plan')
    .eq('club_id', clubId)
    .eq('id', sessionId)
    .maybeSingle();

  await throwOnError(error);

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    sessionPlan: data.session_plan ?? null,
    runPlan: Array.isArray(data.run_plan) ? data.run_plan : [],
  };
}

async function loadCloudMatchRotationAssignments(clubId: string) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const result = await supabase
    .from('club_match_rotation_assignments')
    .select('fixture_id, player_id, rotation_group')
    .eq('club_id', clubId)
    .order('fixture_id', { ascending: true });

  if (isMissingTableError(result.error)) {
    console.warn(
      'Rotation assignments are not available in this Supabase schema yet. Run the latest supabase/schema.sql to enable rotation groups.'
    );
    return { data: [], error: null };
  }

  return result;
}

async function loadCloudFines(clubId: string) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const result = await supabase
    .from('club_fines')
    .select('id, player_id, reason, amount, issued_at, paid')
    .eq('club_id', clubId)
    .order('issued_at', { ascending: false });

  if (isMissingTableError(result.error)) {
    console.warn(
      'Fines are not available in this Supabase schema yet. Run the latest supabase/schema.sql to enable synced fines.'
    );
    return { data: [], error: null };
  }

  return result;
}

export async function loadCloudAvailabilityRecordsForFixture(
  clubId: string,
  fixtureId: string
): Promise<AvailabilityRecord[]> {
  const client = requireSupabase();
  const result = await client.rpc('get_club_fixture_availability_records', {
    target_club_id: clubId,
    target_fixture_id: fixtureId,
  });

  await throwOnError(result.error);

  return (result.data ?? []).map(mapCloudAvailabilityRecord);
}

export async function loadCloudAvailabilityRecordsForPlayer(
  clubId: string,
  playerId: string
): Promise<AvailabilityRecord[]> {
  const client = requireSupabase();
  const result = await client
    .from('club_availability_records')
    .select('fixture_id, player_id, status')
    .eq('club_id', clubId)
    .eq('player_id', playerId);

  await throwOnError(result.error);

  return (result.data ?? []).map(mapCloudAvailabilityRecord);
}

export async function loadCloudCoreData(clubId: string): Promise<Partial<CloudCoreData> | null> {
  if (!supabase) {
    return null;
  }

  const playersResultPromise = loadCloudPlayers(clubId);
  const matchStatsResultPromise = loadCloudMatchStats(clubId);
  const trainingSessionsResultPromise = loadCloudTrainingSessions(clubId);
  const matchRotationAssignmentsResultPromise = loadCloudMatchRotationAssignments(clubId);
  const finesResultPromise = loadCloudFines(clubId);

  const [
    playersResult,
    trainingSessionsResult,
    attendanceRecordsResult,
    fixturesResult,
    matchStatsResult,
    matchLineupAssignmentsResult,
    matchRotationAssignmentsResult,
    playerDevelopmentEntriesResult,
    voteEntriesResult,
    playerVoteBallotsResult,
    fitnessResultsResult,
    finesResult,
  ] = await Promise.all([
    playersResultPromise,
    trainingSessionsResultPromise,
    supabase
      .from('club_attendance_records')
      .select('session_id, player_id, status')
      .eq('club_id', clubId),
    supabase
      .from('club_fixtures')
      .select('id, opponent, grade, squad, date, venue, is_home')
      .eq('club_id', clubId)
      .order('date', { ascending: true }),
    matchStatsResultPromise,
    supabase
      .from('club_match_lineup_assignments')
      .select('fixture_id, player_id, position')
      .eq('club_id', clubId),
    matchRotationAssignmentsResultPromise,
    supabase
      .from('club_player_development_entries')
      .select(
        'player_id, week_start, focus_areas, coaching_note, progress_status, proficiency, progress_note, generated_at, updated_at'
      )
      .eq('club_id', clubId)
      .order('week_start', { ascending: false }),
    supabase
      .from('club_vote_entries')
      .select('fixture_id, player_id, vote_type, points')
      .eq('club_id', clubId),
    supabase
      .from('club_player_vote_ballots')
      .select('fixture_id, voter_player_id, nominee_player_id')
      .eq('club_id', clubId),
    supabase
      .from('club_fitness_results')
      .select('player_id, metric, phase, value, recorded_at')
      .eq('club_id', clubId),
    finesResultPromise,
  ]);

  const snapshot: Partial<CloudCoreData> = {};
  let hasSuccessfulRead = false;

  if (playersResult.error) {
    logCloudCollectionError('players', playersResult.error);
  } else {
    snapshot.players = normalizePlayers((playersResult.data ?? []) as Player[]);
    hasSuccessfulRead = true;
  }

  if (trainingSessionsResult.error) {
    logCloudCollectionError('training sessions', trainingSessionsResult.error);
  } else {
    snapshot.trainingSessions = normalizeTrainingSessions(
      (trainingSessionsResult.data ?? []).map((session) => {
        return {
          id: session.id as string,
          title: session.title as string,
          date: session.date as string,
          location: session.location as string,
          squad: normalizePlayerSquad((session.squad as string | null | undefined) ?? null),
          goal: (session.goal as string | null | undefined) ?? null,
          focus: (session.focus as string | null | undefined) ?? null,
          sessionPlan: null,
          runPlan: [],
          detailsLoaded: false,
        };
      })
    );
    hasSuccessfulRead = true;
  }

  if (attendanceRecordsResult.error) {
    logCloudCollectionError('attendance records', attendanceRecordsResult.error);
  } else {
    snapshot.attendanceRecords = (attendanceRecordsResult.data ?? []).map((record) => {
      return {
        sessionId: record.session_id as string,
        playerId: record.player_id as string,
        status: record.status as AttendanceRecord['status'],
      };
    });
    hasSuccessfulRead = true;
  }

  if (fixturesResult.error) {
    logCloudCollectionError('fixtures', fixturesResult.error);
  } else {
    snapshot.fixtures = (fixturesResult.data ?? []).map((fixture) => {
      return {
        id: fixture.id as string,
        opponent: fixture.opponent as string,
        grade: (fixture.grade as string | null | undefined) ?? null,
        squad: normalizeFixtureSquad({
          grade: (fixture.grade as string | null | undefined) ?? null,
          squad: normalizePlayerSquad((fixture.squad as string | null | undefined) ?? null,
          ),
        }),
        date: fixture.date as string,
        venue: fixture.venue as string,
        isHome: fixture.is_home as boolean,
      };
    });
    hasSuccessfulRead = true;
  }

  if (matchStatsResult.error) {
    logCloudCollectionError('match stats', matchStatsResult.error);
  } else {
    snapshot.matchStats = normalizeMatchStats(
      (matchStatsResult.data ?? []).map((entry) => {
        return {
          fixtureId: entry.fixture_id as string,
          quarter: (entry as { quarter?: string | null }).quarter,
          metric: entry.metric as MatchStatEntry['metric'],
          team: entry.team as MatchStatEntry['team'],
          value: Number(entry.value),
        };
      })
    );
    hasSuccessfulRead = true;
  }

  if (matchLineupAssignmentsResult.error) {
    logCloudCollectionError('match lineup assignments', matchLineupAssignmentsResult.error);
  } else {
    snapshot.matchLineupAssignments = (matchLineupAssignmentsResult.data ?? []).map((assignment) => {
      return {
        fixtureId: assignment.fixture_id as string,
        playerId: assignment.player_id as string,
        position: assignment.position as MatchLineupAssignment['position'],
      };
    });
    hasSuccessfulRead = true;
  }

  if (matchRotationAssignmentsResult.error) {
    logCloudCollectionError('match rotation assignments', matchRotationAssignmentsResult.error);
  } else {
    snapshot.matchRotationAssignments = (matchRotationAssignmentsResult.data ?? []).map((assignment) => {
      return {
        fixtureId: assignment.fixture_id as string,
        playerId: assignment.player_id as string,
        group: assignment.rotation_group as MatchRotationAssignment['group'],
      };
    });
    hasSuccessfulRead = true;
  }

  if (playerDevelopmentEntriesResult.error) {
    logCloudCollectionError('player development entries', playerDevelopmentEntriesResult.error);
  } else {
    snapshot.playerDevelopmentEntries = normalizePlayerDevelopmentEntries(
      (playerDevelopmentEntriesResult.data ?? []).map((entry) => {
        return {
          playerId: entry.player_id as string,
          weekStart: entry.week_start as string,
          tasks: entry.focus_areas,
          coachingNote: (entry.coaching_note as string | null | undefined) ?? null,
          progressStatus: (entry.progress_status as string | null | undefined) ?? 'not-started',
          proficiency: entry.proficiency,
          progressNote: (entry.progress_note as string | null | undefined) ?? null,
          generatedAt: (entry.generated_at as string | null | undefined) ?? null,
          updatedAt: (entry.updated_at as string | null | undefined) ?? new Date().toISOString(),
        };
      })
    );
    hasSuccessfulRead = true;
  }

  if (voteEntriesResult.error) {
    logCloudCollectionError('vote entries', voteEntriesResult.error);
  } else {
    snapshot.voteEntries = normalizeVoteEntries(
      (voteEntriesResult.data ?? []).map((entry) => {
        return {
          fixtureId: entry.fixture_id as string,
          playerId: entry.player_id as string,
          voteType: normalizeVoteType(entry.vote_type),
          points: entry.points as number,
        };
      })
    );
    hasSuccessfulRead = true;
  }

  if (playerVoteBallotsResult.error) {
    if (isMissingTableError(playerVoteBallotsResult.error)) {
      snapshot.playerVoteBallots = [];
      logMissingOptionalTable('player vote ballots', 'public.club_player_vote_ballots');
      hasSuccessfulRead = true;
    } else {
      logCloudCollectionError('player vote ballots', playerVoteBallotsResult.error);
    }
  } else {
    snapshot.playerVoteBallots = (playerVoteBallotsResult.data ?? []).map((ballot) => {
      return {
        fixtureId: ballot.fixture_id as string,
        voterPlayerId: ballot.voter_player_id as string,
        nomineePlayerId: ballot.nominee_player_id as string,
      };
    });
    hasSuccessfulRead = true;
  }

  if (fitnessResultsResult.error) {
    logCloudCollectionError('fitness results', fitnessResultsResult.error);
  } else {
    snapshot.fitnessResults = (fitnessResultsResult.data ?? []).map((result) => {
      return {
        playerId: result.player_id as string,
        metric: result.metric as FitnessResult['metric'],
        phase: result.phase as FitnessResult['phase'],
        value: Number(result.value),
        recordedAt: result.recorded_at as string,
      };
    });
    hasSuccessfulRead = true;
  }

  if (finesResult.error) {
    logCloudCollectionError('fines', finesResult.error);
  } else {
    snapshot.fines = (finesResult.data ?? []).map((fine) => {
      return {
        id: fine.id as string,
        playerId: fine.player_id as string,
        reason: fine.reason as string,
        amount: Number(fine.amount),
        issuedAt: fine.issued_at as string,
        paid: fine.paid as boolean,
      };
    });
    hasSuccessfulRead = true;
  }

  return hasSuccessfulRead ? snapshot : null;
}

export async function upsertCloudPlayer(clubId: string, player: Player) {
  const client = requireSupabase();
  const { error } = await client.from('club_players').upsert(
    {
      club_id: clubId,
      id: player.id,
      name: player.name,
      nickname: player.nickname,
      number: player.number,
      squad: player.squad,
      role: player.role,
      active: player.active,
      primary_position: player.primaryPosition,
      secondary_position: player.secondaryPosition,
      running_profile: player.runningProfile,
      rotation_group_overrides: player.rotationGroupOverrides,
      season_goals: player.seasonGoals,
      skill_summary: player.skillSummary,
      development_level: player.developmentLevel,
    },
    { onConflict: 'club_id,id' }
  );

  await throwOnError(error);
}

export async function deleteCloudPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client.from('club_players').delete().eq('club_id', clubId).eq('id', playerId);
  await throwOnError(error);
}

export async function upsertCloudTrainingSession(clubId: string, session: TrainingSession) {
  const client = requireSupabase();
  const { error } = await client.from('club_training_sessions').upsert(
    {
      club_id: clubId,
      id: session.id,
      title: session.title,
      date: session.date,
      location: session.location,
      squad: session.squad,
      goal: session.goal,
      focus: session.focus,
      session_plan: session.sessionPlan,
      run_plan: session.runPlan,
    },
    { onConflict: 'club_id,id' }
  );

  if (isMissingColumnError(error, 'club_training_sessions.session_plan')) {
    const fallbackResult = await client.from('club_training_sessions').upsert(
      {
        club_id: clubId,
        id: session.id,
        title: session.title,
        date: session.date,
        location: session.location,
        squad: session.squad,
        goal: session.goal,
        focus: session.focus,
        run_plan: session.runPlan,
      },
      { onConflict: 'club_id,id' }
    );

    if (!fallbackResult.error) {
      console.warn(
        'Saved training session without an uploaded session plan because the remote Supabase schema is behind. Run the latest supabase/schema.sql to enable session plan uploads.'
      );
      return;
    }
  }

  if (isMissingColumnError(error, 'club_training_sessions.goal')) {
    const fallbackResult = await client.from('club_training_sessions').upsert(
      {
        club_id: clubId,
        id: session.id,
        title: session.title,
        date: session.date,
        location: session.location,
        squad: session.squad,
        focus: session.focus,
        run_plan: session.runPlan,
      },
      { onConflict: 'club_id,id' }
    );

    if (!fallbackResult.error) {
      console.warn(
        'Saved training session without a short goal because the remote Supabase schema is behind. Run the latest supabase/schema.sql to enable training goals.'
      );
      return;
    }
  }

  if (isMissingColumnError(error, 'club_training_sessions.focus')) {
    const legacyResult = await client.from('club_training_sessions').upsert(
      {
        club_id: clubId,
        id: session.id,
        title: session.title,
        date: session.date,
        location: session.location,
      },
      { onConflict: 'club_id,id' }
    );

    if (!legacyResult.error) {
      console.warn(
        'Saved training session without focus/run plan because the remote Supabase schema is behind. Run the latest supabase/schema.sql to enable structured training sessions.'
      );
      return;
    }
  }

  await throwOnError(error);
}

export async function deleteCloudTrainingSession(clubId: string, sessionId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_training_sessions')
    .delete()
    .eq('club_id', clubId)
    .eq('id', sessionId);
  await throwOnError(error);
}

export async function upsertCloudAttendanceRecord(clubId: string, record: AttendanceRecord) {
  const client = requireSupabase();
  const { error } = await client.from('club_attendance_records').upsert(
    {
      club_id: clubId,
      session_id: record.sessionId,
      player_id: record.playerId,
      status: record.status,
    },
    { onConflict: 'club_id,session_id,player_id' }
  );

  await throwOnError(error);
}

export async function deleteCloudAttendanceRecordsForSession(clubId: string, sessionId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_attendance_records')
    .delete()
    .eq('club_id', clubId)
    .eq('session_id', sessionId);
  await throwOnError(error);
}

export async function deleteCloudAttendanceRecord(
  clubId: string,
  sessionId: string,
  playerId: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_attendance_records')
    .delete()
    .eq('club_id', clubId)
    .eq('session_id', sessionId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function deleteCloudAttendanceRecordsForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_attendance_records')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function upsertCloudFixture(clubId: string, fixture: Fixture) {
  const client = requireSupabase();
  const { error } = await client.from('club_fixtures').upsert(
    {
      club_id: clubId,
      id: fixture.id,
      opponent: fixture.opponent,
      grade: fixture.grade,
      squad: fixture.squad,
      date: fixture.date,
      venue: fixture.venue,
      is_home: fixture.isHome,
    },
    { onConflict: 'club_id,id' }
  );

  await throwOnError(error);
}

export async function deleteCloudFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client.from('club_fixtures').delete().eq('club_id', clubId).eq('id', fixtureId);
  await throwOnError(error);
}

export async function upsertCloudAvailabilityRecord(clubId: string, record: AvailabilityRecord) {
  const client = requireSupabase();
  const responseResult = await client.rpc('set_club_availability_response', {
    target_club_id: clubId,
    target_fixture_id: record.fixtureId,
    target_player_id: record.playerId,
    target_status: record.status,
  });

  await throwOnError(responseResult.error);

  const savedRecord = Array.isArray(responseResult.data)
    ? responseResult.data.find((savedResponse) => {
        return (
          savedResponse.fixture_id === record.fixtureId &&
          savedResponse.player_id === record.playerId
        );
      })
    : null;

  if (!savedRecord || savedRecord.status !== record.status) {
    throw new Error(
      `Availability save was not confirmed for ${record.playerId} on ${record.fixtureId}.`
    );
  }
}

export async function deleteCloudAvailabilityRecord(
  clubId: string,
  fixtureId: string,
  playerId: string
) {
  const client = requireSupabase();
  const responseResult = await client.rpc('set_club_availability_response', {
    target_club_id: clubId,
    target_fixture_id: fixtureId,
    target_player_id: playerId,
    target_status: 'not-responded',
  });

  await throwOnError(responseResult.error);

  const fixtureRecords = await loadCloudAvailabilityRecordsForFixture(clubId, fixtureId);
  const deletedRecord = fixtureRecords.find((record) => {
    return record.playerId === playerId;
  });

  if (deletedRecord) {
    throw new Error(`Availability reset was not confirmed for ${playerId} on ${fixtureId}.`);
  }
}

export async function upsertCloudAvailabilityRecords(
  clubId: string,
  records: AvailabilityRecord[]
) {
  if (records.length === 0) {
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from('club_availability_records').upsert(
    records.map((record) => {
      return {
        club_id: clubId,
        fixture_id: record.fixtureId,
        player_id: record.playerId,
        status: record.status,
      };
    }),
    { onConflict: 'club_id,fixture_id,player_id' }
  );

  await throwOnError(error);
}

export async function deleteCloudAvailabilityRecordsForFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_availability_records')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId);
  await throwOnError(error);
}

export async function deleteCloudAvailabilityRecordsForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_availability_records')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function upsertCloudMatchStatEntry(clubId: string, entry: MatchStatEntry) {
  const client = requireSupabase();
  const { error } = await client.from('club_match_stats').upsert(
    {
      club_id: clubId,
      fixture_id: entry.fixtureId,
      quarter: entry.quarter,
      metric: entry.metric,
      team: entry.team,
      value: entry.value,
    },
    { onConflict: 'club_id,fixture_id,quarter,metric,team' }
  );

  if (!error) {
    return;
  }

  if (entry.quarter === 'game') {
    const legacyResult = await client.from('club_match_stats').upsert(
      {
        club_id: clubId,
        fixture_id: entry.fixtureId,
        metric: entry.metric,
        team: entry.team,
        value: entry.value,
      },
      { onConflict: 'club_id,fixture_id,metric,team' }
    );

    if (!legacyResult.error) {
      console.warn(
        'Saved match stat using the legacy match-stats schema. Run the latest supabase/schema.sql to enable quarter capture.'
      );
      return;
    }
  }

  await throwOnError(error);
}

export async function upsertCloudMatchLineupAssignment(
  clubId: string,
  assignment: MatchLineupAssignment
) {
  const client = requireSupabase();
  const { error } = await client.from('club_match_lineup_assignments').upsert(
    {
      club_id: clubId,
      fixture_id: assignment.fixtureId,
      player_id: assignment.playerId,
      position: assignment.position,
    },
    { onConflict: 'club_id,fixture_id,player_id' }
  );

  await throwOnError(error);
}

export async function deleteCloudMatchLineupAssignment(
  clubId: string,
  fixtureId: string,
  playerId: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_lineup_assignments')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function deleteCloudMatchLineupAssignmentsForFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_lineup_assignments')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId);
  await throwOnError(error);
}

export async function deleteCloudMatchLineupAssignmentsForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_lineup_assignments')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function upsertCloudMatchRotationAssignment(
  clubId: string,
  assignment: MatchRotationAssignment
) {
  const client = requireSupabase();
  const { error } = await client.from('club_match_rotation_assignments').upsert(
    {
      club_id: clubId,
      fixture_id: assignment.fixtureId,
      player_id: assignment.playerId,
      rotation_group: assignment.group,
    },
    { onConflict: 'club_id,fixture_id,player_id' }
  );

  if (isMissingTableError(error)) {
    console.warn(
      'Skipped saving a rotation assignment because the remote Supabase schema does not include club_match_rotation_assignments yet.'
    );
    return;
  }

  await throwOnError(error);
}

export async function deleteCloudMatchRotationAssignment(
  clubId: string,
  fixtureId: string,
  playerId: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_rotation_assignments')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId)
    .eq('player_id', playerId);

  if (isMissingTableError(error)) {
    return;
  }

  await throwOnError(error);
}

export async function deleteCloudMatchRotationAssignmentsForFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_rotation_assignments')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId);

  if (isMissingTableError(error)) {
    return;
  }

  await throwOnError(error);
}

export async function deleteCloudMatchRotationAssignmentsForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_rotation_assignments')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);

  if (isMissingTableError(error)) {
    return;
  }

  await throwOnError(error);
}

export async function deleteCloudMatchStatEntry(
  clubId: string,
  fixtureId: string,
  quarter: MatchStatEntry['quarter'],
  metric: MatchStatEntry['metric'],
  team: MatchStatEntry['team']
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_stats')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId)
    .eq('quarter', quarter)
    .eq('metric', metric)
    .eq('team', team);

  if (!error) {
    return;
  }

  if (quarter === 'game') {
    const legacyResult = await client
      .from('club_match_stats')
      .delete()
      .eq('club_id', clubId)
      .eq('fixture_id', fixtureId)
      .eq('metric', metric)
      .eq('team', team);

    if (!legacyResult.error) {
      return;
    }
  }

  await throwOnError(error);
}

export async function deleteCloudMatchStatsForFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_match_stats')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId);
  await throwOnError(error);
}

export async function upsertCloudVoteEntry(clubId: string, entry: VoteEntry) {
  const client = requireSupabase();
  const { error } = await client.from('club_vote_entries').upsert(
    {
      club_id: clubId,
      fixture_id: entry.fixtureId,
      player_id: entry.playerId,
      vote_type: entry.voteType,
      points: entry.points,
    },
    { onConflict: 'club_id,fixture_id,player_id,vote_type' }
  );

  await throwOnError(error);
}

export async function deleteCloudVoteEntry(
  clubId: string,
  fixtureId: string,
  playerId: string,
  voteType: VoteEntry['voteType']
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_vote_entries')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId)
    .eq('player_id', playerId)
    .eq('vote_type', voteType);
  await throwOnError(error);
}

export async function deleteCloudVoteEntriesForFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_vote_entries')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId);
  await throwOnError(error);
}

export async function deleteCloudVoteEntriesForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_vote_entries')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function upsertCloudPlayerVoteBallot(clubId: string, ballot: PlayerVoteBallot) {
  const client = requireSupabase();
  const { error } = await client.from('club_player_vote_ballots').upsert(
    {
      club_id: clubId,
      fixture_id: ballot.fixtureId,
      voter_player_id: ballot.voterPlayerId,
      nominee_player_id: ballot.nomineePlayerId,
    },
    { onConflict: 'club_id,fixture_id,voter_player_id' }
  );

  if (isMissingTableError(error)) {
    throw new Error('Player vote ballots are not enabled on this club yet. Run the latest supabase/schema.sql.');
  }

  await throwOnError(error);
}

export async function deleteCloudPlayerVoteBallot(
  clubId: string,
  fixtureId: string,
  voterPlayerId: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_player_vote_ballots')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId)
    .eq('voter_player_id', voterPlayerId);

  if (isMissingTableError(error)) {
    throw new Error('Player vote ballots are not enabled on this club yet. Run the latest supabase/schema.sql.');
  }

  await throwOnError(error);
}

export async function deleteCloudPlayerVoteBallotsForFixture(clubId: string, fixtureId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_player_vote_ballots')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId);

  if (isMissingTableError(error)) {
    throw new Error('Player vote ballots are not enabled on this club yet. Run the latest supabase/schema.sql.');
  }

  await throwOnError(error);
}

export async function deleteCloudPlayerVoteBallotsForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_player_vote_ballots')
    .delete()
    .eq('club_id', clubId)
    .or(`voter_player_id.eq.${playerId},nominee_player_id.eq.${playerId}`);

  if (isMissingTableError(error)) {
    throw new Error('Player vote ballots are not enabled on this club yet. Run the latest supabase/schema.sql.');
  }

  await throwOnError(error);
}

export async function upsertCloudFitnessResult(clubId: string, result: FitnessResult) {
  const client = requireSupabase();
  const { error } = await client.from('club_fitness_results').upsert(
    {
      club_id: clubId,
      player_id: result.playerId,
      metric: result.metric,
      phase: result.phase,
      value: result.value,
      recorded_at: result.recordedAt,
    },
    { onConflict: 'club_id,player_id,metric,phase' }
  );

  await throwOnError(error);
}

export async function deleteCloudFitnessResult(
  clubId: string,
  playerId: string,
  metric: FitnessResult['metric'],
  phase: FitnessResult['phase']
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_fitness_results')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId)
    .eq('metric', metric)
    .eq('phase', phase);
  await throwOnError(error);
}

export async function deleteCloudFitnessResultsForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_fitness_results')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);
  await throwOnError(error);
}

export async function upsertCloudFine(clubId: string, fine: Fine) {
  const client = requireSupabase();
  const { error } = await client.from('club_fines').upsert(
    {
      club_id: clubId,
      id: fine.id,
      player_id: fine.playerId,
      reason: fine.reason,
      amount: fine.amount,
      issued_at: fine.issuedAt,
      paid: fine.paid,
    },
    { onConflict: 'club_id,id' }
  );

  if (isMissingTableError(error)) {
    console.warn(
      'Skipped saving a fine because the remote Supabase schema does not include club_fines yet.'
    );
    return;
  }

  await throwOnError(error);
}

export async function deleteCloudFine(clubId: string, fineId: string) {
  const client = requireSupabase();
  const { error } = await client.from('club_fines').delete().eq('club_id', clubId).eq('id', fineId);

  if (isMissingTableError(error)) {
    return;
  }

  await throwOnError(error);
}

export async function deleteCloudFinesForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_fines')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);

  if (isMissingTableError(error)) {
    return;
  }

  await throwOnError(error);
}

export async function upsertCloudPlayerDevelopmentEntry(
  clubId: string,
  entry: PlayerDevelopmentEntry
) {
  const client = requireSupabase();
  const { error } = await client.from('club_player_development_entries').upsert(
    {
      club_id: clubId,
      player_id: entry.playerId,
      week_start: entry.weekStart,
      focus_areas: entry.tasks,
      coaching_note: entry.coachingNote,
      progress_status: entry.progressStatus,
      proficiency: entry.proficiency,
      progress_note: entry.progressNote,
      generated_at: entry.generatedAt,
      updated_at: entry.updatedAt,
    },
    { onConflict: 'club_id,player_id,week_start' }
  );

  await throwOnError(error);
}

export async function deleteCloudPlayerDevelopmentEntry(
  clubId: string,
  playerId: string,
  weekStart: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_player_development_entries')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId)
    .eq('week_start', weekStart);
  await throwOnError(error);
}

export async function deleteCloudPlayerDevelopmentEntriesForPlayer(clubId: string, playerId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_player_development_entries')
    .delete()
    .eq('club_id', clubId)
    .eq('player_id', playerId);
  await throwOnError(error);
}
