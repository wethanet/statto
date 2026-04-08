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

export function getNextTrainingSession(sessions: TrainingSession[]) {
  return getSortedTrainingSessions(sessions).find((session) => {
    return new Date(session.date).getTime() >= Date.now();
  }) ?? getSortedTrainingSessions(sessions)[0];
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
