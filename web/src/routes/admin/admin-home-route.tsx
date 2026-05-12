import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getNextTrainingSession, getSortedTrainingSessions } from '@/lib/attendance';
import { getPlayerAvailabilityLockReason, getSortedFixtures } from '@/lib/availability';
import { getFineSummary } from '@/lib/fines';
import { fitnessPhases, getFitnessSummary } from '@/lib/fitness';
import { getTeamSummary } from '@/lib/team';
import { getVoteLeaderboard } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';
import { useSettings } from '@web/lib/settings-context';
import { supabase } from '@web/lib/supabase';

function isFutureEvent(value: string, now: number) {
  return new Date(value).getTime() >= now;
}

function canPlayerSeeSquadItem(playerSquad: string | null, eventSquad: string | null) {
  return eventSquad === null || playerSquad === null || eventSquad === playerSquad;
}

export function AdminHomeRoute() {
  const {
    attendanceRecords,
    availabilityRecords,
    fines,
    fitnessResults,
    fixtures,
    players,
    trainingSessions,
    voteEntries,
  } = useClubData();
  const { activeClubId } = useClubAccess();
  const { policySettings } = useClubPolicy();
  const { themePreference } = useSettings();
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const fineSummary = getFineSummary(fines);
  const leaderboard = getVoteLeaderboard(players, voteEntries, 'best-and-fairest');
  const teamSummary = getTeamSummary(players);
  const voteLeader = leaderboard[0];
  const nextTraining = getNextTrainingSession(trainingSessions);
  const responseReminderSummary = useMemo(() => {
    const now = Date.now();
    const activePlayers = players.filter((player) => player.active);
    const pendingTrainingSessions = getSortedTrainingSessions(trainingSessions).filter((session) => {
      return isFutureEvent(session.date, now);
    });
    const pendingFixtures = getSortedFixtures(fixtures).filter((fixture) => {
      return (
        isFutureEvent(fixture.date, now) &&
        !getPlayerAvailabilityLockReason(fixture.date, now, policySettings.availabilityLockDays)
      );
    });
    let playerCount = 0;
    let responseCount = 0;

    for (const player of activePlayers) {
      const missingTrainingResponses = pendingTrainingSessions.filter((session) => {
        return (
          canPlayerSeeSquadItem(player.squad, session.squad) &&
          !attendanceRecords.some((record) => record.sessionId === session.id && record.playerId === player.id)
        );
      }).length;
      const missingMatchResponses = pendingFixtures.filter((fixture) => {
        return (
          canPlayerSeeSquadItem(player.squad, fixture.squad) &&
          !availabilityRecords.some((record) => record.fixtureId === fixture.id && record.playerId === player.id)
        );
      }).length;
      const playerMissingCount = missingTrainingResponses + missingMatchResponses;

      if (playerMissingCount > 0) {
        playerCount += 1;
        responseCount += playerMissingCount;
      }
    }

    return {
      playerCount,
      responseCount,
    };
  }, [
    attendanceRecords,
    availabilityRecords,
    fixtures,
    players,
    policySettings.availabilityLockDays,
    trainingSessions,
  ]);
  const fitnessSummary = fitnessPhases.reduce((total, phase) => {
    return total + getFitnessSummary(players, fitnessResults, phase.id).completed;
  }, 0);

  async function handleSendResponseReminders() {
    if (!activeClubId || !supabase) {
      setReminderMessage('Supabase is not configured for reminders.');
      return;
    }

    setIsSendingReminders(true);
    setReminderMessage(null);

    const { data, error } = await supabase.functions.invoke<{ sent: number; skipped: number }>(
      'send-response-reminders',
      {
        body: {
          actionUrl: `${window.location.origin}/player`,
          clubId: activeClubId,
        },
      }
    );

    setIsSendingReminders(false);

    if (error) {
      setReminderMessage(error.message);
      return;
    }

    const sentCount = data?.sent ?? 0;
    setReminderMessage(
      sentCount > 0
        ? `Sent ${sentCount} ${sentCount === 1 ? 'reminder' : 'reminders'}.`
        : 'No linked players currently need reminder emails.'
    );
  }

  const cardSections = [
    {
      title: 'Setup',
      description: 'Create and configure the season structures your coaches work from.',
      cards: [
        {
          title: 'Player setup',
          body: 'Add new players manually or import the squad from CSV without cluttering the management screen.',
          to: '/admin/team-setup',
          action: 'Open player setup',
        },
        {
          title: 'Training setup',
          body: nextTraining ? `Next session is ${nextTraining.title}.` : 'No training sessions have been added yet.',
          to: nextTraining ? '/admin/training' : '/admin/training/new',
          action: 'Add training session',
        },
        {
          title: 'Match setup',
          body: 'Set up new fixtures before collecting player availability.',
          to: '/admin/matches',
          action: 'Add match',
        },
      ],
    },
    {
      title: 'Management',
      description: 'Keep the roster and season admin work tidy day to day.',
      cards: [
        {
          title: 'Team management',
          body: `${teamSummary.active} active players, ${teamSummary.inactive} inactive, ${teamSummary.leaders} in the leadership group.`,
          to: '/admin/team',
          action: 'Open team management',
        },
        {
          title: 'Rotation groups',
          body: 'Review the automated AFL rotation plan and adjust player support groups.',
          to: '/admin/rotation-groups',
          action: 'Open rotation groups',
        },
        {
          title: 'Player development',
          body: 'Set season goals, track weekly growth, and generate focused coaching priorities.',
          to: '/admin/development',
          action: 'Open development plans',
        },
        {
          title: 'Player fines',
          body: `${fineSummary.outstandingCount} outstanding fines worth $${fineSummary.outstandingAmount}.`,
          to: '/admin/fines',
          action: 'Open fines workflow',
        },
      ],
    },
    {
      title: 'Review',
      description: 'Check season-wide tracking and staff-facing summaries.',
      cards: [
        {
          title: 'Fitness tracking',
          body:
            fitnessSummary > 0
              ? `${fitnessSummary} fitness results recorded across the season checkpoints.`
              : 'No fitness results recorded yet.',
          to: '/admin/fitness',
          action: 'Open fitness tracking',
        },
        {
          title: 'B&F votes',
          body: voteLeader ? `${voteLeader.name} leads on ${voteLeader.totalPoints} votes.` : 'No B&F votes yet.',
          to: '/admin/votes',
          action: 'Open votes leaderboard',
        },
        {
          title: 'Settings',
          body: `Theme is currently set to ${themePreference}.`,
          to: '/admin/settings',
          action: 'Open settings',
        },
      ],
    },
  ] as const;

  const quickStats = [
    {
      label: 'Active players',
      value: String(teamSummary.active),
      note: `${teamSummary.total} on the list`,
    },
    {
      label: 'Outstanding fines',
      value: `$${fineSummary.outstandingAmount}`,
      note: `${fineSummary.outstandingCount} unpaid`,
    },
    {
      label: 'Fitness logged',
      value: String(fitnessSummary),
      note: 'season checkpoints',
    },
    {
      label: 'Vote leader',
      value: voteLeader ? voteLeader.name : 'None yet',
      note: voteLeader ? `${voteLeader.totalPoints} pts` : 'waiting on votes',
    },
  ];

  return (
    <AdminPageShell
      description="Keep club setup, roster changes, and season admin work organized from one place."
      title="Admin workspace">
      <section className="admin-summary-grid">
        {quickStats.map((stat) => (
          <section className="card stack-sm" key={stat.label}>
            <span className="eyebrow">{stat.label}</span>
            <strong className="admin-summary-grid__value">{stat.value}</strong>
            <span className="muted">{stat.note}</span>
          </section>
        ))}
      </section>

      <section className="card stack">
        <div className="split-row">
          <div className="stack-sm">
            <span className="eyebrow">Notifications</span>
            <h3>Response reminders</h3>
            <p className="muted">
              {responseReminderSummary.responseCount > 0
                ? `${responseReminderSummary.playerCount} active players have ${responseReminderSummary.responseCount} training or match responses still outstanding.`
                : 'No outstanding training or match responses for active players.'}
            </p>
          </div>
          <button
            className="button"
            disabled={isSendingReminders || responseReminderSummary.responseCount <= 0}
            onClick={() => void handleSendResponseReminders()}
            type="button">
            {isSendingReminders ? 'Sending...' : 'Send reminders'}
          </button>
        </div>
        {reminderMessage ? <p className="auth-message">{reminderMessage}</p> : null}
      </section>

      {cardSections.map((section) => (
        <section className="admin-section" key={section.title}>
          <div className="admin-section__header">
            <div className="stack-sm">
              <h3>{section.title}</h3>
              <p className="muted">{section.description}</p>
            </div>
          </div>

          <div className="two-column">
            {section.cards.map((card) => {
              return (
                <section key={card.to} className="card stack">
                  <h3>{card.title}</h3>
                  <p className="muted">{card.body}</p>
                  <Link className="text-link" to={card.to}>
                    {card.action}
                  </Link>
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </AdminPageShell>
  );
}
