import type {
  AttendanceRecord,
  AvailabilityRecord,
  FitnessResult,
  Fixture,
  MatchStatEntry,
  Player,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';
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
  voteEntries: VoteEntry[];
  fitnessResults: FitnessResult[];
};

function getRowKey(row: Record<string, unknown>, keyColumns: string[]) {
  return keyColumns.map((keyColumn) => String(row[keyColumn] ?? '')).join('::');
}

async function syncRows(
  table: string,
  clubId: string,
  rows: Record<string, unknown>[],
  keyColumns: string[]
) {
  if (!supabase) {
    return;
  }

  const { data: existingRows, error: selectError } = await supabase
    .from(table)
    .select(keyColumns.join(','))
    .eq('club_id', clubId);

  if (selectError) {
    throw selectError;
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from(table).upsert(rows, {
      onConflict: keyColumns.join(','),
    });

    if (upsertError) {
      throw upsertError;
    }
  }

  const desiredKeys = new Set(rows.map((row) => getRowKey(row, keyColumns)));
  const staleRows = ((existingRows ?? []) as unknown as Record<string, unknown>[]).filter((row) => {
    return !desiredKeys.has(getRowKey(row, keyColumns));
  });

  for (const staleRow of staleRows) {
    let query = supabase.from(table).delete();

    for (const keyColumn of keyColumns) {
      query = query.eq(keyColumn, staleRow[keyColumn] as string | number | boolean);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      throw deleteError;
    }
  }
}

export async function loadCloudCoreData(clubId: string): Promise<CloudCoreData | null> {
  if (!supabase) {
    return null;
  }

  const [
    playersResult,
    trainingSessionsResult,
    attendanceRecordsResult,
    fixturesResult,
    availabilityRecordsResult,
    matchStatsResult,
    voteEntriesResult,
    fitnessResultsResult,
  ] = await Promise.all([
    supabase
      .from('club_players')
      .select('id, name, number, position, squad, role, active')
      .eq('club_id', clubId)
      .order('number', { ascending: true }),
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
    supabase
      .from('club_match_stats')
      .select('fixture_id, metric, team, value')
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

  const errors = [
    playersResult.error,
    trainingSessionsResult.error,
    attendanceRecordsResult.error,
    fixturesResult.error,
    availabilityRecordsResult.error,
    matchStatsResult.error,
    voteEntriesResult.error,
    fitnessResultsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const players = normalizePlayers((playersResult.data ?? []) as Player[]);
  const trainingSessions = (trainingSessionsResult.data ?? []) as TrainingSession[];
  const attendanceRecords = (attendanceRecordsResult.data ?? []).map((record) => {
    return {
      sessionId: record.session_id as string,
      playerId: record.player_id as string,
      status: record.status as AttendanceRecord['status'],
    };
  });
  const fixtures = (fixturesResult.data ?? []).map((fixture) => {
    return {
      id: fixture.id as string,
      opponent: fixture.opponent as string,
      grade: (fixture.grade as string | null | undefined) ?? null,
      date: fixture.date as string,
      venue: fixture.venue as string,
      isHome: fixture.is_home as boolean,
    };
  });
  const availabilityRecords = (availabilityRecordsResult.data ?? []).map((record) => {
    return {
      fixtureId: record.fixture_id as string,
      playerId: record.player_id as string,
      status: record.status as AvailabilityRecord['status'],
    };
  });
  const matchStats = (matchStatsResult.data ?? []).map((entry) => {
    return {
      fixtureId: entry.fixture_id as string,
      metric: entry.metric as MatchStatEntry['metric'],
      team: entry.team as MatchStatEntry['team'],
      value: Number(entry.value),
    };
  });
  const voteEntries = normalizeVoteEntries(
    (voteEntriesResult.data ?? []).map((entry) => {
      return {
        fixtureId: entry.fixture_id as string,
        playerId: entry.player_id as string,
        voteType: normalizeVoteType(entry.vote_type),
        points: entry.points as number,
      };
    })
  );
  const fitnessResults = (fitnessResultsResult.data ?? []).map((result) => {
    return {
      playerId: result.player_id as string,
      metric: result.metric as FitnessResult['metric'],
      phase: result.phase as FitnessResult['phase'],
      value: Number(result.value),
      recordedAt: result.recorded_at as string,
    };
  });

  const hasData =
    players.length > 0 ||
    trainingSessions.length > 0 ||
    attendanceRecords.length > 0 ||
    fixtures.length > 0 ||
    availabilityRecords.length > 0 ||
    matchStats.length > 0 ||
    voteEntries.length > 0 ||
    fitnessResults.length > 0;

  if (!hasData) {
    return null;
  }

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
}

export async function saveCloudCoreData(clubId: string, data: CloudCoreData) {
  if (!supabase) {
    return;
  }

  await Promise.all([
    syncRows(
      'club_players',
      clubId,
      data.players.map((player) => {
        return {
          club_id: clubId,
          id: player.id,
          name: player.name,
          number: player.number,
          position: player.position,
          squad: player.squad,
          role: player.role,
          active: player.active,
        };
      }),
      ['club_id', 'id']
    ),
    syncRows(
      'club_training_sessions',
      clubId,
      data.trainingSessions.map((session) => {
        return {
          club_id: clubId,
          id: session.id,
          title: session.title,
          date: session.date,
          location: session.location,
        };
      }),
      ['club_id', 'id']
    ),
    syncRows(
      'club_attendance_records',
      clubId,
      data.attendanceRecords.map((record) => {
        return {
          club_id: clubId,
          session_id: record.sessionId,
          player_id: record.playerId,
          status: record.status,
        };
      }),
      ['club_id', 'session_id', 'player_id']
    ),
    syncRows(
      'club_fixtures',
      clubId,
      data.fixtures.map((fixture) => {
        return {
          club_id: clubId,
          id: fixture.id,
          opponent: fixture.opponent,
          grade: fixture.grade,
          date: fixture.date,
          venue: fixture.venue,
          is_home: fixture.isHome,
        };
      }),
      ['club_id', 'id']
    ),
    syncRows(
      'club_availability_records',
      clubId,
      data.availabilityRecords.map((record) => {
        return {
          club_id: clubId,
          fixture_id: record.fixtureId,
          player_id: record.playerId,
          status: record.status,
        };
      }),
      ['club_id', 'fixture_id', 'player_id']
    ),
    syncRows(
      'club_match_stats',
      clubId,
      data.matchStats.map((entry) => {
        return {
          club_id: clubId,
          fixture_id: entry.fixtureId,
          metric: entry.metric,
          team: entry.team,
          value: entry.value,
        };
      }),
      ['club_id', 'fixture_id', 'metric', 'team']
    ),
    syncRows(
      'club_vote_entries',
      clubId,
      data.voteEntries.map((entry) => {
        return {
          club_id: clubId,
          fixture_id: entry.fixtureId,
          player_id: entry.playerId,
          vote_type: entry.voteType,
          points: entry.points,
        };
      }),
      ['club_id', 'fixture_id', 'player_id', 'vote_type']
    ),
    syncRows(
      'club_fitness_results',
      clubId,
      data.fitnessResults.map((result) => {
        return {
          club_id: clubId,
          player_id: result.playerId,
          metric: result.metric,
          phase: result.phase,
          value: result.value,
          recorded_at: result.recordedAt,
        };
      }),
      ['club_id', 'player_id', 'metric', 'phase']
    ),
  ]);
}
