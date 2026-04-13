import { getPlayerDisplayName } from '@/lib/team';
import { getVoteLeaderboard, voteTypes } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
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
    <AdminPageShell
      description="Track the separate season ladders for player, coaches, and B&F voting."
      title="Votes leaderboard">
      <section className="card stack">
        <p className="muted">
          {isHydrated ? 'Leaderboard is using saved browser data.' : 'Loading saved votes...'}
        </p>
      </section>

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
                    <span className="muted">{player.totalPoints} pts</span>
                  </section>
                );
              })
            ) : (
              <p className="muted">No {voteType.label.toLowerCase()} have been recorded yet.</p>
            )}
          </section>
        );
      })}
    </AdminPageShell>
  );
}
