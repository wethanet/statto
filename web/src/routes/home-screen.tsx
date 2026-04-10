import { Link } from 'react-router-dom';
import { useState } from 'react';

import { getAttendanceSummary, getSortedTrainingSessions } from '@/lib/attendance';
import { getAvailabilitySummary, getSortedFixtures } from '@/lib/availability';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
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

function getLocalDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function HomeScreen() {
  const {
    attendanceRecords,
    availabilityRecords,
    fixtures,
    fitnessResults,
    fines,
    isHydrated,
    loadDemoData,
    matchStats,
    players,
    trainingSessions,
    voteEntries,
  } = useClubData();
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const sortedTrainingSessions = getSortedTrainingSessions(trainingSessions);
  const sortedFixtures = getSortedFixtures(fixtures);

  const hasAnyData =
    trainingSessions.length > 0 ||
    fixtures.length > 0 ||
    players.length > 0 ||
    attendanceRecords.length > 0 ||
    availabilityRecords.length > 0 ||
    matchStats.length > 0 ||
    fitnessResults.length > 0 ||
    fines.length > 0 ||
    voteEntries.length > 0;
  const todaysTraining = sortedTrainingSessions.filter((session) => {
    return getLocalDateKey(session.date) === todayKey;
  });
  const displayedTraining =
    todaysTraining[0] ??
    sortedTrainingSessions.find((session) => {
      return new Date(session.date).getTime() >= now.getTime();
    }) ??
    null;
  const displayedMatchesToday = sortedFixtures.filter((fixture) => {
    return getLocalDateKey(fixture.date) === todayKey;
  });
  const upcomingMatches = sortedFixtures.filter((fixture) => {
    return new Date(fixture.date).getTime() >= now.getTime();
  });
  const displayedMatches =
    (displayedMatchesToday.length > 0 ? displayedMatchesToday : upcomingMatches).slice(0, 2);
  const trainingSummary = displayedTraining
    ? getAttendanceSummary(displayedTraining.id, players, attendanceRecords)
    : null;
  const trainingHeading = todaysTraining.length > 0 ? 'Today’s training' : 'Next training';
  const matchesHeading = displayedMatchesToday.length > 0 ? 'Today’s matches' : 'Next matches';

  return (
    <section className="page-grid">
      <section className="hero-card">
        <div className="stack">
          <span className="eyebrow">Warners Bay Bulldogs</span>
          <h2>Club admin now runs in a Bulldogs-branded web workspace.</h2>
          <p className="muted">
            Training, matches, and live stats now sit inside the same browser shell with club colours
            and the official crest.
          </p>
        </div>

        <div className="hero-badge">
          <img alt="Warners Bay Bulldogs logo" className="hero-badge__logo" src={bulldogsLogo} />
        </div>
      </section>

      <div className="three-up">
        {displayedTraining && trainingSummary ? (
          <section className="card stack">
            <h3>{trainingHeading}</h3>
            <p>{displayedTraining.title}</p>
            <p className="muted">{formatDate(displayedTraining.date)}</p>
            <p className="muted">{displayedTraining.location}</p>
            <div className="metric-row">
              <span className="metric metric--positive">{trainingSummary.present} present</span>
              <span className="metric metric--negative">{trainingSummary.absent} absent</span>
              <span className="metric metric--neutral">{trainingSummary.unknown} to confirm</span>
            </div>
            <Link className="text-link" to={`/training/${displayedTraining.id}`}>
              Manage this session
            </Link>
          </section>
        ) : (
          <section className="card stack">
            <h3>{trainingHeading}</h3>
            <p className="muted">No training sessions are scheduled yet.</p>
            <Link className="text-link" to="/training">
              Create your first session
            </Link>
          </section>
        )}

        {displayedMatches.length > 0 ? (
          displayedMatches.map((fixture, index) => {
            const matchSummary = getAvailabilitySummary(fixture.id, players, availabilityRecords);

            return (
              <section key={fixture.id} className="card stack">
                <h3>{index === 0 ? matchesHeading : 'Also coming up'}</h3>
                <p>{fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</p>
                <p className="muted">{formatDate(fixture.date)}</p>
                <p className="muted">{fixture.venue}</p>
                <div className="metric-row">
                  <span className="metric metric--positive">{matchSummary.available} selected</span>
                  <span className="metric metric--negative">{matchSummary.unavailable} unavailable</span>
                  <span className="metric metric--neutral">{matchSummary.uncertain} not selected</span>
                </div>
                <Link className="text-link" to={`/matches/${fixture.id}`}>
                  Manage availability
                </Link>
              </section>
            );
          })
        ) : (
          <section className="card stack">
            <h3>{matchesHeading}</h3>
            <p className="muted">No upcoming fixtures are scheduled yet.</p>
            <Link className="text-link" to="/admin/matches">
              Create your first match
            </Link>
          </section>
        )}

        <section className="card stack">
          <h3>Quick links</h3>
          <p className="muted">
            {isHydrated ? 'Club data is now hydrating in the web shell.' : 'Loading saved club data...'}
          </p>
          {!hasAnyData ? (
            <div className="stack-sm">
              <button
                className="button button--secondary"
                disabled={!isHydrated}
                onClick={() => {
                  loadDemoData();
                  setDemoMessage('Dummy data loaded into this club workspace.');
                }}
                type="button">
                Load dummy data
              </button>
              <p className="muted">
                Use this to explore the app with sample players, sessions, matches, and stats.
              </p>
              {demoMessage ? <p className="muted">{demoMessage}</p> : null}
            </div>
          ) : null}
          <Link className="text-link" to="/training">
            Open training attendance
          </Link>
          <Link className="text-link" to="/matches">
            Open match availability
          </Link>
          <Link className="text-link" to="/admin">
            Open admin workflows
          </Link>
        </section>
      </div>
    </section>
  );
}
