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
    value: 'available',
    className: 'pill-button pill-button--compact pill-button--positive',
  },
  {
    label: 'Unavailable',
    value: 'unavailable',
    className: 'pill-button pill-button--compact pill-button--negative',
  },
  {
    label: 'Unsure',
    value: 'uncertain',
    className: 'pill-button pill-button--compact pill-button--neutral',
  },
] as const;

export function PlayerAvailabilityRoute() {
  const { availabilityRecords, fixtures, isHydrated, setAvailabilityRecords } = useClubData();
  const { canViewSquadItem } = useClubPermissions();
  const { selectedPlayer } = usePlayerProfile();
  const sortedFixtures = useMemo(() => {
    const now = Date.now();

    return getSortedFixtures(
      fixtures.filter((fixture) => {
        return canViewSquadItem(fixture.squad) && new Date(fixture.date).getTime() >= now;
      })
    );
  }, [canViewSquadItem, fixtures]);

  return (
    <PlayerPageShell
      description="Update your response for each fixture so coaches have current availability before selection night."
      title="Your availability">
      {selectedPlayer ? (
        <>
          <section className="card stack">
            <h3>Availability notes</h3>
            <p className="muted">
              {isHydrated
                ? 'Changes save straight into the club workspace.'
                : 'Loading your saved availability...'}
            </p>
          </section>

          {sortedFixtures.length > 0 ? (
            sortedFixtures.map((fixture) => {
              const status = getAvailabilityStatusForPlayer(
                fixture.id,
                selectedPlayer.id,
                availabilityRecords
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
                      <span
                        className={
                          status === 'available'
                            ? 'status-pill status-pill--positive'
                            : status === 'unavailable'
                              ? 'status-pill status-pill--negative'
                              : 'status-pill status-pill--neutral'
                        }>
                        {status === 'available'
                          ? 'Available'
                          : status === 'unavailable'
                            ? 'Unavailable'
                            : 'Unsure'}
                      </span>

                      <div className="inline-actions">
                        {availabilityOptions.map((option) => {
                          const isSelected = option.value === status;

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
