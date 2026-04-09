import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAvailabilitySummary,
  getFixtureById,
  getPlayersForFixture,
  upsertAvailabilityRecord,
} from '@/lib/availability';
import { getPlayerSortValue } from '@/lib/team';

import { AvailabilityPlayerRow } from '@web/components/availability-player-row';
import { useClubData } from '@web/lib/club-data-context';

type PlayerSort = 'name' | 'number';

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
  const { availabilityRecords, fixtures, isHydrated, players, setAvailabilityRecords } = useClubData();
  const [sortBy, setSortBy] = useState<PlayerSort>('number');
  const fixture = getFixtureById(fixtureId, fixtures);

  const playersForFixture = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return getPlayersForFixture(fixture.id, players, availabilityRecords);
  }, [availabilityRecords, fixture, players]);

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
        <h3>Availability summary</h3>
        <div className="metric-row">
          <span className="metric metric--positive">{summary.available} available</span>
          <span className="metric metric--negative">{summary.unavailable} unavailable</span>
          <span className="metric metric--neutral">{summary.uncertain} uncertain</span>
        </div>
        <div className="inline-actions">
          <span className="muted">Order by</span>
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
        <p className="muted">
          {isHydrated ? 'Availability changes are saving in the browser app.' : 'Loading saved availability...'}
        </p>
        <Link className="text-link" to={`/matches/${fixture.id}/stats`}>
          Open match stats
        </Link>
        <Link className="text-link" to={`/matches/${fixture.id}/votes`}>
          Open player votes
        </Link>
      </section>

      <section className="card selection-table">
        {sortedPlayers.map((player) => {
          return (
            <AvailabilityPlayerRow
              key={player.id}
              onChange={(status) => {
                setAvailabilityRecords((current) => {
                  return upsertAvailabilityRecord(current, fixture.id, player.id, status);
                });
              }}
              player={player}
              status={player.availabilityStatus}
            />
          );
        })}
      </section>
    </section>
  );
}
