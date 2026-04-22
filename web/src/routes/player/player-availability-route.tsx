import { getAvailabilityStatusForPlayer, getSortedFixtures, upsertAvailabilityRecord } from '@/lib/availability';
import { useMemo } from 'react';

import { PlayerPageShell } from '@web/components/player/player-page-shell';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
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

const availabilityOptions = [
  {
    label: 'Available',
    value: 'uncertain',
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
  const { availabilityRecords, fixtures, isHydrated, setAvailabilityRecords } = useClubData();
  const { canViewSquadItem, isPlayer } = useClubPermissions();
  const { selectedPlayer } = usePlayerProfile();
  const sortedFixtures = useMemo(() => {
    const now = Date.now();

    return getSortedFixtures(
      fixtures.filter((fixture) => {
        return (
          new Date(fixture.date).getTime() >= now &&
          (isPlayer ? true : canViewSquadItem(fixture.squad))
        );
      })
    );
  }, [canViewSquadItem, fixtures, isPlayer]);

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
          </section>

          {sortedFixtures.length > 0 ? (
            sortedFixtures.map((fixture) => {
              const status = getAvailabilityStatusForPlayer(fixture.id, selectedPlayer.id, availabilityRecords);
              const savedResponse = availabilityRecords.find((record) => {
                return record.fixtureId === fixture.id && record.playerId === selectedPlayer.id;
              });
              const playerStatus = savedResponse ? (status === 'unavailable' ? 'unavailable' : 'available') : null;

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
                    </div>
                  </div>
                </section>
              );
            })
          ) : (
            <section className="card stack">
              <h3>No fixtures yet</h3>
              <p className="muted">The club has not added any fixtures yet.</p>
            </section>
          )}
        </>
      ) : null}
    </PlayerPageShell>
  );
}
