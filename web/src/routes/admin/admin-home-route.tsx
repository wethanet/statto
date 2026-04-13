import { Link } from 'react-router-dom';

import { getNextTrainingSession } from '@/lib/attendance';
import { getFineSummary } from '@/lib/fines';
import { fitnessPhases, getFitnessSummary } from '@/lib/fitness';
import { getTeamSummary } from '@/lib/team';
import { getVoteLeaderboard } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { useClubData } from '@web/lib/club-data-context';
import { useSettings } from '@web/lib/settings-context';

export function AdminHomeRoute() {
  const { fines, fitnessResults, players, trainingSessions, voteEntries } = useClubData();
  const { themePreference } = useSettings();
  const fineSummary = getFineSummary(fines);
  const leaderboard = getVoteLeaderboard(players, voteEntries, 'best-and-fairest');
  const teamSummary = getTeamSummary(players);
  const voteLeader = leaderboard[0];
  const nextTraining = getNextTrainingSession(trainingSessions);
  const fitnessSummary = fitnessPhases.reduce((total, phase) => {
    return total + getFitnessSummary(players, fitnessResults, phase.id).completed;
  }, 0);

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
          to: '/admin/training',
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
