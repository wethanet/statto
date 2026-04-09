import { Link } from 'react-router-dom';

import { getAttendanceSummary, getNextTrainingSession } from '@/lib/attendance';
import { getAvailabilitySummary, getNextFixture } from '@/lib/availability';

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

export function HomeScreen() {
  const { attendanceRecords, availabilityRecords, fixtures, isHydrated, players, trainingSessions } =
    useClubData();

  const nextTraining = getNextTrainingSession(trainingSessions);
  const nextMatch = getNextFixture(fixtures);
  const trainingSummary = nextTraining
    ? getAttendanceSummary(nextTraining.id, players, attendanceRecords)
    : null;
  const matchSummary = nextMatch
    ? getAvailabilitySummary(nextMatch.id, players, availabilityRecords)
    : null;

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
        <section className="card stack">
          <h3>Next training</h3>
          {nextTraining && trainingSummary ? (
            <>
              <p>{nextTraining.title}</p>
              <p className="muted">{formatDate(nextTraining.date)}</p>
              <p className="muted">{nextTraining.location}</p>
              <div className="metric-row">
                <span className="metric metric--positive">{trainingSummary.present} present</span>
                <span className="metric metric--negative">{trainingSummary.absent} absent</span>
                <span className="metric metric--neutral">{trainingSummary.unknown} to confirm</span>
              </div>
              <Link className="text-link" to={`/training/${nextTraining.id}`}>
                Manage this session
              </Link>
            </>
          ) : (
            <>
              <p className="muted">No training sessions have been added yet.</p>
              <Link className="text-link" to="/training">
                Create your first session
              </Link>
            </>
          )}
        </section>

        <section className="card stack">
          <h3>Next match</h3>
          {nextMatch && matchSummary ? (
            <>
              <p>{nextMatch.grade ? `${nextMatch.grade} • ` : ''}vs {nextMatch.opponent}</p>
              <p className="muted">{formatDate(nextMatch.date)}</p>
              <p className="muted">{nextMatch.venue}</p>
              <div className="metric-row">
                <span className="metric metric--positive">{matchSummary.available} available</span>
                <span className="metric metric--negative">{matchSummary.unavailable} unavailable</span>
                <span className="metric metric--neutral">{matchSummary.uncertain} uncertain</span>
              </div>
              <Link className="text-link" to={`/matches/${nextMatch.id}`}>
                Manage availability
              </Link>
            </>
          ) : (
            <>
              <p className="muted">No fixtures have been added yet.</p>
              <Link className="text-link" to="/admin/matches">
                Create your first match
              </Link>
            </>
          )}
        </section>

        <section className="card stack">
          <h3>Quick links</h3>
          <p className="muted">
            {isHydrated ? 'Club data is now hydrating in the web shell.' : 'Loading saved club data...'}
          </p>
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
