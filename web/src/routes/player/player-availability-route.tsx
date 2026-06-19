import {
  getAvailabilityStatusForPlayer,
  getSortedFixtures,
  getPlayerAvailabilityLockReason,
  upsertAvailabilityRecord,
} from '@/lib/availability';
import { useEffect, useMemo } from 'react';

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

function isFutureFixture(value: string, now: number) {
  return new Date(value).getTime() > now;
}

const availabilityOptions = [
  {
    label: 'Available',
    value: 'available',
    className: 'pill-button pill-button--compact pill-button--positive',
  },
  {
    label: 'Unavailable',
    value: 'unavailable',
    className: 'pill-button pill-button--compact pill-button--negative',
  },
] as const;

function getPlayerAvailabilityLabel(status: 'available' | 'unavailable' | null) {
  if (status === 'unavailable') {
    return 'Unavailable';
  }

  return 'Available';
}

function getPlayerAvailabilityTone(status: 'available' | 'unavailable' | null) {
  if (status === 'available') {
    return 'status-pill status-pill--positive';
  }

  if (status === 'unavailable') {
    return 'status-pill status-pill--negative';
  }

  return 'status-pill status-pill--neutral';
}

export function PlayerAvailabilityRoute() {
  useEnsureClubCollections(['fixtures', 'matchLineupAssignments', 'players']);

  const {
    availabilityRecords,
    fixtures,
    isHydrated,
    refreshAvailabilityRecordsForPlayer,
    setAvailabilityRecords,
    syncDebug,
  } = useClubData();
  const { canViewSquadItem, isPlayer } = useClubPermissions();
  const { policySettings } = useClubPolicy();
  const { selectedPlayer } = usePlayerProfile();
  const sortedFixtures = useMemo(() => {
    const now = Date.now();

    return getSortedFixtures(
      fixtures.filter((fixture) => {
        return isFutureFixture(fixture.date, now) && (isPlayer ? true : canViewSquadItem(fixture.squad));
      })
    );
  }, [canViewSquadItem, fixtures, isPlayer]);

  useEffect(() => {
    if (!isHydrated || !selectedPlayer) {
      return;
    }

    void refreshAvailabilityRecordsForPlayer(selectedPlayer.id);
  }, [isHydrated, refreshAvailabilityRecordsForPlayer, selectedPlayer]);

  return (
    <PlayerPageShell
      description="Mark whether you are available or unavailable for upcoming fixtures so coaches can finalise selection."
      title="Your availability">
      {selectedPlayer ? (
        <>
          <section className="card stack">
            <h3>Availability notes</h3>
            <p className="muted">
              {isHydrated
                ? 'Choosing Available keeps you in the pool for selection. Coaches still choose the final side.'
                : 'Loading your saved availability...'}
            </p>
            {syncDebug.lastSyncError ? <p className="muted">{syncDebug.lastSyncError}</p> : null}
          </section>

          <section className="card stack">
            <h3>Selection criteria</h3>
            <p className="muted">Selection is based on the published club criteria below.</p>
            <div className="selection-criteria-list">
              <article className="selection-criteria-item">
                <span className="eyebrow">Home and away games</span>
                <p>{policySettings.homeAndAwaySelectionCriteria}</p>
              </article>
              <article className="selection-criteria-item">
                <span className="eyebrow">Finals</span>
                <p>{policySettings.finalsSelectionCriteria}</p>
              </article>
            </div>
          </section>

          {sortedFixtures.length > 0 ? (
            sortedFixtures.map((fixture) => {
              const status = getAvailabilityStatusForPlayer(fixture.id, selectedPlayer.id, availabilityRecords);
              const savedResponse = availabilityRecords.find((record) => {
                return record.fixtureId === fixture.id && record.playerId === selectedPlayer.id;
              });
              const playerStatus = savedResponse ? (status === 'unavailable' ? 'unavailable' : 'available') : null;
              const lockReason = getPlayerAvailabilityLockReason(
                fixture.date,
                Date.now(),
                policySettings.availabilityLockDays
              );

              return (
                <section key={fixture.id} className="card stack schedule-card">
                  <div className="schedule-card__layout">
                    <div className="stack-sm schedule-card__main">
                      <h3>
                        {fixture.grade ? `${fixture.grade} • ` : ''}
                        vs {fixture.opponent}
                      </h3>
                      <p className="muted">{formatFixtureDate(fixture.date)}</p>
                      <p className="muted">{fixture.venue}</p>
                    </div>

                    <div className="schedule-card__side">
                      <span className={getPlayerAvailabilityTone(playerStatus)}>
                        {playerStatus ? getPlayerAvailabilityLabel(playerStatus) : 'Choose availability'}
                      </span>

                      <div className="inline-actions">
                        {availabilityOptions.map((option) => {
                          const isSelected = playerStatus === (option.value === 'unavailable' ? 'unavailable' : 'available');

                          return (
                            <button
                              key={option.value}
                              className={isSelected ? `${option.className} pill-button--selected` : option.className}
                              disabled={lockReason !== null}
                              onClick={() => {
                                setAvailabilityRecords((current) => {
                                  return upsertAvailabilityRecord(
                                    current,
                                    fixture.id,
                                    selectedPlayer.id,
                                    option.value
                                  );
                                });
                              }}
                              type="button">
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      {lockReason ? (
                        <p className="muted">{lockReason}</p>
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })
          ) : (
            <section className="card stack">
              <h3>No upcoming fixtures</h3>
              <p className="muted">Upcoming fixtures will appear here when they are added.</p>
            </section>
          )}
        </>
      ) : null}
    </PlayerPageShell>
  );
}
