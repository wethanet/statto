import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { getAttendanceStatusForPlayer, getAttendanceSummary, getSortedTrainingSessions, upsertAttendanceRecord } from '@/lib/attendance';

const attendanceOptions = [
  {
    label: 'Attending',
    value: 'present',
    className: 'pill-button pill-button--compact pill-button--positive',
  },
  {
    label: 'Out',
    value: 'absent',
    className: 'pill-button pill-button--compact pill-button--negative',
  },
  {
    label: 'Unsure',
    value: 'unknown',
    className: 'pill-button pill-button--compact pill-button--neutral',
  },
] as const;

function getPlayerAttendanceLabel(status: 'present' | 'absent' | 'unknown') {
  if (status === 'present') {
    return 'Attending';
  }

  if (status === 'absent') {
    return 'Out';
  }

  return 'Awaiting response';
}

function getPlayerAttendanceTone(status: 'present' | 'absent' | 'unknown') {
  if (status === 'present') {
    return 'status-pill status-pill--positive';
  }

  if (status === 'absent') {
    return 'status-pill status-pill--negative';
  }

  return 'status-pill status-pill--neutral';
}

function renderBoardMetric(value: number, label: string, tone: 'positive' | 'negative' | 'neutral') {
  return (
    <span className={`schedule-board__metric schedule-board__metric--${tone}`}>
      <span className="schedule-board__metric-value">{value}</span>
      <span className="schedule-board__metric-label">{label}</span>
    </span>
  );
}

import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { usePlayerProfile } from '@web/lib/player-profile-context';

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
  const { attendanceRecords, players, trainingSessions, setAttendanceRecords } = useClubData();
  const { canAccessAdmin, canViewPlayer, canViewSquadItem, isPlayer } = useClubPermissions();
  const { selectedPlayer } = usePlayerProfile();
  const visiblePlayers = useMemo(() => {
    return players.filter((player) => canViewPlayer(player));
  }, [canViewPlayer, players]);
  const sessions = useMemo(() => {
    const visibleSessions = trainingSessions.filter((session) => canViewSquadItem(session.squad));

    if (isPlayer) {
      return getSortedTrainingSessions(
        visibleSessions.filter((session) => {
          return !isPastItem(session.date);
        })
      );
    }

    return getSortedTrainingSessions(visibleSessions);
  }, [canViewSquadItem, isPlayer, trainingSessions]);
  const targetSessionId = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    const lastPastSession = [...sessions]
      .reverse()
      .find((session) => {
        return isPastItem(session.date);
      });

    return lastPastSession?.id ?? sessions[0]?.id ?? null;
  }, [sessions]);
  const targetSessionRef = useRef<HTMLElement | null>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (hasScrolledRef.current || !targetSessionId || !targetSessionRef.current) {
      return;
    }

    targetSessionRef.current.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    });
    hasScrolledRef.current = true;
  }, [targetSessionId]);

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Training</span>
        <h2>{isPlayer ? 'Your training schedule' : 'Track weekly attendance'}</h2>
        <p className="muted">
          {isPlayer
            ? 'See the training sessions for your squad and check your own attendance status.'
            : 'Keep training sessions organized and attendance up to date each week.'}
        </p>
      </section>

      {sessions.length === 0 ? (
        <section className="card stack">
          <h3>No sessions yet</h3>
          <p className="muted">
            {canAccessAdmin
              ? 'Add your first training session from the admin area to start tracking attendance.'
              : 'Training sessions will appear here once your coach adds them.'}
          </p>
          {canAccessAdmin ? (
            <Link className="text-link" to="/admin/training">
              Open training setup
            </Link>
          ) : null}
        </section>
      ) : null}

      {!isPlayer ? (
        <section className="schedule-board">
          <div className="schedule-board__header schedule-board__row--training">
            <span>Session</span>
            <span>Location</span>
            <span>Attendance</span>
            <span>Action</span>
          </div>
          <div className="schedule-board__body">
            {sessions.map((session) => {
              const summary = getAttendanceSummary(session.id, visiblePlayers, attendanceRecords);
              const isPastSession = isPastItem(session.date);

              return (
                <section
                  key={session.id}
                  ref={session.id === targetSessionId ? targetSessionRef : null}
                  className={
                    isPastSession
                      ? 'schedule-board__row schedule-board__row--training schedule-board__row--past'
                      : 'schedule-board__row schedule-board__row--training'
                  }>
                  <div className="schedule-board__cell schedule-board__primary">
                    <h3 className="schedule-board__title">{session.title}</h3>
                    <p className="schedule-board__meta">{formatDate(session.date)}</p>
                  </div>

                  <div className="schedule-board__cell">
                    <p className="schedule-board__venue">{session.location}</p>
                  </div>

                  <div className="schedule-board__cell">
                    <div className="schedule-board__metrics">
                      {renderBoardMetric(summary.present, 'present', 'positive')}
                      {renderBoardMetric(summary.absent, 'absent', 'negative')}
                      {renderBoardMetric(summary.unknown, 'to confirm', 'neutral')}
                    </div>
                  </div>

                  <div className="schedule-board__cell">
                    {canAccessAdmin ? (
                      <Link className="schedule-card__action schedule-board__action text-link" to={`/training/${session.id}`}>
                        Open session
                      </Link>
                    ) : (
                      <span className="schedule-board__hint">Session overview</span>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      {isPlayer
        ? sessions.map((session) => {
            const playerAttendance =
              selectedPlayer && isPlayer
                ? getAttendanceStatusForPlayer(session.id, selectedPlayer.id, attendanceRecords)
                : null;
            const isPastSession = isPastItem(session.date);

            if (!playerAttendance) {
              return null;
            }

            return (
              <section
                key={session.id}
                ref={session.id === targetSessionId ? targetSessionRef : null}
                className={
                  isPastSession ? 'card stack player-session-card player-session-card--past' : 'card stack player-session-card'
                }>
                <div className="player-session-card__header">
                  <div className="stack-sm">
                    <h3>{session.title}</h3>
                    <p className="muted">{formatDate(session.date)}</p>
                    <p className="muted">{session.location}</p>
                  </div>

                  <div className="player-session-card__response">
                    <span className="player-session-card__label">Your attendance</span>
                    <span className={getPlayerAttendanceTone(playerAttendance)}>
                      {getPlayerAttendanceLabel(playerAttendance)}
                    </span>
                  </div>
                </div>

                {!isPastSession && selectedPlayer ? (
                  <div className="player-session-card__actions">
                    {attendanceOptions.map((option) => {
                      const isSelected = option.value === playerAttendance;

                      return (
                        <button
                          key={option.value}
                          className={isSelected ? `${option.className} pill-button--selected` : option.className}
                          onClick={() => {
                            setAttendanceRecords((current) => {
                              return upsertAttendanceRecord(current, session.id, selectedPlayer.id, option.value);
                            });
                          }}
                          type="button">
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })
        : null}
    </section>
  );
}
