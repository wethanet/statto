import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAttendanceSummary,
  getPlayersForSession,
  getTrainingSessionById,
  upsertAttendanceRecord,
} from '@/lib/attendance';
import { getPlayerSortValue } from '@/lib/team';
import type { TrainingSessionPlanAttachment } from '@/lib/types';

import { AttendancePlayerRow } from '@web/components/attendance-player-row';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { openTrainingSessionPlan } from '@web/lib/training-session-plan';

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

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isSessionPlanImage(plan: TrainingSessionPlanAttachment | null) {
  return plan?.type.startsWith('image/') === true;
}

export function TrainingDetailRoute() {
  const { sessionId = '' } = useParams();
  const {
    attendanceRecords,
    isHydrated,
    loadTrainingSessionDetails,
    players,
    setAttendanceRecords,
    trainingSessions,
  } = useClubData();
  const { canAccessAdmin, canViewSquadItem } = useClubPermissions();
  const [sortBy, setSortBy] = useState<PlayerSort>('number');
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [isLoadingSessionDetails, setIsLoadingSessionDetails] = useState(false);
  const session = getTrainingSessionById(sessionId, trainingSessions);

  useEffect(() => {
    if (!session || session.detailsLoaded) {
      return;
    }

    let isMounted = true;
    setIsLoadingSessionDetails(true);
    setPlanMessage(null);

    loadTrainingSessionDetails(session.id)
      .catch(() => {
        if (isMounted) {
          setPlanMessage('Could not load the session plan. Try refreshing the page.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSessionDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadTrainingSessionDetails, session]);

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

  if (!canViewSquadItem(session.squad)) {
    return (
      <section className="page-grid">
        <section className="panel stack">
          <span className="eyebrow">Training</span>
          <h2>Training session not available</h2>
          <p className="muted">This session is outside your squad access.</p>
          <Link className="text-link" to="/training">
            Back to training
          </Link>
        </section>
      </section>
    );
  }

  const summary = getAttendanceSummary(session.id, players, attendanceRecords);
  const totalPlayers = players.length;
  const respondedCount = summary.present + summary.absent;
  const responseRate = totalPlayers > 0 ? Math.round((respondedCount / totalPlayers) * 100) : 0;
  const isPastSession = new Date(session.date).getTime() < Date.now();
  const responseLabel =
    respondedCount > 0
      ? `${respondedCount} of ${totalPlayers} players have checked in`
      : `Waiting on ${totalPlayers} players to respond`;

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Training session</span>
        <h2>{session.title}</h2>
        <p className="muted">{formatDate(session.date)}</p>
        <p className="muted">{session.location}</p>
        {session.goal ? <p className="muted">Goal: {session.goal}</p> : null}
        {!session.detailsLoaded || isLoadingSessionDetails ? (
          <p className="muted">Loading session plan...</p>
        ) : session.sessionPlan ? (
          <p className="muted">
            Session plan attached: {session.sessionPlan.name} • {formatFileSize(session.sessionPlan.size)}
          </p>
        ) : (
          <p className="muted">No session plan has been uploaded yet.</p>
        )}
      </section>

      {session.sessionPlan ? (
        <section className="card stack">
          <div className="split-row session-plan-compact">
            <div className="stack-sm">
              <h3>Session plan</h3>
              <p className="muted">Use this plan to run the session with the coaching and leadership group.</p>
            </div>
            <button
              className="button button--secondary"
              onClick={() => {
                if (!openTrainingSessionPlan(session.sessionPlan!)) {
                  setPlanMessage('Could not open the session plan. Ask an admin to re-upload it.');
                }
              }}
              type="button">
              Open plan
            </button>
          </div>
          {planMessage ? <p className="muted">{planMessage}</p> : null}
          {isSessionPlanImage(session.sessionPlan) ? (
            <img alt="" className="session-plan-preview__image session-plan-preview__image--full" src={session.sessionPlan.dataUrl} />
          ) : (
            <div className="session-plan-compact__file">
              <span className="session-plan-compact__badge">PDF</span>
              <div className="stack-sm">
                <strong>{session.sessionPlan.name}</strong>
                <p className="muted">{formatFileSize(session.sessionPlan.size)}</p>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {canAccessAdmin ? (
        <>
          <section className="card stack">
            <div className="split-row availability-summary__header">
              <div className="stack-sm">
                <h3>Session summary</h3>
                <p className="muted">
                  {isPastSession
                    ? 'Past-session attendance can still be corrected by coaches.'
                    : isHydrated
                      ? 'Attendance saves immediately for everyone in the club workspace.'
                      : 'Loading saved attendance...'}
                </p>
              </div>
              <div className="availability-summary__response">
                <span className="availability-summary__response-value">{responseRate}%</span>
                <span className="availability-summary__response-label">Attendance rate</span>
              </div>
            </div>

            <div className="availability-summary__tiles">
              <article className="availability-tile availability-tile--positive">
                <span className="availability-tile__label">Present</span>
                <strong className="availability-tile__value">{summary.present}</strong>
                <span className="availability-tile__caption">Ready for training</span>
              </article>
              <article className="availability-tile availability-tile--negative">
                <span className="availability-tile__label">Absent</span>
                <strong className="availability-tile__value">{summary.absent}</strong>
                <span className="availability-tile__caption">Unavailable tonight</span>
              </article>
              <article className="availability-tile availability-tile--neutral">
                <span className="availability-tile__label">Unknown</span>
                <strong className="availability-tile__value">{summary.unknown}</strong>
                <span className="availability-tile__caption">Still to confirm</span>
              </article>
            </div>

            <div className="availability-summary__progress">
              <div className="split-row">
                <span>{responseLabel}</span>
                <span className="muted">{totalPlayers} total players</span>
              </div>
              <div className="availability-summary__progress-track" aria-hidden="true">
                <div className="availability-summary__progress-fill" style={{ width: `${responseRate}%` }} />
              </div>
            </div>

            <div className="availability-summary__controls">
              <div className="stack-sm">
                <span className="eyebrow">Roster order</span>
                <div className="inline-actions">
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
              </div>

              <div className="training-summary__status stack-sm">
                <span className="eyebrow">Session status</span>
                <p className="muted">
                  Mark players as present or absent to keep the training record accurate.
                </p>
                <p className="training-summary__status-value">
                  {summary.unknown > 0
                    ? `${summary.unknown} players still need a response`
                    : isPastSession
                      ? 'Historical attendance reviewed'
                      : 'All players have responded'}
                </p>
              </div>
            </div>
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
        </>
      ) : null}
    </section>
  );
}
