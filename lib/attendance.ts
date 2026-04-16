import type {
  AttendanceRecord,
  AttendanceStatus,
  Player,
  PlayerSquad,
  TrainingSession,
  TrainingSessionDrill,
  TrainingSessionDrillMedia,
} from '@/lib/types';
import { normalizePlayerSquad } from '@/lib/team';

type AttendanceSummary = {
  present: number;
  absent: number;
  unknown: number;
};

type PartialTrainingSession = Pick<TrainingSession, 'id' | 'title' | 'date' | 'location'> &
  Partial<TrainingSession>;

type PartialTrainingSessionDrill = Pick<TrainingSessionDrill, 'id' | 'title'> &
  Partial<TrainingSessionDrill>;

type PartialTrainingSessionDrillMedia = Pick<TrainingSessionDrillMedia, 'id' | 'type' | 'url'> &
  Partial<TrainingSessionDrillMedia>;

function byDateAscending<T extends { date: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    return new Date(left.date).getTime() - new Date(right.date).getTime();
  });
}

export function getSortedTrainingSessions(sessions: TrainingSession[]) {
  return byDateAscending(sessions);
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeTrainingDrillMedia(
  media: PartialTrainingSessionDrillMedia,
  index: number
): TrainingSessionDrillMedia {
  return {
    id: media.id || `drill-media-${index + 1}`,
    type: media.type === 'video' ? 'video' : 'image',
    url: media.url?.trim() ?? '',
    caption: normalizeOptionalText(media.caption),
  };
}

function normalizeTrainingDrill(
  drill: PartialTrainingSessionDrill,
  index: number
): TrainingSessionDrill {
  return {
    id: drill.id || `drill-${index + 1}`,
    title: drill.title?.trim() ?? '',
    durationMinutes:
      typeof drill.durationMinutes === 'number' && Number.isFinite(drill.durationMinutes)
        ? Math.max(0, Math.round(drill.durationMinutes))
        : null,
    description: normalizeOptionalText(drill.description),
    coachingPoints: normalizeOptionalText(drill.coachingPoints),
    media: Array.isArray(drill.media)
      ? drill.media
          .map((item, mediaIndex) => {
            return normalizeTrainingDrillMedia(item, mediaIndex);
          })
          .filter((item) => {
            return item.url.length > 0;
          })
      : [],
  };
}

export function normalizeTrainingSessions(sessions: PartialTrainingSession[]) {
  return sessions.map((session) => {
    return {
      id: session.id,
      title: session.title.trim(),
      date: session.date,
      location: session.location.trim(),
      squad: normalizePlayerSquad(session.squad ?? null),
      focus: normalizeOptionalText(session.focus),
      runPlan: Array.isArray(session.runPlan)
        ? session.runPlan.map((drill, index) => {
            return normalizeTrainingDrill(drill, index);
          })
        : [],
    } satisfies TrainingSession;
  });
}

export function getTrainingSessionById(sessionId: string, sessions: TrainingSession[]) {
  return sessions.find((session) => {
    return session.id === sessionId;
  });
}

export function getNextTrainingSession(sessions: TrainingSession[]) {
  const sortedSessions = getSortedTrainingSessions(sessions);

  return sortedSessions.find((session) => {
    return new Date(session.date).getTime() >= Date.now();
  }) ?? sortedSessions[0];
}

export function addTrainingSession(
  sessions: TrainingSession[],
  input: {
    title: string;
    date: string;
    location: string;
    squad?: PlayerSquad | null;
    focus?: string | null;
    runPlan?: TrainingSessionDrill[];
  }
) {
  const session: TrainingSession = {
    id: `ts-${Date.now()}`,
    title: input.title.trim(),
    date: input.date,
    location: input.location.trim(),
    squad: input.squad ?? null,
    focus: normalizeOptionalText(input.focus),
    runPlan: normalizeTrainingSessions([
      {
        id: 'draft-session',
        title: input.title,
        date: input.date,
        location: input.location,
        squad: input.squad ?? null,
        focus: input.focus ?? null,
        runPlan: input.runPlan ?? [],
      },
    ])[0].runPlan,
  };

  return [...sessions, session];
}

export function updateTrainingSession(
  sessions: TrainingSession[],
  sessionId: string,
  input: {
    title: string;
    date: string;
    location: string;
    squad?: PlayerSquad | null;
    focus?: string | null;
    runPlan?: TrainingSessionDrill[];
  }
) {
  return sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    return normalizeTrainingSessions([
      {
        ...session,
        title: input.title,
        date: input.date,
        location: input.location,
        squad: input.squad ?? null,
        focus: input.focus ?? null,
        runPlan: input.runPlan ?? [],
      },
    ])[0];
  });
}

export function deleteTrainingSession(sessions: TrainingSession[], sessionId: string) {
  return sessions.filter((session) => {
    return session.id !== sessionId;
  });
}

export function deleteAttendanceRecordsForSession(records: AttendanceRecord[], sessionId: string) {
  return records.filter((record) => {
    return record.sessionId !== sessionId;
  });
}

export function deleteAttendanceRecordsForPlayer(records: AttendanceRecord[], playerId: string) {
  return records.filter((record) => {
    return record.playerId !== playerId;
  });
}

export function getAttendanceStatusForPlayer(
  sessionId: string,
  playerId: string,
  records: AttendanceRecord[]
): AttendanceStatus {
  return records.find((record) => {
    return record.sessionId === sessionId && record.playerId === playerId;
  })?.status ?? 'unknown';
}

export function getAttendanceSummary(
  sessionId: string,
  players: Player[],
  records: AttendanceRecord[]
): AttendanceSummary {
  return players.reduce<AttendanceSummary>(
    (summary, player) => {
      const status = getAttendanceStatusForPlayer(sessionId, player.id, records);
      summary[status] += 1;
      return summary;
    },
    { present: 0, absent: 0, unknown: 0 }
  );
}

export function getPlayersForSession(
  sessionId: string,
  players: Player[],
  records: AttendanceRecord[]
) {
  return players.map((player) => {
    return {
      ...player,
      attendanceStatus: getAttendanceStatusForPlayer(sessionId, player.id, records),
    };
  });
}

export function getTrainingRunPlanDuration(session: TrainingSession) {
  return session.runPlan.reduce((total, drill) => {
    return total + (drill.durationMinutes ?? 0);
  }, 0);
}

export function upsertAttendanceRecord(
  records: AttendanceRecord[],
  sessionId: string,
  playerId: string,
  status: AttendanceStatus
) {
  const nextRecords = records.filter((record) => {
    return !(record.sessionId === sessionId && record.playerId === playerId);
  });

  nextRecords.push({ sessionId, playerId, status });

  return nextRecords;
}
