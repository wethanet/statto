import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { getAttendanceSummary, getSortedTrainingSessions } from '@/lib/attendance';

import { useClubData } from '@web/lib/club-data-context';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function isPastItem(value: string) {
  return new Date(value).getTime() < Date.now();
}

export function TrainingListRoute() {
  const { attendanceRecords, players, trainingSessions } = useClubData();
  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Training</span>
        <h2>Track weekly attendance</h2>
        <p className="muted">Keep training sessions organized and attendance up to date each week.</p>
      </section>

      {sessions.length === 0 ? (
        <section className="card stack">
          <h3>No sessions yet</h3>
          <p className="muted">
            Add your first training session from the admin area to start tracking attendance.
          </p>
          <Link className="text-link" to="/admin/training">
            Open training setup
          </Link>
        </section>
      ) : null}

      {sessions.map((session) => {
        const summary = getAttendanceSummary(session.id, players, attendanceRecords);
        const isPastSession = isPastItem(session.date);

        return (
          <section
            key={session.id}
            className={isPastSession ? 'card stack schedule-card schedule-card--past' : 'card stack schedule-card'}>
            <div className="schedule-card__layout">
              <div className="stack-sm schedule-card__main">
                <h3>{session.title}</h3>
                <p className="muted">{formatDate(session.date)}</p>
                <p className="muted">{session.location}</p>
              </div>

              <div className="schedule-card__side">
                <Link className="schedule-card__action text-link" to={`/training/${session.id}`}>
                  Open session
                </Link>

                <div className="schedule-card__status">
                  <div className="schedule-card__metrics">
                    <span className="metric metric--positive">{summary.present} present</span>
                    <span className="metric metric--negative">{summary.absent} absent</span>
                    <span className="metric metric--neutral">{summary.unknown} to confirm</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </section>
  );
}
