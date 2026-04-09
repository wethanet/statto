import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getFixtureById } from '@/lib/availability';
import type { VoteType } from '@/lib/types';
import { getFixtureVoteTotal, getPlayersForFixtureVotes, upsertVoteEntry, voteTypes } from '@/lib/votes';

import { VotePlayerRow } from '@web/components/votes/vote-player-row';
import { useClubData } from '@web/lib/club-data-context';

export function MatchVotesRoute() {
  const { fixtureId = '' } = useParams();
  const { fixtures, isHydrated, players, setVoteEntries, voteEntries } = useClubData();
  const fixture = getFixtureById(fixtureId, fixtures);

  const playersForFixture = useMemo<Record<VoteType, ReturnType<typeof getPlayersForFixtureVotes>>>(() => {
    if (!fixture) {
      return {
        players: [],
        coaches: [],
        'best-and-fairest': [],
      };
    }

    return {
      players: getPlayersForFixtureVotes(fixture.id, players, voteEntries, 'players'),
      coaches: getPlayersForFixtureVotes(fixture.id, players, voteEntries, 'coaches'),
      'best-and-fairest': getPlayersForFixtureVotes(
        fixture.id,
        players,
        voteEntries,
        'best-and-fairest'
      ),
    };
  }, [fixture, players, voteEntries]);

  if (!fixture) {
    return (
      <section className="page-grid">
        <section className="panel stack">
          <span className="eyebrow">Match votes</span>
          <h2>Fixture not found</h2>
          <p className="muted">Check the selected match and try again.</p>
          <Link className="text-link" to="/matches">
            Back to matches
          </Link>
        </section>
      </section>
    );
  }

  const voteTotals: Record<VoteType, number> = {
    players: getFixtureVoteTotal(fixture.id, voteEntries, 'players'),
    coaches: getFixtureVoteTotal(fixture.id, voteEntries, 'coaches'),
    'best-and-fairest': getFixtureVoteTotal(fixture.id, voteEntries, 'best-and-fairest'),
  };

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Match votes</span>
        <h2>Votes {fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</h2>
        <p className="muted">Record post-match votes and keep the season leaderboard moving.</p>
      </section>

      <section className="card stack">
        <h3>Match summary</h3>
        <div className="metric-row">
          {voteTypes.map((voteType) => {
            return (
              <span key={voteType.id} className="status-pill status-pill--positive">
                {voteType.label}: {voteTotals[voteType.id] ?? 0}
              </span>
            );
          })}
        </div>
        <p className="muted">
          {isHydrated ? 'Vote changes are saving in the browser app.' : 'Loading saved votes...'}
        </p>
      </section>

      {voteTypes.map((voteType) => {
        return (
          <section key={voteType.id} className="card stack">
            <div className="stack-sm">
              <h3>{voteType.label}</h3>
              <p className="muted">{voteType.description}</p>
            </div>

            {(playersForFixture[voteType.id] ?? []).map((player) => {
              return (
                <VotePlayerRow
                  key={`${voteType.id}-${player.id}`}
                  onChange={(points) => {
                    setVoteEntries((current) =>
                      upsertVoteEntry(current, fixture.id, player.id, voteType.id, points)
                    );
                  }}
                  player={player}
                  points={player.points}
                />
              );
            })}
          </section>
        );
      })}
    </section>
  );
}
