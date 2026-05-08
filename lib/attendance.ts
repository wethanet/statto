import type {
  AttendanceRecord,
  AttendanceStatus,
  Player,
  PlayerSquad,
  TrainingSession,
  TrainingSessionDrill,
  TrainingSessionPlanAttachment,
} from '@/lib/types';
import { normalizePlayerSquad } from '@/lib/team';

type AttendanceSummary = {
  present: number;
  absent: number;
  unknown: number;
};

type PartialTrainingSession = Pick<TrainingSession, 'id' | 'title' | 'date' | 'location'> &
  Partial<Omit<TrainingSession, 'runPlan'>> & {
    runPlan?: PartialTrainingSessionDrill[];
  };

type PartialTrainingSessionDrill = {
  id?: string;
  name?: string | null;
  title?: string | null;
  lengthMinutes?: number | null;
  durationMinutes?: number | null;
  link?: string | null;
  skills?: unknown;
  media?: Array<{ url?: string | null }> | null;
};

export const TRAINING_WARM_UP_BLOCK_ID = 'training-warm-up-block';

export function createTrainingWarmUpBlock(): TrainingSessionDrill {
  return {
    id: TRAINING_WARM_UP_BLOCK_ID,
    name: 'Warm-up',
    lengthMinutes: 20,
    link: null,
    skills: ['Preparation', 'Movement quality'],
  };
}

export function isTrainingWarmUpBlock(drill: Pick<TrainingSessionDrill, 'id' | 'name'> | { id?: string; title?: string | null; name?: string | null }) {
  const label = 'name' in drill ? drill.name : drill.title;
  const normalizedLabel = (label ?? '').trim().toLowerCase();

  return drill.id === TRAINING_WARM_UP_BLOCK_ID || normalizedLabel === 'warm-up' || normalizedLabel === 'warm up';
}

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

function normalizeTrainingDrillLength(drill: PartialTrainingSessionDrill, fallback: number) {
  const rawLength = drill.lengthMinutes ?? drill.durationMinutes;

  if (typeof rawLength !== 'number' || !Number.isFinite(rawLength)) {
    return fallback;
  }

  return Math.max(1, Math.round(rawLength));
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTrainingSessionPlan(value: unknown): TrainingSessionPlanAttachment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const attachment = value as Partial<TrainingSessionPlanAttachment>;
  const name = normalizeOptionalText(attachment.name);
  const type = normalizeOptionalText(attachment.type);
  const dataUrl = normalizeOptionalText(attachment.dataUrl);
  const uploadedAt = normalizeOptionalText(attachment.uploadedAt);
  const size = typeof attachment.size === 'number' && Number.isFinite(attachment.size)
    ? Math.max(0, Math.round(attachment.size))
    : 0;

  if (!name || !type || !dataUrl || !uploadedAt) {
    return null;
  }

  return {
    name,
    type,
    size,
    dataUrl,
    uploadedAt,
  };
}

function getLegacyDrillLink(drill: PartialTrainingSessionDrill) {
  if (drill.link) {
    return drill.link;
  }

  return drill.media?.find((media) => {
    return Boolean(media.url?.trim());
  })?.url ?? null;
}

function normalizeTrainingDrill(
  drill: PartialTrainingSessionDrill,
  index: number
): TrainingSessionDrill {
  if (isTrainingWarmUpBlock(drill)) {
    return {
      ...createTrainingWarmUpBlock(),
      id: drill.id || TRAINING_WARM_UP_BLOCK_ID,
      name: normalizeOptionalText(drill.name ?? drill.title) ?? 'Warm-up',
      lengthMinutes: normalizeTrainingDrillLength(drill, 20),
      link: normalizeOptionalText(drill.link),
      skills: normalizeStringList(drill.skills).length > 0
        ? normalizeStringList(drill.skills)
        : createTrainingWarmUpBlock().skills,
    };
  }

  return {
    id: drill.id || `drill-${index + 1}`,
    name: normalizeOptionalText(drill.name ?? drill.title) ?? '',
    lengthMinutes: normalizeTrainingDrillLength(drill, 12),
    link: normalizeOptionalText(getLegacyDrillLink(drill)),
    skills: normalizeStringList(drill.skills),
  };
}

function ensureTrainingWarmUpBlock(runPlan: TrainingSessionDrill[]) {
  const existingWarmUp = runPlan.find(isTrainingWarmUpBlock);
  const remainingDrills = runPlan.filter((drill) => {
    return !isTrainingWarmUpBlock(drill);
  });

  return [existingWarmUp ?? createTrainingWarmUpBlock(), ...remainingDrills];
}

export function normalizeTrainingSessions(sessions: PartialTrainingSession[]) {
  return sessions.map((session) => {
    return {
      id: session.id,
      title: session.title.trim(),
      date: session.date,
      location: session.location.trim(),
      squad: normalizePlayerSquad(session.squad ?? null),
      goal: normalizeOptionalText(session.goal),
      focus: normalizeOptionalText(session.focus),
      sessionPlan: normalizeTrainingSessionPlan(session.sessionPlan),
      runPlan: ensureTrainingWarmUpBlock(
        Array.isArray(session.runPlan)
          ? session.runPlan.map((drill, index) => {
              return normalizeTrainingDrill(drill, index);
            })
          : []
      ),
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
    goal?: string | null;
    focus?: string | null;
    sessionPlan?: TrainingSessionPlanAttachment | null;
    runPlan?: TrainingSessionDrill[];
  }
) {
  const session: TrainingSession = {
    id: `ts-${Date.now()}`,
    title: input.title.trim(),
    date: input.date,
    location: input.location.trim(),
    squad: input.squad ?? null,
    goal: normalizeOptionalText(input.goal),
    focus: normalizeOptionalText(input.focus),
    sessionPlan: normalizeTrainingSessionPlan(input.sessionPlan),
    runPlan: normalizeTrainingSessions([
      {
        id: 'draft-session',
        title: input.title,
        date: input.date,
        location: input.location,
        squad: input.squad ?? null,
        goal: input.goal ?? null,
        focus: input.focus ?? null,
        sessionPlan: input.sessionPlan ?? null,
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
    goal?: string | null;
    focus?: string | null;
    sessionPlan?: TrainingSessionPlanAttachment | null;
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
        goal: input.goal ?? null,
        focus: input.focus ?? null,
        sessionPlan: input.sessionPlan ?? null,
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
    return total + drill.lengthMinutes;
  }, 0);
}

export function hasTrainingDrillLink(drill: TrainingSessionDrill) {
  if (isTrainingWarmUpBlock(drill)) {
    return true;
  }

  return Boolean(drill.link?.trim());
}

export function getTrainingSessionLinkCoverage(session: Pick<TrainingSession, 'runPlan'>) {
  const linkRequiredDrills = session.runPlan.filter((drill) => {
    return !isTrainingWarmUpBlock(drill);
  });
  const totalDrills = linkRequiredDrills.length;
  const drillsWithLinks = linkRequiredDrills.filter(hasTrainingDrillLink).length;

  return {
    totalDrills,
    drillsWithLinks,
    missingLinks: totalDrills - drillsWithLinks,
  };
}

export const hasTrainingDrillMedia = hasTrainingDrillLink;
export const getTrainingSessionMediaCoverage = getTrainingSessionLinkCoverage;

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
