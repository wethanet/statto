import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fixture,
  MatchStatEntry,
  MatchLineupAssignment,
  Player,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';
import { normalizeMatchStats } from '@/lib/match-stats';
import { normalizePlayers } from '@/lib/team';
import { normalizeVoteEntries, normalizeVoteType } from '@/lib/votes';

import { supabase } from '@web/lib/supabase';

export type CloudCoreData = {
  players: Player[];
  trainingSessions: TrainingSession[];
  attendanceRecords: AttendanceRecord[];
  fixtures: Fixture[];
  availabilityRecords: AvailabilityRecord[];
  matchStats: MatchStatEntry[];
  matchLineupAssignments: MatchLineupAssignment[];
  voteEntries: VoteEntry[];
  fitnessResults: FitnessResult[];
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

async function loadCloudPlayers(clubId: string) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const preferredResult = await supabase
    .from('club_players')
    .select('id, name, nickname, number, squad, role, active')
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

export async function loadCloudCoreData(clubId: string): Promise<Partial<CloudCoreData> | null> {
  if (!supabase) {
    return null;
  }

  const playersResultPromise = loadCloudPlayers(clubId);
  const matchStatsResultPromise = loadCloudMatchStats(clubId);

  const [
    playersResult,
    trainingSessionsResult,
    attendanceRecordsResult,
    fixturesResult,
    availabilityRecordsResult,
    matchStatsResult,
    matchLineupAssignmentsResult,
    voteEntriesResult,
    fitnessResultsResult,
  ] = await Promise.all([
    playersResultPromise,
    supabase
      .from('club_training_sessions')
      .select('id, title, date, location')
      .eq('club_id', clubId)
      .order('date', { ascending: true }),
    supabase
      .from('club_attendance_records')
      .select('session_id, player_id, status')
      .eq('club_id', clubId),
    supabase
      .from('club_fixtures')
      .select('id, opponent, grade, date, venue, is_home')
      .eq('club_id', clubId)
      .order('date', { ascending: true }),
    supabase
      .from('club_availability_records')
      .select('fixture_id, player_id, status')
      .eq('club_id', clubId),
    matchStatsResultPromise,
    supabase
      .from('club_match_lineup_assignments')
      .select('fixture_id, player_id, position')
      .eq('club_id', clubId),
    supabase
      .from('club_vote_entries')
      .select('fixture_id, player_id, vote_type, points')
      .eq('club_id', clubId),
    supabase
      .from('club_fitness_results')
      .select('player_id, metric, phase, value, recorded_at')
      .eq('club_id', clubId),
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
    snapshot.trainingSessions = (trainingSessionsResult.data ?? []) as TrainingSession[];
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
        date: fixture.date as string,
        venue: fixture.venue as string,
        isHome: fixture.is_home as boolean,
      };
    });
    hasSuccessfulRead = true;
  }

  if (availabilityRecordsResult.error) {
    logCloudCollectionError('availability records', availabilityRecordsResult.error);
  } else {
    snapshot.availabilityRecords = (availabilityRecordsResult.data ?? []).map((record) => {
      return {
        fixtureId: record.fixture_id as string,
        playerId: record.player_id as string,
        status: record.status as AvailabilityRecord['status'],
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
    },
    { onConflict: 'club_id,id' }
  );

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
  const { error } = await client.from('club_availability_records').upsert(
    {
      club_id: clubId,
      fixture_id: record.fixtureId,
      player_id: record.playerId,
      status: record.status,
    },
    { onConflict: 'club_id,fixture_id,player_id' }
  );

  await throwOnError(error);
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

export async function deleteCloudAvailabilityRecord(
  clubId: string,
  fixtureId: string,
  playerId: string
) {
  const client = requireSupabase();
  const { error } = await client
    .from('club_availability_records')
    .delete()
    .eq('club_id', clubId)
    .eq('fixture_id', fixtureId)
    .eq('player_id', playerId);
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
