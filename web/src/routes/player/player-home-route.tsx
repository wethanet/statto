import { Link } from 'react-router-dom';
import { useEffect } from 'react';

import { getSortedFixtures } from '@/lib/availability';
import { getSortedTrainingSessions } from '@/lib/attendance';
import { getFineSummary, getFinesForPlayer, getSortedFines } from '@/lib/fines';

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

function getAvailabilityLabel(status: 'available' | 'unavailable' | null) {
  if (status === 'available') {
    return 'Available';
  }

  if (status === 'unavailable') {
    return 'Unavailable';
  }

  return 'Not answered';
}

export function PlayerHomeRoute() {
  useEnsureClubCollections([
    'fines',
    'fixtures',
    'matchLineupAssignments',
    'players',
    'trainingSessions',
  ]);

  const { availabilityRecords, fines, fixtures, refreshAvailabilityRecordsForPlayer, trainingSessions } = useClubData();
  const { canViewSquadItem } = useClubPermissions();
  const { policySettings } = useClubPolicy();
  const { selectedPlayer } = usePlayerProfile();
  const visibleFixtures = getSortedFixtures(fixtures.filter((fixture) => canViewSquadItem(fixture.squad)));
  const visibleTrainingSessions = getSortedTrainingSessions(
    trainingSessions.filter((session) => canViewSquadItem(session.squad))
  );

  const playerFines = selectedPlayer ? getFinesForPlayer(fines, selectedPlayer.id) : [];
  const fineSummary = getFineSummary(playerFines);
  const sortedFines = getSortedFines(playerFines);
  const nextFixture =
    selectedPlayer
      ? visibleFixtures.find((fixture) => {
          return new Date(fixture.date).getTime() >= Date.now();
        }) ?? null
      : null;
  const nextTraining =
    selectedPlayer
      ? visibleTrainingSessions.find((session) => {
          return new Date(session.date).getTime() >= Date.now();
        }) ?? null
      : null;
  const nextFixtureAvailabilityRecord =
    selectedPlayer && nextFixture
      ? availabilityRecords.find((record) => {
          return record.fixtureId === nextFixture.id && record.playerId === selectedPlayer.id;
        }) ?? null
      : null;
  const nextFixtureAvailability =
    nextFixtureAvailabilityRecord?.status === 'unavailable'
      ? 'unavailable'
      : nextFixtureAvailabilityRecord
        ? 'available'
        : null;

  useEffect(() => {
    if (!selectedPlayer) {
      return;
    }

    void refreshAvailabilityRecordsForPlayer(selectedPlayer.id);
  }, [refreshAvailabilityRecordsForPlayer, selectedPlayer]);

  return (
    <PlayerPageShell
      description="Keep your availability up to date, check what is coming up next, and stay on top of fines."
      title="Your player dashboard">
      {selectedPlayer ? (
        <>
          <section className="admin-summary-grid">
            <section className="card stack-sm">
              <span className="eyebrow">Next response</span>
              <strong className="admin-summary-grid__value">
                {nextFixtureAvailability ? getAvailabilityLabel(nextFixtureAvailability) : 'No fixture'}
              </strong>
              <span className="muted">
                {nextFixture ? `for ${nextFixture.opponent}` : 'Nothing upcoming right now'}
              </span>
            </section>

            <section className="card stack-sm">
              <span className="eyebrow">Outstanding fines</span>
              <strong className="admin-summary-grid__value">${fineSummary.outstandingAmount}</strong>
              <span className="muted">{fineSummary.outstandingCount} still unpaid</span>
            </section>

            <section className="card stack-sm">
              <span className="eyebrow">Total fines</span>
              <strong className="admin-summary-grid__value">${fineSummary.totalAmount}</strong>
              <span className="muted">{playerFines.length} fines on record</span>
            </section>

            <section className="card stack-sm">
              <span className="eyebrow">Player</span>
              <strong className="admin-summary-grid__value">{selectedPlayer.number ?? '-'}</strong>
              <span className="muted">{selectedPlayer.name}</span>
            </section>
          </section>

          <section className="card stack">
            <div className="split-row">
              <div className="stack-sm">
                <h3>Next fixture</h3>
                <p className="muted">
                  {nextFixture
                    ? 'Set your response early so coaches can keep selection moving.'
                    : 'Fixtures will appear here as soon as the club adds them.'}
                </p>
              </div>
              <Link className="text-link" to="/player/availability">
                Open availability
              </Link>
            </div>

            {nextFixture ? (
              <section className="rotation-group-card">
                <div className="stack-sm">
                  <h3>
                    {nextFixture.grade ? `${nextFixture.grade} • ` : ''}
                    vs {nextFixture.opponent}
                  </h3>
                  <p className="muted">{formatFixtureDate(nextFixture.date)}</p>
                  <p className="muted">{nextFixture.venue}</p>
                  <p className="muted">Selection focus: {policySettings.homeAndAwaySelectionCriteria}</p>
                </div>
                <div className="metric-row">
                  <span
                    className={
                      nextFixtureAvailability === 'available'
                        ? 'status-pill status-pill--positive'
                        : nextFixtureAvailability === 'unavailable'
                          ? 'status-pill status-pill--negative'
                          : 'status-pill status-pill--neutral'
                    }>
                    {getAvailabilityLabel(nextFixtureAvailability)}
                  </span>
                </div>
              </section>
            ) : (
              <p className="muted">No upcoming fixtures are scheduled yet.</p>
            )}
          </section>

          <section className="card stack">
            <div className="split-row">
              <div className="stack-sm">
                <h3>Next training</h3>
                <p className="muted">
                  {nextTraining
                    ? 'Keep an eye on the next training session for your squad.'
                    : 'Training sessions will appear here as soon as the club adds them.'}
                </p>
              </div>
              <Link className="text-link" to="/training">
                Open training
              </Link>
            </div>

            {nextTraining ? (
              <section className="rotation-group-card">
                <div className="stack-sm">
                  <h3>{nextTraining.title}</h3>
                  <p className="muted">{formatFixtureDate(nextTraining.date)}</p>
                  <p className="muted">{nextTraining.location}</p>
                </div>
              </section>
            ) : (
              <p className="muted">No upcoming training sessions are scheduled yet.</p>
            )}
          </section>

          <section className="card stack">
            <div className="split-row">
              <div className="stack-sm">
                <h3>Latest fines</h3>
                <p className="muted">Review the newest fines and mark them paid once sorted.</p>
              </div>
              <Link className="text-link" to="/player/fines">
                Open fines
              </Link>
            </div>

            {sortedFines.length > 0 ? (
              sortedFines.slice(0, 3).map((fine) => (
                <div className="row-card" key={fine.id}>
                  <div className="stack-sm">
                    <strong>{fine.reason}</strong>
                    <span className="muted">
                      ${fine.amount} • {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(fine.issuedAt))}
                    </span>
                  </div>
                  <span className={fine.paid ? 'metric metric--positive' : 'metric metric--negative'}>
                    {fine.paid ? 'Paid' : 'Outstanding'}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">No fines recorded for this player yet.</p>
            )}
          </section>
        </>
      ) : null}
    </PlayerPageShell>
  );
}
