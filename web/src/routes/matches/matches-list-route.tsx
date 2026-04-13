import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { getAvailabilitySummary, getSortedFixtures } from '@/lib/availability';
import { getFixtureScoreSummary } from '@/lib/match-stats';

import { useClubData } from '@web/lib/club-data-context';

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
  const { availabilityRecords, fixtures, matchStats, players } = useClubData();
  const upcomingFixtures = getSortedFixtures(fixtures);
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
        <h2>Track availability before selection night</h2>
        <p className="muted">Manage weekly match availability and keep selection conversations moving.</p>
      </section>

      {upcomingFixtures.length === 0 ? (
        <section className="card stack">
          <h3>No fixtures yet</h3>
          <p className="muted">Add your first match from the admin area to start tracking availability.</p>
          <Link className="text-link" to="/admin/matches">
            Open match setup
          </Link>
        </section>
      ) : null}

      {upcomingFixtures.map((fixture) => {
        const summary = getAvailabilitySummary(fixture.id, players, availabilityRecords);
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
                <Link className="schedule-card__action text-link" to={`/matches/${fixture.id}`}>
                  Open fixture
                </Link>

                <div className="schedule-card__status">
                  {isPastFixture && hasRecordedScore ? (
                    <span className="schedule-card__score">
                      Final {leftScore.goals}.{leftScore.points} ({leftScore.score}) - {rightScore.goals}.
                      {rightScore.points} ({rightScore.score})
                    </span>
                  ) : null}
                  <div className="schedule-card__metrics">
                    <span className="metric metric--positive">{summary.available} selected</span>
                    <span className="metric metric--negative">{summary.unavailable} unavailable</span>
                    <span className="metric metric--neutral">{summary.uncertain} not selected</span>
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
