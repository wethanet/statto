import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  applyDefaultAvailabilityForFixture,
  getAvailabilitySummary,
  getDefaultFixtureSquad,
  getFixtureById,
  getPlayersForFixture,
  upsertAvailabilityRecord,
} from '@/lib/availability';
import {
  deleteMatchLineupAssignment,
  getPlayersForFixtureLineup,
  upsertMatchLineupAssignment,
} from '@/lib/match-lineup';
import {
  deleteMatchRotationAssignment,
  getMatchRotationAssignment,
  upsertMatchRotationAssignment,
} from '@/lib/match-rotations';
import { buildMatchRotationPlan, buildRotationPlan } from '@/lib/rotation-groups';
import { getPlayerSortValue } from '@/lib/team';

import { AvailabilityPlayerRow } from '@web/components/availability-player-row';
import { useClubData } from '@web/lib/club-data-context';

type PlayerSort = 'name' | 'number';
type AvailabilityGroup = 'available' | 'uncertain' | 'unavailable';

const AVAILABILITY_GROUPS: { key: AvailabilityGroup; title: string }[] = [
  { key: 'available', title: 'Selected' },
  { key: 'uncertain', title: 'Not selected' },
  { key: 'unavailable', title: 'Unavailable' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function MatchDetailRoute() {
  const { fixtureId = '' } = useParams();
  const {
    availabilityRecords,
    fixtures,
    isHydrated,
    matchLineupAssignments,
    matchRotationAssignments,
    players,
    setAvailabilityRecords,
    setMatchLineupAssignments,
    setMatchRotationAssignments,
  } = useClubData();
  const [sortBy, setSortBy] = useState<PlayerSort>('number');
  const [defaultTeamMessage, setDefaultTeamMessage] = useState<string | null>(null);
  const fixture = getFixtureById(fixtureId, fixtures);

  const playersForFixture = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return getPlayersForFixtureLineup(
      fixture.id,
      getPlayersForFixture(fixture.id, players, availabilityRecords),
      matchLineupAssignments
    );
  }, [availabilityRecords, fixture, matchLineupAssignments, players]);

  const sortedPlayers = useMemo(() => {
    return [...playersForFixture].sort((left, right) => {
      if (sortBy === 'name') {
        return (
          left.name.localeCompare(right.name) ||
          getPlayerSortValue(left.number) - getPlayerSortValue(right.number)
        );
      }

      return (
        getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
        left.name.localeCompare(right.name)
      );
    });
  }, [playersForFixture, sortBy]);

  const rotationPlan = useMemo(() => {
    return buildRotationPlan(players);
  }, [players]);
  const matchRotationPlan = useMemo(() => {
    if (!fixture) {
      return { assignments: {} };
    }

    return buildMatchRotationPlan(fixture.id, playersForFixture, rotationPlan.assignments, matchRotationAssignments);
  }, [fixture, matchRotationAssignments, playersForFixture, rotationPlan.assignments]);

  const groupedPlayers = useMemo(() => {
    return AVAILABILITY_GROUPS.map((group) => ({
      ...group,
      players: sortedPlayers.filter((player) => player.availabilityStatus === group.key),
    }));
  }, [sortedPlayers]);

  if (!fixture) {
    return (
      <section className="page-grid">
        <section className="panel stack">
          <span className="eyebrow">Matches</span>
          <h2>Fixture not found</h2>
          <p className="muted">Check the selected match and try again.</p>
          <Link className="text-link" to="/matches">
            Back to matches
          </Link>
        </section>
      </section>
    );
  }

  const summary = getAvailabilitySummary(fixture.id, players, availabilityRecords);
  const defaultSquad = getDefaultFixtureSquad(fixture.grade);
  const totalPlayers = players.length;
  const respondedCount = summary.available + summary.unavailable;
  const responseRate = totalPlayers > 0 ? Math.round((respondedCount / totalPlayers) * 100) : 0;
  const responseLabel =
    respondedCount > 0
      ? `${respondedCount} of ${totalPlayers} players have responded`
      : `Waiting on ${totalPlayers} players to respond`;

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Fixture</span>
        <h2>{fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</h2>
        <p className="muted">{formatDate(fixture.date)}</p>
        <p className="muted">{fixture.venue}</p>
        <p className="muted">{fixture.isHome ? 'Home game' : 'Away game'}</p>
      </section>

      <section className="card stack">
        <div className="split-row availability-summary__header">
          <div className="stack-sm">
            <h3>Availability summary</h3>
            <p className="muted">
              {isHydrated
                ? 'Selections save immediately for everyone in the club workspace.'
                : 'Loading saved availability...'}
            </p>
          </div>
          <div className="availability-summary__response">
            <span className="availability-summary__response-value">{responseRate}%</span>
            <span className="availability-summary__response-label">Response rate</span>
          </div>
        </div>

        <div className="availability-summary__tiles">
          <article className="availability-tile availability-tile--positive">
            <span className="availability-tile__label">Selected</span>
            <strong className="availability-tile__value">{summary.available}</strong>
            <span className="availability-tile__caption">Included right now</span>
          </article>
          <article className="availability-tile availability-tile--negative">
            <span className="availability-tile__label">Unavailable</span>
            <strong className="availability-tile__value">{summary.unavailable}</strong>
            <span className="availability-tile__caption">Out this week</span>
          </article>
          <article className="availability-tile availability-tile--neutral">
            <span className="availability-tile__label">Not selected</span>
            <strong className="availability-tile__value">{summary.uncertain}</strong>
            <span className="availability-tile__caption">Not in the side yet</span>
          </article>
        </div>

        <div className="availability-summary__progress">
          <div className="split-row">
            <span>{responseLabel}</span>
            <span className="muted">{totalPlayers} total players</span>
          </div>
          <div className="availability-summary__progress-track" aria-hidden="true">
            <div className="availability-summary__progress-fill" style={{ width: `${responseRate}%` }} />
          </div>
        </div>

        <div className="availability-summary__controls">
          <div className="stack-sm">
            <span className="eyebrow">Roster order</span>
            <div className="inline-actions">
              <button
                className={sortBy === 'number' ? 'pill-button pill-button--selected' : 'pill-button'}
                onClick={() => setSortBy('number')}
                type="button">
                Number
              </button>
              <button
                className={sortBy === 'name' ? 'pill-button pill-button--selected' : 'pill-button'}
                onClick={() => setSortBy('name')}
                type="button">
                Name
              </button>
            </div>
          </div>

          <div className="availability-summary__default-team stack-sm">
            <span className="eyebrow">Quick action</span>
            <button
              className="button button--secondary"
              disabled={!defaultSquad}
              onClick={() => {
                const nextSelection = applyDefaultAvailabilityForFixture(availabilityRecords, fixture, players);

                if (!nextSelection.squad) {
                  setDefaultTeamMessage('Add Cup or Plate to the fixture grade to use the default team fill.');
                  return;
                }

                setAvailabilityRecords(nextSelection.records);
                setDefaultTeamMessage(
                  `Selected the ${nextSelection.squad} team by default. ${nextSelection.selectedCount} players marked selected.`
                );
              }}
              type="button">
              Select default team
            </button>
            <p className="muted">
              {defaultSquad
                ? `Uses ${defaultSquad} designations from the player list to mark the likely side quickly.`
                : 'Add Cup or Plate to the fixture grade to enable default team selection.'}
            </p>
          </div>
        </div>

        {defaultTeamMessage ? (
          <div className="availability-summary__message">
            <p>{defaultTeamMessage}</p>
          </div>
        ) : null}

        <div className="availability-summary__links">
          <Link className="schedule-card__action text-link" to={`/matches/${fixture.id}/stats`}>
            Open match stats
          </Link>
          <Link className="schedule-card__action text-link" to={`/matches/${fixture.id}/votes`}>
            Open player votes
          </Link>
          <Link className="schedule-card__action text-link" to={`/matches/${fixture.id}/announcement`}>
            Open team announcement graphic
          </Link>
        </div>
      </section>

      {groupedPlayers.map((group) => (
        <section className="card stack-sm" key={group.key}>
          <div className="split-row">
            <h3>{group.title}</h3>
            <span className="muted">
              {group.players.length} player{group.players.length === 1 ? '' : 's'}
            </span>
          </div>
          <section className="selection-table">
            {group.players.length > 0 ? (
              group.players.map((player) => {
                return (
                  <AvailabilityPlayerRow
                    key={player.id}
                    onChange={(status) => {
                      setAvailabilityRecords((current) => {
                        return upsertAvailabilityRecord(current, fixture.id, player.id, status);
                      });
                      if (status !== 'available') {
                        setMatchLineupAssignments((current) => {
                          return deleteMatchLineupAssignment(current, fixture.id, player.id);
                        });
                        setMatchRotationAssignments((current) => {
                          return deleteMatchRotationAssignment(current, fixture.id, player.id);
                        });
                      }
                    }}
                    onSelectPosition={(position) => {
                      setMatchLineupAssignments((current) => {
                        if (player.matchPosition === position) {
                          return deleteMatchLineupAssignment(current, fixture.id, player.id);
                        }

                        return upsertMatchLineupAssignment(current, fixture.id, player.id, position);
                      });
                    }}
                    onSelectRotationGroup={(group) => {
                      setMatchRotationAssignments((current) => {
                        const existingAssignment = getMatchRotationAssignment(fixture.id, player.id, current);

                        if (existingAssignment?.group === group) {
                          return deleteMatchRotationAssignment(current, fixture.id, player.id);
                        }

                        return upsertMatchRotationAssignment(current, fixture.id, player.id, group);
                      });
                    }}
                    onResetRotationGroup={() => {
                      setMatchRotationAssignments((current) => {
                        return deleteMatchRotationAssignment(current, fixture.id, player.id);
                      });
                    }}
                    player={player}
                    rotationGroup={matchRotationPlan.assignments[player.id]?.group ?? null}
                    rotationGroupSource={matchRotationPlan.assignments[player.id]?.source ?? null}
                    selectedPosition={player.matchPosition}
                    status={player.availabilityStatus}
                  />
                );
              })
            ) : (
              <div className="selection-row selection-row--empty">
                <span className="muted">No players in this list yet.</span>
              </div>
            )}
          </section>
        </section>
      ))}
    </section>
  );
}
