import type {
  AttendanceRecord,
  AvailabilityRecord,
  Fixture,
  Player,
  TrainingSession,
  VoteEntry,
} from '@/lib/types';
import { supabase } from '@/lib/supabase';

export type CloudCoreData = {
  players: Player[];
  trainingSessions: TrainingSession[];
  attendanceRecords: AttendanceRecord[];
  fixtures: Fixture[];
  availabilityRecords: AvailabilityRecord[];
  voteEntries: VoteEntry[];
};

async function replaceRows(table: string, clubId: string, rows: Record<string, unknown>[]) {
  if (!supabase) {
    return;
  }

  const { error: deleteError } = await supabase.from(table).delete().eq('club_id', clubId);

  if (deleteError) {
    throw deleteError;
  }

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from(table).insert(rows);

  if (insertError) {
    throw insertError;
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
    voteEntriesResult,
  ] = await Promise.all([
    supabase
      .from('club_players')
      .select('id, name, number, position, role, active')
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
      .from('club_vote_entries')
      .select('fixture_id, player_id, points')
      .eq('club_id', clubId),
  ]);

  const errors = [
    playersResult.error,
    trainingSessionsResult.error,
    attendanceRecordsResult.error,
    fixturesResult.error,
    availabilityRecordsResult.error,
    voteEntriesResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const players = (playersResult.data ?? []) as Player[];
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
  const voteEntries = (voteEntriesResult.data ?? []).map((entry) => {
    return {
      fixtureId: entry.fixture_id as string,
      playerId: entry.player_id as string,
      points: entry.points as number,
    };
  });

  const hasData =
    players.length > 0 ||
    trainingSessions.length > 0 ||
    attendanceRecords.length > 0 ||
    fixtures.length > 0 ||
    availabilityRecords.length > 0 ||
    voteEntries.length > 0;

  if (!hasData) {
    return null;
  }

  return {
    players,
    trainingSessions,
    attendanceRecords,
    fixtures,
    availabilityRecords,
    voteEntries,
  };
}

export async function saveCloudCoreData(clubId: string, data: CloudCoreData) {
  if (!supabase) {
    return;
  }

  await Promise.all([
    replaceRows(
      'club_players',
      clubId,
      data.players.map((player) => {
        return {
          club_id: clubId,
          id: player.id,
          name: player.name,
          number: player.number ?? null,
          position: player.position?.trim() || null,
          role: player.role,
          active: player.active,
        };
      })
    ),
    replaceRows(
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
      })
    ),
    replaceRows(
      'club_attendance_records',
      clubId,
      data.attendanceRecords.map((record) => {
        return {
          club_id: clubId,
          session_id: record.sessionId,
          player_id: record.playerId,
          status: record.status,
        };
      })
    ),
    replaceRows(
      'club_fixtures',
      clubId,
      data.fixtures.map((fixture) => {
        return {
          club_id: clubId,
          id: fixture.id,
          opponent: fixture.opponent,
          grade: fixture.grade?.trim() || null,
          date: fixture.date,
          venue: fixture.venue,
          is_home: fixture.isHome,
        };
      })
    ),
    replaceRows(
      'club_availability_records',
      clubId,
      data.availabilityRecords.map((record) => {
        return {
          club_id: clubId,
          fixture_id: record.fixtureId,
          player_id: record.playerId,
          status: record.status,
        };
      })
    ),
    replaceRows(
      'club_vote_entries',
      clubId,
      data.voteEntries.map((entry) => {
        return {
          club_id: clubId,
          fixture_id: entry.fixtureId,
          player_id: entry.playerId,
          points: entry.points,
        };
      })
    ),
  ]);
}
