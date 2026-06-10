import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  deleteAvailabilityRecord,
  getAvailabilityResponseStatusForPlayer,
  getAvailabilitySummary,
  getSortedFixtures,
  getPlayerAvailabilityLockReason,
  upsertAvailabilityRecord,
} from '@/lib/availability';
import { getPlayerVoteCandidates, isPlayerVoteOpen } from '@/lib/club-policy';
import { getFixtureScoreSummary } from '@/lib/match-stats';
import { getLineupPlayerIdsForFixture, getPlayerVoteBallot } from '@/lib/votes';
import type { AvailabilityResponseStatus } from '@/lib/types';

import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { useClubPolicy } from '@web/lib/club-policy-context';
import { usePlayerProfile } from '@web/lib/player-profile-context';

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
  {
    label: 'Not responded',
    value: 'not-responded',
    className: 'pill-button pill-button--compact pill-button--neutral',
  },
] as const;

type PlayerAvailabilityResponseStatus = AvailabilityResponseStatus;

type EventListFilter = 'upcoming' | 'all';

function getPlayerAvailabilityLabel(status: PlayerAvailabilityResponseStatus) {
  if (status === 'available') {
    return 'Selected';
  }

  if (status === 'unavailable') {
    return 'Unavailable';
  }

  if (status === 'uncertain') {
    return 'Available';
  }

  return 'Not responded';
}

function getPlayerAvailabilityTone(status: PlayerAvailabilityResponseStatus) {
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
  const { policySettings } = useClubPolicy();
  const { selectedPlayer } = usePlayerProfile();
  const [eventListFilter, setEventListFilter] = useState<EventListFilter>('upcoming');
  const visiblePlayers = useMemo(() => {
    return players.filter((player) => canViewPlayer(player));
  }, [canViewPlayer, players]);
  const visibleFixtures = useMemo(() => {
    const squadFixtures = fixtures.filter((fixture) => {
      return isPlayer || canViewSquadItem(fixture.squad);
    });

    if (eventListFilter === 'upcoming') {
      return getSortedFixtures(
        squadFixtures.filter((fixture) => {
          return !isPastItem(fixture.date);
        })
      );
    }

    return getSortedFixtures(squadFixtures);
  }, [canViewSquadItem, eventListFilter, fixtures, isPlayer]);
  const targetFixtureId = useMemo(() => {
    if (visibleFixtures.length === 0) {
      return null;
    }

    const lastPastFixture = [...visibleFixtures]
      .reverse()
      .find((fixture) => {
        return isPastItem(fixture.date);
      });

    return lastPastFixture?.id ?? visibleFixtures[0]?.id ?? null;
  }, [visibleFixtures]);
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
            ? 'See upcoming fixtures across the club and keep your own availability up to date.'
            : 'Manage weekly match availability and keep selection conversations moving.'}
        </p>
      </section>

      <section className="inline-actions">
        <button
          className={eventListFilter === 'upcoming' ? 'pill-button pill-button--selected' : 'pill-button'}
          onClick={() => setEventListFilter('upcoming')}
          type="button">
          Upcoming
        </button>
        <button
          className={eventListFilter === 'all' ? 'pill-button pill-button--selected' : 'pill-button'}
          onClick={() => setEventListFilter('all')}
          type="button">
          All
        </button>
      </section>

      {visibleFixtures.length === 0 ? (
        <section className="card stack">
          <h3>{eventListFilter === 'upcoming' ? 'No upcoming fixtures' : 'No fixtures yet'}</h3>
          <p className="muted">
            {canAccessAdmin
              ? eventListFilter === 'upcoming'
                ? 'Switch to all fixtures to review past rounds, or add the next match from the admin area.'
                : 'Add your first match from the admin area to start tracking availability.'
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
            {visibleFixtures.map((fixture) => {
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
                      {renderBoardMetric(summary.respondedNotSelected, 'available', 'neutral')}
                      {renderBoardMetric(summary.notResponded, 'no response', 'neutral')}
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
        ? visibleFixtures.map((fixture) => {
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
            const availabilityLockReason = getPlayerAvailabilityLockReason(
              fixture.date,
              Date.now(),
              policySettings.availabilityLockDays
            );
            const lineupPlayerIds = selectedPlayer
              ? getLineupPlayerIdsForFixture(fixture.id, matchLineupAssignments)
              : [];
            const isSelectedInLineup = selectedPlayer ? lineupPlayerIds.includes(selectedPlayer.id) : false;
            const playerAvailability =
              selectedPlayer && isPlayer
                ? isSelectedInLineup
                  ? 'available'
                  : getAvailabilityResponseStatusForPlayer(fixture.id, selectedPlayer.id, availabilityRecords)
                : null;
            const playerVoteCandidates = selectedPlayer
              ? getPlayerVoteCandidates(
                  fixture,
                  players,
                  lineupPlayerIds,
                  selectedPlayer.id,
                  policySettings.playerVoteRequiresLineup
                )
              : [];
            const canVotePlayersPlayer =
              Boolean(selectedPlayer) &&
              isPlayerVoteOpen(fixture.date, policySettings.playerVoteOpenDelayDays) &&
              selectedPlayer != null &&
              (!policySettings.playerVoteRequiresLineup || lineupPlayerIds.includes(selectedPlayer.id)) &&
              playerVoteCandidates.length > 0;
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

                {!isPastFixture && selectedPlayer && !availabilityLockReason ? (
                  <div className="player-fixture-card__actions">
                    {availabilityOptions.map((option) => {
                      const isSelected = option.value === playerAvailability;

                      return (
                        <button
                          key={option.value}
                          className={isSelected ? `${option.className} pill-button--selected` : option.className}
                          onClick={() => {
                            setAvailabilityRecords((current) => {
                              if (option.value === 'not-responded') {
                                return deleteAvailabilityRecord(current, fixture.id, selectedPlayer.id);
                              }

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

                {!isPastFixture && selectedPlayer && availabilityLockReason ? (
                  <p className="muted">{availabilityLockReason}</p>
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
