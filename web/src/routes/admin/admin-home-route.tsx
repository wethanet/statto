import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getNextTrainingSession } from '@/lib/attendance';
import { getFineSummary } from '@/lib/fines';
import { fitnessPhases, getFitnessSummary } from '@/lib/fitness';
import { getTeamSummary } from '@/lib/team';
import { getVoteLeaderboard } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminSection,
  AdminSummaryStrip,
  AdminSupportingPanel,
} from '@web/components/admin/admin-workflow';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';
import { useSettings } from '@web/lib/settings-context';
import { supabase } from '@web/lib/supabase';

export function AdminHomeRoute() {
  useEnsureClubCollections([
    'fines',
    'fitnessResults',
    'players',
    'trainingSessions',
    'voteEntries',
  ]);

  const {
    fines,
    fitnessResults,
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
        ...(policySettings.rotationGroupsEnabled
          ? [
              {
                title: 'Rotation groups',
                body: 'Review the automated AFL rotation plan and adjust player support groups.',
                to: '/admin/rotation-groups',
                action: 'Open rotation groups',
              },
            ]
          : []),
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
      <AdminSection
        eyebrow="Overview"
        title="Club status"
        description="A quick read on the areas that usually need attention before training or match day.">
        <AdminSummaryStrip items={quickStats} />
      </AdminSection>

      <AdminSection
        eyebrow="Primary workflow"
        title="Response follow-up"
        description="Send reminders from live club data. Match availability is checked on the server, not hydrated into this dashboard.">
        <AdminSupportingPanel
          title="Response reminders"
          description="The reminder service checks active players, upcoming training, and upcoming match availability before sending."
          actions={
            <button
              className="button"
              disabled={isSendingReminders}
              onClick={() => void handleSendResponseReminders()}
              type="button">
              {isSendingReminders ? 'Sending...' : 'Send reminders'}
            </button>
          }>
          {reminderMessage ? <p className="auth-message">{reminderMessage}</p> : null}
        </AdminSupportingPanel>
      </AdminSection>

      {cardSections.map((section) => (
        <AdminSection key={section.title} title={section.title} description={section.description}>
          <div className="two-column">
            {section.cards.map((card) => {
              return (
                <AdminSupportingPanel key={card.to} title={card.title} description={card.body}>
                  <Link className="text-link" to={card.to}>
                    {card.action}
                  </Link>
                </AdminSupportingPanel>
              );
            })}
          </div>
        </AdminSection>
      ))}
    </AdminPageShell>
  );
}
