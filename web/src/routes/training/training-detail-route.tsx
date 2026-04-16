import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAttendanceSummary,
  getPlayersForSession,
  getTrainingRunPlanDuration,
  getTrainingSessionById,
  upsertAttendanceRecord,
} from '@/lib/attendance';
import { getPlayerSortValue } from '@/lib/team';
import { resolveTrainingSessionStructure } from '@/lib/training-session-suggestions';

import { AttendancePlayerRow } from '@web/components/attendance-player-row';
import { TrainingSessionStructureCard } from '@web/components/training/training-session-structure-card';
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
  const resolvedStructure = resolveTrainingSessionStructure(session, trainingSessions);
  const displaySession = {
    ...session,
    focus: resolvedStructure.focus,
    runPlan: resolvedStructure.runPlan,
  };
  const totalPlayers = players.length;
  const respondedCount = summary.present + summary.absent;
  const responseRate = totalPlayers > 0 ? Math.round((respondedCount / totalPlayers) * 100) : 0;
  const plannedMinutes = getTrainingRunPlanDuration(displaySession);
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
        <p className="muted">
          {displaySession.runPlan.length}{' '}
          {displaySession.runPlan.length === 1 ? 'drill planned' : 'drills planned'}
          {plannedMinutes > 0 ? ` • ${plannedMinutes} min run plan` : ''}
        </p>
      </section>

      <TrainingSessionStructureCard isSuggested={resolvedStructure.isSuggested} session={displaySession} />

      <section className="card stack">
        <div className="split-row availability-summary__header">
          <div className="stack-sm">
            <h3>Session summary</h3>
            <p className="muted">
              {isHydrated
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
              Mark players as present or absent to keep a clean roll-up before training starts.
            </p>
            <p className="training-summary__status-value">
              {summary.unknown > 0
                ? `${summary.unknown} players still need a response`
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
    </section>
  );
}
