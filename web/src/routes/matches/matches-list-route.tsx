import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { getAvailabilityStatusForPlayer, getAvailabilitySummary, getSortedFixtures, upsertAvailabilityRecord } from '@/lib/availability';
import { getFixtureScoreSummary } from '@/lib/match-stats';
import { getLineupPlayerIdsForFixture, getPlayerVoteBallot } from '@/lib/votes';

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

function renderBoardMetric(value: number, label: string, tone: 'positive' | 'negative' | 'neutral') {
  return (
    <span className={`schedule-board__metric schedule-board__metric--${tone}`}>
      <span className="schedule-board__metric-value">{value}</span>
      <span className="schedule-board__metric-label">{label}</span>
    </span>
  );
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
  const {
    availabilityRecords,
    fixtures,
    matchLineupAssignments,
    matchStats,
    playerVoteBallots,
    players,
    setAvailabilityRecords,
  } = useClubData();
  const { canAccessAdmin, canViewPlayer, canViewSquadItem, isPlayer } = useClubPermissions();
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

      {!isPlayer ? (
        <section className="schedule-board">
          <div className="schedule-board__header schedule-board__row--matches">
            <span>Fixture</span>
            <span>Venue</span>
            <span>Availability</span>
            <span>Result</span>
            <span>Action</span>
          </div>
          <div className="schedule-board__body">
            {upcomingFixtures.map((fixture) => {
              const summary = getAvailabilitySummary(fixture.id, visiblePlayers, availabilityRecords);
              const label = fixture.isHome ? 'Home' : 'Away';
              const isPastFixture = isPastItem(fixture.date);
              const scoreSummary = getFixtureScoreSummary(fixture.id, matchStats);
              const leftScore = fixture.isHome ? scoreSummary.ours : scoreSummary.theirs;
              const rightScore = fixture.isHome ? scoreSummary.theirs : scoreSummary.ours;
              const hasRecordedScore =
                leftScore.goals + leftScore.points + rightScore.goals + rightScore.points > 0;

              return (
                <section
                  key={fixture.id}
                  ref={fixture.id === targetFixtureId ? targetFixtureRef : null}
                  className={
                    isPastFixture
                      ? 'schedule-board__row schedule-board__row--matches schedule-board__row--past'
                      : 'schedule-board__row schedule-board__row--matches'
                  }>
                  <div className="schedule-board__cell schedule-board__primary">
                    <h3 className="schedule-board__title">{fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</h3>
                    <p className="schedule-board__meta">
                      {label} • {formatDate(fixture.date)}
                    </p>
                  </div>

                  <div className="schedule-board__cell">
                    <p className="schedule-board__venue">{fixture.venue}</p>
                  </div>

                  <div className="schedule-board__cell">
                    <div className="schedule-board__metrics">
                      {renderBoardMetric(summary.available, 'selected', 'positive')}
                      {renderBoardMetric(summary.unavailable, 'unavailable', 'negative')}
                      {renderBoardMetric(summary.uncertain, 'not selected', 'neutral')}
                    </div>
                  </div>

                  <div className="schedule-board__cell">
                    <span className={hasRecordedScore ? 'schedule-board__result' : 'schedule-board__hint'}>
                      {hasRecordedScore
                        ? `Final ${leftScore.goals}.${leftScore.points} (${leftScore.score}) - ${rightScore.goals}.${rightScore.points} (${rightScore.score})`
                        : isPastFixture
                          ? 'No score entered'
                          : 'Upcoming'}
                    </span>
                  </div>

                  <div className="schedule-board__cell">
                    {canAccessAdmin ? (
                      <Link className="schedule-card__action schedule-board__action text-link" to={`/matches/${fixture.id}`}>
                        Open fixture
                      </Link>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      {isPlayer
        ? upcomingFixtures.map((fixture) => {
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
            const lineupPlayerIds = selectedPlayer
              ? getLineupPlayerIdsForFixture(fixture.id, matchLineupAssignments)
              : [];
            const canVotePlayersPlayer =
              Boolean(selectedPlayer) &&
              isPastFixture &&
              selectedPlayer != null &&
              lineupPlayerIds.includes(selectedPlayer.id) &&
              lineupPlayerIds.some((playerId) => playerId !== selectedPlayer.id);
            const playerVoteBallot =
              selectedPlayer && canVotePlayersPlayer
                ? getPlayerVoteBallot(fixture.id, selectedPlayer.id, playerVoteBallots)
                : null;

            if (!playerAvailability) {
              return null;
            }

            return (
              <section
                key={fixture.id}
                ref={fixture.id === targetFixtureId ? targetFixtureRef : null}
                className={
                  isPastFixture ? 'card stack player-fixture-card player-fixture-card--past' : 'card stack player-fixture-card'
                }>
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

                {hasRecordedScore || hasMatchStats || canVotePlayersPlayer ? (
                  <div className="player-fixture-card__footer">
                    {hasRecordedScore ? (
                      <span className="player-fixture-card__result">
                        Final {leftScore.goals}.{leftScore.points} ({leftScore.score}) - {rightScore.goals}.{rightScore.points} ({rightScore.score})
                      </span>
                    ) : (
                      <span className="muted">Match report available</span>
                    )}
                    {canVotePlayersPlayer ? (
                      <Link className="text-link" to="/player/votes">
                        {playerVoteBallot ? 'Update players\' player vote' : 'Vote players\' player'}
                      </Link>
                    ) : null}
                    {hasMatchStats ? (
                      <Link className="text-link" to={`/matches/${fixture.id}/stats`}>
                        View stats report
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })
        : null}
    </section>
  );
}
