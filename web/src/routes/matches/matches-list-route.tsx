import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { getAvailabilityStatusForPlayer, getAvailabilitySummary, getSortedFixtures, upsertAvailabilityRecord } from '@/lib/availability';
import { getFixtureScoreSummary } from '@/lib/match-stats';

import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { usePlayerProfile } from '@web/lib/player-profile-context';

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

function getPlayerAvailabilityLabel(status: 'available' | 'unavailable' | 'uncertain') {
  if (status === 'available') {
    return 'Available';
  }

  if (status === 'unavailable') {
    return 'Unavailable';
  }

  return 'Awaiting response';
}

function getPlayerAvailabilityTone(status: 'available' | 'unavailable' | 'uncertain') {
  if (status === 'available') {
    return 'status-pill status-pill--positive';
  }

  if (status === 'unavailable') {
    return 'status-pill status-pill--negative';
  }

  return 'status-pill status-pill--neutral';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function isPastItem(value: string) {
  return new Date(value).getTime() < Date.now();
}

export function MatchesListRoute() {
  const { availabilityRecords, fixtures, matchStats, players, setAvailabilityRecords } = useClubData();
  const { canAccessAdmin, canAccessPlayerApp, canViewPlayer, canViewSquadItem, isPlayer } = useClubPermissions();
  const { selectedPlayer } = usePlayerProfile();
  const visiblePlayers = useMemo(() => {
    return players.filter((player) => canViewPlayer(player));
  }, [canViewPlayer, players]);
  const upcomingFixtures = useMemo(() => {
    return getSortedFixtures(fixtures.filter((fixture) => canViewSquadItem(fixture.squad)));
  }, [canViewSquadItem, fixtures]);
  const targetFixtureId = useMemo(() => {
    if (upcomingFixtures.length === 0) {
      return null;
    }

    const lastPastFixture = [...upcomingFixtures]
      .reverse()
      .find((fixture) => {
        return isPastItem(fixture.date);
      });

    return lastPastFixture?.id ?? upcomingFixtures[0]?.id ?? null;
  }, [upcomingFixtures]);
  const targetFixtureRef = useRef<HTMLElement | null>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (hasScrolledRef.current || !targetFixtureId || !targetFixtureRef.current) {
      return;
    }

    targetFixtureRef.current.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    });
    hasScrolledRef.current = true;
  }, [targetFixtureId]);

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Matches</span>
        <h2>{isPlayer ? 'Your fixtures' : 'Track availability before selection night'}</h2>
        <p className="muted">
          {isPlayer
            ? 'See the fixtures for your squad and keep your own availability up to date.'
            : 'Manage weekly match availability and keep selection conversations moving.'}
        </p>
      </section>

      {upcomingFixtures.length === 0 ? (
        <section className="card stack">
          <h3>No fixtures yet</h3>
          <p className="muted">
            {canAccessAdmin
              ? 'Add your first match from the admin area to start tracking availability.'
              : 'Fixtures will appear here once your coach adds them.'}
          </p>
          {canAccessAdmin ? (
            <Link className="text-link" to="/admin/matches">
              Open match setup
            </Link>
          ) : null}
        </section>
      ) : null}

      {upcomingFixtures.map((fixture) => {
        const summary = isPlayer ? null : getAvailabilitySummary(fixture.id, visiblePlayers, availabilityRecords);
        const playerAvailability =
          selectedPlayer && isPlayer
            ? getAvailabilityStatusForPlayer(fixture.id, selectedPlayer.id, availabilityRecords)
            : null;
        const hasMatchStats = matchStats.some((entry) => {
          return entry.fixtureId === fixture.id;
        });
        const label = fixture.isHome ? 'Home' : 'Away';
        const isPastFixture = isPastItem(fixture.date);
        const scoreSummary = getFixtureScoreSummary(fixture.id, matchStats);
        const leftScore = fixture.isHome ? scoreSummary.ours : scoreSummary.theirs;
        const rightScore = fixture.isHome ? scoreSummary.theirs : scoreSummary.ours;
        const hasRecordedScore =
          leftScore.goals + leftScore.points + rightScore.goals + rightScore.points > 0;

        if (isPlayer && playerAvailability) {
          return (
            <section
              key={fixture.id}
              ref={fixture.id === targetFixtureId ? targetFixtureRef : null}
              className={isPastFixture ? 'card stack player-fixture-card player-fixture-card--past' : 'card stack player-fixture-card'}>
              <div className="player-fixture-card__header">
                <div className="stack-sm">
                  <h3>{fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</h3>
                  <div className="player-fixture-card__meta">
                    <span>{label}</span>
                    <span>{formatDate(fixture.date)}</span>
                  </div>
                  <p className="muted">{fixture.venue}</p>
                </div>

                <div className="player-fixture-card__response">
                  <span className="player-fixture-card__label">Your response</span>
                  <span className={getPlayerAvailabilityTone(playerAvailability)}>
                    {getPlayerAvailabilityLabel(playerAvailability)}
                  </span>
                </div>
              </div>

              {!isPastFixture && selectedPlayer ? (
                <div className="player-fixture-card__actions">
                  {availabilityOptions.map((option) => {
                    const isSelected = option.value === playerAvailability;

                    return (
                      <button
                        key={option.value}
                        className={isSelected ? `${option.className} pill-button--selected` : option.className}
                        onClick={() => {
                          setAvailabilityRecords((current) => {
                            return upsertAvailabilityRecord(current, fixture.id, selectedPlayer.id, option.value);
                          });
                        }}
                        type="button">
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {hasRecordedScore || hasMatchStats ? (
                <div className="player-fixture-card__footer">
                  {hasRecordedScore ? (
                    <span className="player-fixture-card__result">
                      Final {leftScore.goals}.{leftScore.points} ({leftScore.score}) - {rightScore.goals}.{rightScore.points} ({rightScore.score})
                    </span>
                  ) : (
                    <span className="muted">Match report available</span>
                  )}
                  {hasMatchStats ? (
                    <Link className="text-link" to={`/matches/${fixture.id}/stats`}>
                      View stats report
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        }

        return (
          <section
            key={fixture.id}
            ref={fixture.id === targetFixtureId ? targetFixtureRef : null}
            className={isPastFixture ? 'card stack schedule-card schedule-card--past' : 'card stack schedule-card'}>
            <div className="schedule-card__layout">
              <div className="stack-sm schedule-card__main">
                <h3>{fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</h3>
                <p className="muted">
                  {label} • {formatDate(fixture.date)}
                </p>
                <p className="muted">{fixture.venue}</p>
              </div>

              <div className="schedule-card__side">
                {canAccessAdmin ? (
                  <Link className="schedule-card__action text-link" to={`/matches/${fixture.id}`}>
                    Open fixture
                  </Link>
                ) : null}

                <div className="schedule-card__status">
                  {isPastFixture && hasRecordedScore ? (
                    <span className="schedule-card__score">
                      Final {leftScore.goals}.{leftScore.points} ({leftScore.score}) - {rightScore.goals}.
                      {rightScore.points} ({rightScore.score})
                    </span>
                  ) : null}
                  <div className="schedule-card__metrics">
                    {isPlayer ? (
                      <>
                        <span
                          className={
                            playerAvailability === 'available'
                              ? 'metric metric--positive'
                              : playerAvailability === 'unavailable'
                                ? 'metric metric--negative'
                                : 'metric metric--neutral'
                          }>
                          {playerAvailability === 'available'
                            ? 'You are available'
                            : playerAvailability === 'unavailable'
                              ? 'You are unavailable'
                              : 'Awaiting your response'}
                        </span>
                        {!isPastFixture && selectedPlayer ? (
                          <div className="stack-sm">
                            <span className="muted">Set your availability</span>
                            <div className="inline-actions">
                              {availabilityOptions.map((option) => {
                                const isSelected = option.value === playerAvailability;

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
                        ) : null}
                        {hasMatchStats ? (
                          <Link className="text-link" to={`/matches/${fixture.id}/stats`}>
                            View stats report
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className="metric metric--positive">{summary?.available ?? 0} selected</span>
                        <span className="metric metric--negative">{summary?.unavailable ?? 0} unavailable</span>
                        <span className="metric metric--neutral">{summary?.uncertain ?? 0} not selected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </section>
  );
}
