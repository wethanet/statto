import type { AttendanceRecord, AttendanceStatus, Player, TrainingSession } from '@/lib/types';

type AttendanceSummary = {
  present: number;
  absent: number;
  unknown: number;
};

function byDateAscending<T extends { date: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    return new Date(left.date).getTime() - new Date(right.date).getTime();
  });
}

export function getSortedTrainingSessions(sessions: TrainingSession[]) {
  return byDateAscending(sessions);
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
  }
) {
  const session: TrainingSession = {
    id: `ts-${Date.now()}`,
    title: input.title.trim(),
    date: input.date,
    location: input.location.trim(),
  };

  return [...sessions, session];
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
