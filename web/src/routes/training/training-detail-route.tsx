import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAttendanceSummary,
  getPlayersForSession,
  getTrainingSessionById,
  upsertAttendanceRecord,
} from '@/lib/attendance';
import { getPlayerSortValue } from '@/lib/team';

import { AttendancePlayerRow } from '@web/components/attendance-player-row';
import { useClubData } from '@web/lib/club-data-context';

type PlayerSort = 'name' | 'number';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function TrainingDetailRoute() {
  const { sessionId = '' } = useParams();
  const { attendanceRecords, isHydrated, players, setAttendanceRecords, trainingSessions } =
    useClubData();
  const [sortBy, setSortBy] = useState<PlayerSort>('number');
  const session = getTrainingSessionById(sessionId, trainingSessions);

  const playersForSession = useMemo(() => {
    if (!session) {
      return [];
    }

    return getPlayersForSession(session.id, players, attendanceRecords);
  }, [attendanceRecords, players, session]);

  const sortedPlayers = useMemo(() => {
    return [...playersForSession].sort((left, right) => {
      if (sortBy === 'name') {
        return (
          left.name.localeCompare(right.name) ||
          getPlayerSortValue(left.number) - getPlayerSortValue(right.number)
        );
      }

      return (
        getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
        left.name.localeCompare(right.name)
      );
    });
  }, [playersForSession, sortBy]);

  if (!session) {
    return (
      <section className="page-grid">
        <section className="panel stack">
          <span className="eyebrow">Training</span>
          <h2>Training session not found</h2>
          <p className="muted">Check the selected session and try again.</p>
          <Link className="text-link" to="/training">
            Back to training
          </Link>
        </section>
      </section>
    );
  }

  const summary = getAttendanceSummary(session.id, players, attendanceRecords);

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Training session</span>
        <h2>{session.title}</h2>
        <p className="muted">{formatDate(session.date)}</p>
        <p className="muted">{session.location}</p>
      </section>

      <section className="card stack">
        <h3>Session summary</h3>
        <div className="metric-row">
          <span className="metric metric--positive">{summary.present} present</span>
          <span className="metric metric--negative">{summary.absent} absent</span>
          <span className="metric metric--neutral">{summary.unknown} to confirm</span>
        </div>
        <div className="inline-actions">
          <span className="muted">Order by</span>
          <button
            className={sortBy === 'number' ? 'pill-button pill-button--selected' : 'pill-button'}
            onClick={() => setSortBy('number')}
            type="button">
            Number
          </button>
          <button
            className={sortBy === 'name' ? 'pill-button pill-button--selected' : 'pill-button'}
            onClick={() => setSortBy('name')}
            type="button">
            Name
          </button>
        </div>
        <p className="muted">
          {isHydrated ? 'Attendance changes are saving in the browser app.' : 'Loading saved attendance...'}
        </p>
      </section>

      <section className="card selection-table">
        {sortedPlayers.map((player) => {
          return (
            <AttendancePlayerRow
              key={player.id}
              onChange={(status) => {
                setAttendanceRecords((current) => {
                  return upsertAttendanceRecord(current, session.id, player.id, status);
                });
              }}
              player={player}
              status={player.attendanceStatus}
            />
          );
        })}
      </section>
    </section>
  );
}
