import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { getPlayerAvailabilityLockReason, getSortedFixtures } from '@/lib/availability';
import { getSortedTrainingSessions } from '@/lib/attendance';

import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { useClubPolicy } from '@web/lib/club-policy-context';

type PlayerReminderPanelProps = {
  playerId: string;
};

type ReminderItem = {
  id: string;
  label: string;
  title: string;
  meta: string;
  timestamp: number;
  to: string;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function isFutureEvent(value: string, now: number) {
  return new Date(value).getTime() >= now;
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function PlayerReminderPanel({ playerId }: PlayerReminderPanelProps) {
  useEnsureClubCollections([
    'attendanceRecords',
    'fixtures',
    'matchLineupAssignments',
    'trainingSessions',
  ]);

  const {
    attendanceRecords,
    availabilityRecords,
    fixtures,
    refreshAvailabilityRecordsForPlayer,
    trainingSessions,
  } = useClubData();
  const { canViewSquadItem } = useClubPermissions();
  const { policySettings } = useClubPolicy();

  useEffect(() => {
    void refreshAvailabilityRecordsForPlayer(playerId);
  }, [playerId, refreshAvailabilityRecordsForPlayer]);

  const { fixtureReminderCount, reminders, trainingReminderCount } = useMemo(() => {
    const now = Date.now();
    const pendingTrainingSessions = getSortedTrainingSessions(
      trainingSessions.filter((session) => {
        const hasResponse = attendanceRecords.some((record) => {
          return record.sessionId === session.id && record.playerId === playerId;
        });

        return isFutureEvent(session.date, now) && canViewSquadItem(session.squad) && !hasResponse;
      })
    );
    const pendingFixtures = getSortedFixtures(
      fixtures.filter((fixture) => {
        const hasResponse = availabilityRecords.some((record) => {
          return record.fixtureId === fixture.id && record.playerId === playerId;
        });
        const lockReason = getPlayerAvailabilityLockReason(
          fixture.date,
          now,
          policySettings.availabilityLockDays
        );

        return isFutureEvent(fixture.date, now) && canViewSquadItem(fixture.squad) && !hasResponse && !lockReason;
      })
    );
    const trainingItems: ReminderItem[] = pendingTrainingSessions.map((session) => ({
      id: `training-${session.id}`,
      label: 'Training attendance',
      title: session.title,
      meta: `${formatEventDate(session.date)} • ${session.location}`,
      timestamp: new Date(session.date).getTime(),
      to: '/training',
    }));
    const fixtureItems: ReminderItem[] = pendingFixtures.map((fixture) => ({
      id: `fixture-${fixture.id}`,
      label: 'Match availability',
      title: `vs ${fixture.opponent}`,
      meta: `${formatEventDate(fixture.date)} • ${fixture.venue}`,
      timestamp: new Date(fixture.date).getTime(),
      to: '/player/availability',
    }));

    return {
      fixtureReminderCount: fixtureItems.length,
      reminders: [...fixtureItems, ...trainingItems]
        .sort((left, right) => left.timestamp - right.timestamp)
        .slice(0, 4),
      trainingReminderCount: trainingItems.length,
    };
  }, [
    attendanceRecords,
    availabilityRecords,
    canViewSquadItem,
    fixtures,
    playerId,
    policySettings.availabilityLockDays,
    trainingSessions,
  ]);
  const totalReminders = trainingReminderCount + fixtureReminderCount;

  if (totalReminders === 0) {
    return null;
  }

  return (
    <section aria-live="polite" className="card stack player-reminder-panel">
      <div className="split-row">
        <div className="stack-sm">
          <span className="eyebrow">Actions</span>
          <h3>Responses needed</h3>
          <p className="muted">Complete your training and match responses before coaches lock in plans.</p>
        </div>
        <span className="status-pill status-pill--neutral player-reminder-panel__count">
          {formatCountLabel(totalReminders, 'action', 'actions')}
        </span>
      </div>

      <div className="player-reminder-panel__summary" aria-label="Responses needed">
        <Link className="player-reminder-panel__summary-item" to="/training">
          <span className="player-reminder-panel__summary-value">{trainingReminderCount}</span>
          <span>
            <strong>Training</strong>
            <span className="muted">
              {formatCountLabel(trainingReminderCount, 'response needed', 'responses needed')}
            </span>
          </span>
        </Link>
        <Link className="player-reminder-panel__summary-item" to="/player/availability">
          <span className="player-reminder-panel__summary-value">{fixtureReminderCount}</span>
          <span>
            <strong>Matches</strong>
            <span className="muted">
              {formatCountLabel(fixtureReminderCount, 'response needed', 'responses needed')}
            </span>
          </span>
        </Link>
      </div>

      <div className="player-reminder-panel__list">
        {reminders.map((reminder) => (
          <Link className="player-reminder-panel__item" key={reminder.id} to={reminder.to}>
            <span>
              <strong>{reminder.label}</strong>
              <span className="muted">{reminder.title}</span>
            </span>
            <span className="player-reminder-panel__meta">{reminder.meta}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
