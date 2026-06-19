import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { getSortedFixtures } from '@/lib/availability';
import { getPlayerVoteCandidates, isPlayerVoteOpen } from '@/lib/club-policy';
import { getPlayerDisplayName, getPlayerSortValue } from '@/lib/team';
import { getLineupPlayerIdsForFixture, getPlayerVoteBallot, upsertPlayerVoteBallot } from '@/lib/votes';

import { PlayerPageShell } from '@web/components/player/player-page-shell';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { useClubPolicy } from '@web/lib/club-policy-context';
import { usePlayerProfile } from '@web/lib/player-profile-context';

function formatFixtureDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function PlayerVotesRoute() {
  useEnsureClubCollections([
    'fixtures',
    'matchLineupAssignments',
    'matchStats',
    'playerVoteBallots',
    'players',
  ]);

  const {
    fixtures,
    isHydrated,
    matchLineupAssignments,
    matchStats,
    playerVoteBallots,
    players,
    setPlayerVoteBallots,
  } = useClubData();
  const { canViewSquadItem } = useClubPermissions();
  const { policySettings } = useClubPolicy();
  const { selectedPlayer } = usePlayerProfile();

  const eligibleFixtures = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    return [...getSortedFixtures(fixtures.filter((fixture) => canViewSquadItem(fixture.squad)))]
      .filter((fixture) => {
        if (!isPlayerVoteOpen(fixture.date, policySettings.playerVoteOpenDelayDays)) {
          return false;
        }

        const lineupPlayerIds = getLineupPlayerIdsForFixture(fixture.id, matchLineupAssignments);
        return !policySettings.playerVoteRequiresLineup || lineupPlayerIds.includes(selectedPlayer.id);
      })
      .reverse()
      .map((fixture) => {
        const lineupPlayerIds = getLineupPlayerIdsForFixture(fixture.id, matchLineupAssignments);
        const candidates = getPlayerVoteCandidates(
          fixture,
          players,
          lineupPlayerIds,
          selectedPlayer.id,
          policySettings.playerVoteRequiresLineup
        )
          .sort((left, right) => {
            return (
              getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
              left.name.localeCompare(right.name)
            );
          });

        return {
          fixture,
          candidates,
          ballot: getPlayerVoteBallot(fixture.id, selectedPlayer.id, playerVoteBallots),
          hasMatchStats: matchStats.some((entry) => {
            return entry.fixtureId === fixture.id;
          }),
        };
      })
      .filter((entry) => entry.candidates.length > 0);
  }, [
    canViewSquadItem,
    fixtures,
    matchLineupAssignments,
    matchStats,
    playerVoteBallots,
    players,
    policySettings.playerVoteOpenDelayDays,
    policySettings.playerVoteRequiresLineup,
    selectedPlayer,
  ]);

  return (
    <PlayerPageShell
      description="Vote your players' player for past matches you were selected in."
      title="Your player votes">
      {selectedPlayer ? (
        <>
          <section className="card stack">
            <h3>Voting notes</h3>
            <p className="muted">
              {isHydrated
                ? 'Choose one teammate for each match and your vote will save straight into the club workspace.'
                : 'Loading your saved votes...'}
            </p>
          </section>

          {eligibleFixtures.length > 0 ? (
            eligibleFixtures.map(({ ballot, candidates, fixture, hasMatchStats }) => {
              const selectedNominee = ballot
                ? candidates.find((player) => {
                    return player.id === ballot.nomineePlayerId;
                  }) ?? null
                : null;

              return (
                <section className="card stack" key={fixture.id}>
                  <div className="split-row">
                    <div className="stack-sm">
                      <h3>
                        {fixture.grade ? `${fixture.grade} • ` : ''}
                        vs {fixture.opponent}
                      </h3>
                      <p className="muted">{formatFixtureDate(fixture.date)}</p>
                      <p className="muted">{fixture.venue}</p>
                    </div>

                    <span className={ballot ? 'status-pill status-pill--positive' : 'status-pill status-pill--neutral'}>
                      {ballot ? 'Vote submitted' : 'Still to vote'}
                    </span>
                  </div>

                  {selectedNominee ? (
                    <p className="muted">Current vote: {getPlayerDisplayName(selectedNominee)}</p>
                  ) : (
                    <p className="muted">Choose the teammate you thought was players' player in this match.</p>
                  )}

                  <div className="inline-actions vote-candidate-grid">
                    {candidates.map((candidate) => {
                      const isSelected = ballot?.nomineePlayerId === candidate.id;

                      return (
                        <button
                          key={candidate.id}
                          className={
                            isSelected
                              ? 'pill-button pill-button--compact pill-button--positive pill-button--selected'
                              : 'pill-button pill-button--compact'
                          }
                          onClick={() => {
                            setPlayerVoteBallots((current) => {
                              return upsertPlayerVoteBallot(
                                current,
                                fixture.id,
                                selectedPlayer.id,
                                candidate.id
                              );
                            });
                          }}
                          type="button">
                          {getPlayerDisplayName(candidate)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="inline-actions">
                    {ballot ? (
                      <button
                        className="button button--ghost"
                        onClick={() => {
                          setPlayerVoteBallots((current) => {
                            return upsertPlayerVoteBallot(current, fixture.id, selectedPlayer.id, null);
                          });
                        }}
                        type="button">
                        Clear vote
                      </button>
                    ) : null}

                    {hasMatchStats ? (
                      <Link className="text-link" to={`/matches/${fixture.id}/stats`}>
                        View stats report
                      </Link>
                    ) : null}
                  </div>
                </section>
              );
            })
          ) : (
            <section className="card stack">
              <h3>No matches to vote on yet</h3>
              <p className="muted">
                Past matches will appear here once you have been selected in the lineup for them.
              </p>
            </section>
          )}
        </>
      ) : null}
    </PlayerPageShell>
  );
}
