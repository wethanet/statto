import { useMemo, useState } from 'react';

import { buildGamesPlayedByGrade, getPlayerGamesPlayedSummary, normalizeGradeLabel } from '@/lib/games-played';
import { getPlayerDisplayName, getSortedTeam } from '@/lib/team';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';

type PlayerFilter = 'active' | 'all';

function getSummaryGradeGames(
  summary: ReturnType<typeof getPlayerGamesPlayedSummary>,
  gradeLabel: string
) {
  const gradeKey = normalizeGradeLabel(gradeLabel).toLocaleLowerCase('en-AU');
  const matchingEntry = Object.entries(summary.byGrade).find(([grade]) => {
    return normalizeGradeLabel(grade).toLocaleLowerCase('en-AU') === gradeKey;
  });

  return matchingEntry?.[1] ?? 0;
}

function getReportGradeColumns(
  gamesPlayedByPlayer: ReturnType<typeof buildGamesPlayedByGrade>,
  fallbackGrades: string[]
) {
  const gradeLabels = new Map<string, string>();

  Object.values(gamesPlayedByPlayer).forEach((summary) => {
    summary.gradeTotals.forEach((entry) => {
      const label = normalizeGradeLabel(entry.grade);
      gradeLabels.set(label.toLocaleLowerCase('en-AU'), label);
    });
  });

  fallbackGrades.forEach((grade) => {
    const label = normalizeGradeLabel(grade);
    gradeLabels.set(label.toLocaleLowerCase('en-AU'), label);
  });

  return [...gradeLabels.values()].sort((left, right) => left.localeCompare(right));
}

export function GamesPlayedReportRoute() {
  const { fixtures, matchLineupAssignments, players } = useClubData();
  const { policySettings } = useClubPolicy();
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('active');
  const gamesPlayedByPlayer = useMemo(() => {
    return buildGamesPlayedByGrade(fixtures, matchLineupAssignments, policySettings);
  }, [fixtures, matchLineupAssignments, policySettings]);
  const gradeColumns = useMemo(() => {
    return getReportGradeColumns(gamesPlayedByPlayer, [
      policySettings.higherGradeLabel,
      policySettings.lowerGradeLabel,
    ]);
  }, [gamesPlayedByPlayer, policySettings.higherGradeLabel, policySettings.lowerGradeLabel]);
  const reportPlayers = useMemo(() => {
    const visiblePlayers = playerFilter === 'active' ? players.filter((player) => player.active) : players;

    return getSortedTeam(visiblePlayers);
  }, [playerFilter, players]);
  const reportTotals = gradeColumns.map((grade) => {
    return reportPlayers.reduce((total, player) => {
      return total + getSummaryGradeGames(getPlayerGamesPlayedSummary(gamesPlayedByPlayer, player.id), grade);
    }, 0);
  });
  const seasonTotal = reportPlayers.reduce((total, player) => {
    return total + getPlayerGamesPlayedSummary(gamesPlayedByPlayer, player.id).total;
  }, 0);

  return (
    <AdminPageShell
      description="Review how many past lineup selections each player has recorded by team."
      title="Games played report">
      <section className="card stack">
        <div className="split-row">
          <div className="stack-sm">
            <h3>Player games by team</h3>
            <p className="muted">
              Counts come from selected lineup assignments on past fixtures. Future fixtures and availability-only responses are not counted.
            </p>
          </div>
          <div className="inline-actions">
            <button
              className={playerFilter === 'active' ? 'pill-button pill-button--selected' : 'pill-button'}
              onClick={() => setPlayerFilter('active')}
              type="button">
              Active
            </button>
            <button
              className={playerFilter === 'all' ? 'pill-button pill-button--selected' : 'pill-button'}
              onClick={() => setPlayerFilter('all')}
              type="button">
              All players
            </button>
          </div>
        </div>

        <div className="metric-row">
          <span className="metric metric--neutral">{reportPlayers.length} players</span>
          <span className="metric metric--positive">{seasonTotal} total games</span>
          <span className="metric metric--neutral">{gradeColumns.length} teams</span>
        </div>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Player</th>
                {gradeColumns.map((grade) => (
                  <th key={grade} scope="col">
                    {grade}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {reportPlayers.map((player) => {
                const playerSummary = getPlayerGamesPlayedSummary(gamesPlayedByPlayer, player.id);

                return (
                  <tr key={player.id}>
                    <th scope="row">
                      <span>{getPlayerDisplayName(player)}</span>
                      {!player.active ? <small>Inactive</small> : null}
                    </th>
                    {gradeColumns.map((grade) => (
                      <td data-label={grade} key={grade}>
                        {getSummaryGradeGames(playerSummary, grade)}
                      </td>
                    ))}
                    <td data-label="Total">{playerSummary.total}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Team totals</th>
                {reportTotals.map((total, index) => (
                  <td data-label={gradeColumns[index] ?? 'Team'} key={gradeColumns[index] ?? index}>
                    {total}
                  </td>
                ))}
                <td data-label="Total">{seasonTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </AdminPageShell>
  );
}
