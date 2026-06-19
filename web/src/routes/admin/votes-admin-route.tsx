import { getPlayerDisplayName } from '@/lib/team';
import { aggregatePlayerVoteBallots, getVoteLeaderboard, voteTypes } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { AdminRecordList, AdminSection, AdminSummaryStrip } from '@web/components/admin/admin-workflow';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';

export function VotesAdminRoute() {
  useEnsureClubCollections(['playerVoteBallots', 'players', 'voteEntries']);

  const { isHydrated, playerVoteBallots, players, voteEntries } = useClubData();
  const { canViewPlayer } = useClubPermissions();
  const visiblePlayers = players.filter((player) => canViewPlayer(player));
  const aggregatedPlayerVotes = aggregatePlayerVoteBallots(playerVoteBallots);
  const leaderboards = voteTypes.map((voteType) => {
    const sourceEntries =
      voteType.id === 'players'
        ? [
            ...voteEntries.filter((entry) => entry.voteType !== 'players'),
            ...voteEntries.filter((entry) => entry.voteType === 'players'),
            ...aggregatedPlayerVotes,
          ]
        : voteEntries;

    return {
      ...voteType,
      leaderboard: getVoteLeaderboard(visiblePlayers, sourceEntries, voteType.id),
    };
  });

  return (
    <AdminPageShell
      description="Track the separate season ladders for player, coaches, and B&F voting."
      title="Votes leaderboard">
      <AdminSection
        eyebrow="Context"
        title="Vote coverage"
        description={isHydrated ? 'Leaderboard is using saved browser data.' : 'Loading saved votes...'}>
        <AdminSummaryStrip
          items={leaderboards.map((voteType) => ({
            label: voteType.label,
            value: voteType.leaderboard[0] ? getPlayerDisplayName(voteType.leaderboard[0]) : 'None yet',
            note: voteType.leaderboard[0] ? `${voteType.leaderboard[0].totalPoints} pts` : 'waiting on votes',
          }))}
        />
      </AdminSection>

      {leaderboards.map((voteType) => {
        return (
          <AdminSection
            key={voteType.id}
            eyebrow="Records"
            title={voteType.label}
            description={voteType.description}>
            <AdminRecordList title={`${voteType.label} leaderboard`} description="Players appear once votes have been recorded.">
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
            </AdminRecordList>
          </AdminSection>
        );
      })}
    </AdminPageShell>
  );
}
