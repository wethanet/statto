import { Link } from 'react-router-dom';

import { getNextTrainingSession } from '@/lib/attendance';
import { getFineSummary } from '@/lib/fines';
import { fitnessPhases, getFitnessSummary } from '@/lib/fitness';
import { getTeamSummary } from '@/lib/team';
import { getVoteLeaderboard } from '@/lib/votes';

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

  const cards = [
    {
      title: 'Player fines',
      body: `${fineSummary.outstandingCount} outstanding fines worth $${fineSummary.outstandingAmount}.`,
      to: '/admin/fines',
      action: 'Open fines workflow',
    },
    {
      title: 'B&F votes',
      body: voteLeader ? `${voteLeader.name} leads on ${voteLeader.totalPoints} votes.` : 'No B&F votes yet.',
      to: '/admin/votes',
      action: 'Open votes leaderboard',
    },
    {
      title: 'Team management',
      body: `${teamSummary.active} active players, ${teamSummary.inactive} inactive, ${teamSummary.leaders} in the leadership group.`,
      to: '/admin/team',
      action: 'Open team management',
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
      title: 'Settings',
      body: `Theme is currently set to ${themePreference}.`,
      to: '/admin/settings',
      action: 'Open settings',
    },
  ];

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Admin</span>
        <h2>Volunteer and coach workflows</h2>
        <p className="muted">
          This area holds the setup and management work that supports the rest of the app.
        </p>
      </section>

      <div className="two-column">
        {cards.map((card) => {
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
  );
}
