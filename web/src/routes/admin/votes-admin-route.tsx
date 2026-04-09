import { getPlayerDisplayName } from '@/lib/team';
import { getVoteLeaderboard, voteTypes } from '@/lib/votes';

import { useClubData } from '@web/lib/club-data-context';

export function VotesAdminRoute() {
  const { isHydrated, players, voteEntries } = useClubData();
  const leaderboards = voteTypes.map((voteType) => {
    return {
      ...voteType,
      leaderboard: getVoteLeaderboard(players, voteEntries, voteType.id),
    };
  });

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Admin</span>
        <h2>Votes leaderboard</h2>
        <p className="muted">Track the separate season ladders for player, coaches, and B&amp;F voting.</p>
      </section>

      <p className="muted">
        {isHydrated ? 'Leaderboard is using saved browser data.' : 'Loading saved votes...'}
      </p>

      {leaderboards.map((voteType) => {
        return (
          <section key={voteType.id} className="card stack">
            <div className="stack-sm">
              <h3>{voteType.label}</h3>
              <p className="muted">{voteType.description}</p>
            </div>

            {voteType.leaderboard.length > 0 ? (
              voteType.leaderboard.map((player, index) => {
                return (
                  <section key={player.id} className="nested-card stack-sm">
                    <strong>
                      {index + 1}. {getPlayerDisplayName(player)}
                    </strong>
                    <span className="muted">
                      {player.totalPoints} pts
                      {player.position ? ` • ${player.position}` : ''}
                    </span>
                  </section>
                );
              })
            ) : (
              <p className="muted">No {voteType.label.toLowerCase()} have been recorded yet.</p>
            )}
          </section>
        );
      })}
    </section>
  );
}
