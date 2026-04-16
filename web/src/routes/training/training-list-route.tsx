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

      {sessions.map((session) => {
        const summary = isPlayer ? null : getAttendanceSummary(session.id, visiblePlayers, attendanceRecords);
        const playerAttendance =
          selectedPlayer && isPlayer
            ? getAttendanceStatusForPlayer(session.id, selectedPlayer.id, attendanceRecords)
            : null;
        const isPastSession = isPastItem(session.date);

        if (isPlayer && playerAttendance) {
          return (
            <section
              key={session.id}
              ref={session.id === targetSessionId ? targetSessionRef : null}
              className={isPastSession ? 'card stack player-session-card player-session-card--past' : 'card stack player-session-card'}>
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
        }

        return (
          <section
            key={session.id}
            ref={session.id === targetSessionId ? targetSessionRef : null}
            className={isPastSession ? 'card stack schedule-card schedule-card--past' : 'card stack schedule-card'}>
            <div className="schedule-card__layout">
              <div className="stack-sm schedule-card__main">
                <h3>{session.title}</h3>
                <p className="muted">{formatDate(session.date)}</p>
                <p className="muted">{session.location}</p>
              </div>

              <div className="schedule-card__side">
                {canAccessAdmin ? (
                  <Link className="schedule-card__action text-link" to={`/training/${session.id}`}>
                    Open session
                  </Link>
                ) : (
                  <span className="muted">Session overview</span>
                )}

                <div className="schedule-card__status">
                  <div className="schedule-card__metrics">
                    {isPlayer ? (
                      null
                    ) : (
                      <>
                        <span className="metric metric--positive">{summary?.present ?? 0} present</span>
                        <span className="metric metric--negative">{summary?.absent ?? 0} absent</span>
                        <span className="metric metric--neutral">{summary?.unknown ?? 0} to confirm</span>
                      </>
                    )}
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
