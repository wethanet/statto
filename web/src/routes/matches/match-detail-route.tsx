import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  deleteAvailabilityRecord,
  getAvailabilitySummary,
  getAvailabilityResponseStatusForPlayer,
  getFixtureById,
  getPlayersForFixture,
  isPlayerSelectedInOtherSameDayFixture,
  upsertAvailabilityRecord,
} from '@/lib/availability';
import {
  buildGamesPlayedByGrade,
  getLowerGradeSelectionBlockReason,
  getPlayerGamesPlayedSummary,
} from '@/lib/games-played';
import {
  deleteMatchLineupAssignment,
  getPlayersForFixtureLineup,
  upsertMatchLineupAssignment,
} from '@/lib/match-lineup';
import { buildMatchRotationPlan, buildRotationPlan } from '@/lib/rotation-groups';
import { getPlayerSortValue } from '@/lib/team';
import { updatePlayerRotationGroupOverrides } from '@/lib/team';

import { AvailabilityPlayerRow } from '@web/components/availability-player-row';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';

type PlayerSort = 'name' | 'number';
type AvailabilityGroup = 'available' | 'unavailable' | 'responded-not-selected' | 'not-responded';

const AVAILABILITY_GROUPS: { key: AvailabilityGroup; title: string }[] = [
  { key: 'available', title: 'Selected' },
  { key: 'unavailable', title: 'Unavailable' },
  { key: 'responded-not-selected', title: 'Available' },
  { key: 'not-responded', title: 'No response' },
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
  const { policySettings } = useClubPolicy();
  const {
    availabilityRecords,
    fixtures,
    isHydrated,
    matchLineupAssignments,
    players,
    setAvailabilityRecords,
    setMatchLineupAssignments,
    setPlayers,
    syncDebug,
  } = useClubData();
  const [sortBy, setSortBy] = useState<PlayerSort>('number');
  const [isUnavailableGroupExpanded, setIsUnavailableGroupExpanded] = useState(false);
  const fixture = getFixtureById(fixtureId, fixtures);
  const effectiveAvailabilityRecords = useMemo(() => {
    if (!fixture) {
      return availabilityRecords;
    }

    const selectedPlayerIds = new Set(
      matchLineupAssignments
        .filter((assignment) => assignment.fixtureId === fixture.id)
        .map((assignment) => assignment.playerId)
    );

    if (selectedPlayerIds.size === 0) {
      return availabilityRecords;
    }

    const unavailableSelectedPlayerIds = new Set(
      availabilityRecords
        .filter((record) => {
          return (
            record.fixtureId === fixture.id &&
            selectedPlayerIds.has(record.playerId) &&
            record.status === 'unavailable'
          );
        })
        .map((record) => record.playerId)
    );

    return [
      ...availabilityRecords.filter((record) => {
        return (
          record.fixtureId !== fixture.id ||
          !selectedPlayerIds.has(record.playerId) ||
          record.status === 'unavailable'
        );
      }),
      ...Array.from(selectedPlayerIds)
        .filter((playerId) => !unavailableSelectedPlayerIds.has(playerId))
        .map((playerId) => ({
          fixtureId: fixture.id,
          playerId,
          status: 'available' as const,
        })),
    ];
  }, [availabilityRecords, fixture, matchLineupAssignments]);
  const gamesPlayedByPlayer = useMemo(() => {
    return buildGamesPlayedByGrade(fixtures, matchLineupAssignments, policySettings);
  }, [fixtures, matchLineupAssignments, policySettings]);

  const playersForFixture = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return getPlayersForFixtureLineup(
      fixture.id,
      getPlayersForFixture(fixture.id, players, effectiveAvailabilityRecords),
      matchLineupAssignments
    );
  }, [effectiveAvailabilityRecords, fixture, matchLineupAssignments, players]);

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

    return buildMatchRotationPlan(playersForFixture, rotationPlan.assignments);
  }, [fixture, playersForFixture, rotationPlan.assignments]);

  const groupedPlayers = useMemo(() => {
    if (!fixture) {
      return AVAILABILITY_GROUPS.map((group) => ({
        ...group,
        players: [],
      }));
    }

    return AVAILABILITY_GROUPS.map((group) => ({
      ...group,
      players: sortedPlayers.filter((player) => {
        if (group.key === 'available' || group.key === 'unavailable') {
          return player.availabilityStatus === group.key;
        }

        if (player.availabilityStatus !== 'uncertain') {
          return false;
        }

        const hasSavedResponse = effectiveAvailabilityRecords.some((record) => {
          return record.fixtureId === fixture.id && record.playerId === player.id;
        });

        return group.key === 'responded-not-selected' ? hasSavedResponse : !hasSavedResponse;
      }),
    }));
  }, [effectiveAvailabilityRecords, fixture, sortedPlayers]);

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

  const summary = getAvailabilitySummary(fixture.id, players, effectiveAvailabilityRecords);
  const totalPlayers = players.length;
  const respondedCount = summary.available + summary.unavailable + summary.respondedNotSelected;
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
            {syncDebug.lastSyncError ? <p className="muted">{syncDebug.lastSyncError}</p> : null}
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
            <span className="availability-tile__label">Available</span>
            <strong className="availability-tile__value">{summary.respondedNotSelected}</strong>
            <span className="availability-tile__caption">Responded, awaiting selection</span>
          </article>
          <article className="availability-tile availability-tile--neutral">
            <span className="availability-tile__label">No response</span>
            <strong className="availability-tile__value">{summary.notResponded}</strong>
            <span className="availability-tile__caption">Still needs a reply</span>
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
        </div>

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

      {groupedPlayers.map((group) => {
        const isUnavailableGroup = group.key === 'unavailable';
        const isGroupCollapsed = isUnavailableGroup && !isUnavailableGroupExpanded;

        return (
          <section className="card stack-sm" key={group.key}>
            <div className="split-row">
              <h3>{group.title}</h3>
              <div className="inline-actions">
                <span className="muted">
                  {group.players.length} player{group.players.length === 1 ? '' : 's'}
                </span>
                {isUnavailableGroup ? (
                  <button
                    aria-expanded={isUnavailableGroupExpanded}
                    className="pill-button pill-button--compact"
                    onClick={() => setIsUnavailableGroupExpanded((current) => !current)}
                    type="button">
                    {isUnavailableGroupExpanded ? 'Hide players' : 'Show players'}
                  </button>
                ) : null}
              </div>
            </div>
            {isGroupCollapsed ? null : (
              <section className="selection-table">
                {group.players.length > 0 ? (
                  group.players.map((player) => {
                    const playerGamesPlayed = getPlayerGamesPlayedSummary(gamesPlayedByPlayer, player.id);
                    const selectionBlockReason = getLowerGradeSelectionBlockReason(
                      fixture,
                      playerGamesPlayed,
                      policySettings
                    );
                    const responseStatus = getAvailabilityResponseStatusForPlayer(
                      fixture.id,
                      player.id,
                      effectiveAvailabilityRecords
                    );

                    return (
                      <AvailabilityPlayerRow
                        key={player.id}
                        onChange={(status) => {
                          if (status === 'not-responded') {
                            setAvailabilityRecords((current) => {
                              return deleteAvailabilityRecord(current, fixture.id, player.id);
                            });
                            setMatchLineupAssignments((current) => {
                              return deleteMatchLineupAssignment(current, fixture.id, player.id);
                            });
                            return;
                          }

                          if (status === 'available' && selectionBlockReason) {
                            return;
                          }

                          setAvailabilityRecords((current) => {
                            return upsertAvailabilityRecord(current, fixture.id, player.id, status);
                          });
                          if (status === 'available') {
                            setMatchLineupAssignments((current) => {
                              return upsertMatchLineupAssignment(
                                current,
                                fixture.id,
                                player.id,
                                player.matchPosition ?? 'Int'
                              );
                            });
                          } else {
                            setMatchLineupAssignments((current) => {
                              return deleteMatchLineupAssignment(current, fixture.id, player.id);
                            });
                          }
                        }}
                        onSelectPosition={(position) => {
                          if (selectionBlockReason) {
                            return;
                          }

                          setAvailabilityRecords((current) => {
                            return upsertAvailabilityRecord(current, fixture.id, player.id, 'available');
                          });
                          setMatchLineupAssignments((current) => {
                            if (player.matchPosition === position) {
                              return deleteMatchLineupAssignment(current, fixture.id, player.id);
                            }

                            return upsertMatchLineupAssignment(current, fixture.id, player.id, position);
                          });
                        }}
                        onSelectRotationGroup={(group) => {
                          const existingProfileGroup =
                            player.rotationGroupOverrides?.length === 1
                              ? player.rotationGroupOverrides[0]
                              : null;

                          if (existingProfileGroup === group) {
                            setPlayers((current) => {
                              return updatePlayerRotationGroupOverrides(current, player.id, null);
                            });
                            return;
                          }

                          setPlayers((current) => {
                            return updatePlayerRotationGroupOverrides(current, player.id, [group]);
                          });
                        }}
                        onResetRotationGroup={() => {
                          setPlayers((current) => {
                            return updatePlayerRotationGroupOverrides(current, player.id, null);
                          });
                        }}
                        hasSameDaySelectionConflict={
                          player.availabilityStatus === 'uncertain' &&
                          isPlayerSelectedInOtherSameDayFixture(
                            fixture.id,
                            player.id,
                            fixtures,
                            effectiveAvailabilityRecords
                          )
                        }
                        player={player}
                        responseStatus={responseStatus}
                        rotationGroup={
                          policySettings.rotationGroupsEnabled
                            ? matchRotationPlan.assignments[player.id]?.group ?? null
                            : null
                        }
                        rotationGroupSource={
                          policySettings.rotationGroupsEnabled
                            ? matchRotationPlan.assignments[player.id]?.source ?? null
                            : null
                        }
                        selectionBlockReason={selectionBlockReason}
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
            )}
          </section>
        );
      })}
    </section>
  );
}
