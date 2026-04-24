import { Link } from 'react-router-dom';
import { useState } from 'react';

import { getAttendanceSummary, getSortedTrainingSessions } from '@/lib/attendance';
import { getAvailabilitySummary, getDefaultFixtureSquad, getSortedFixtures } from '@/lib/availability';
import { getFineSummary } from '@/lib/fines';
import { getTeamSummary } from '@/lib/team';
import type { Fixture, PlayerSquad } from '@/lib/types';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';

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

type AttentionItem = {
  title: string;
  detail: string;
  to: string;
  action: string;
};

type MatchDashboardCard = {
  fixture: Fixture;
  squad: PlayerSquad | null;
  summary: ReturnType<typeof getAvailabilitySummary>;
  heading: string;
};

export function HomeScreen() {
  const { activeClub } = useClubAccess();
  const { canAccessAdmin, canViewPlayer, canViewSquadItem } = useClubPermissions();
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
  const visiblePlayers = players.filter((player) => canViewPlayer(player));
  const visibleTrainingSessions = trainingSessions.filter((session) => canViewSquadItem(session.squad));
  const visibleFixtures = fixtures.filter((fixture) => canViewSquadItem(fixture.squad));
  const sortedTrainingSessions = getSortedTrainingSessions(visibleTrainingSessions);
  const sortedFixtures = getSortedFixtures(visibleFixtures);
  const upcomingTrainingSessions = sortedTrainingSessions.filter((session) => {
    return new Date(session.date).getTime() >= now.getTime();
  });
  const upcomingFixtures = sortedFixtures.filter((fixture) => {
    return new Date(fixture.date).getTime() >= now.getTime();
  });

  const hasAnyData =
    visibleTrainingSessions.length > 0 ||
    visibleFixtures.length > 0 ||
    visiblePlayers.length > 0 ||
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
    upcomingTrainingSessions[0] ??
    null;
  const displayedMatchesToday = sortedFixtures.filter((fixture) => {
    return getLocalDateKey(fixture.date) === todayKey;
  });
  const trainingSummary = displayedTraining
    ? getAttendanceSummary(displayedTraining.id, visiblePlayers, attendanceRecords)
    : null;
  const prioritizedFixtures = displayedMatchesToday.length > 0 ? displayedMatchesToday : upcomingFixtures;
  const nextCupFixture =
    prioritizedFixtures.find((fixture) => {
      return getDefaultFixtureSquad(fixture.grade) === 'cup';
    }) ?? null;
  const nextPlateFixture =
    prioritizedFixtures.find((fixture) => {
      return getDefaultFixtureSquad(fixture.grade) === 'plate';
    }) ?? null;
  const primaryMatch = nextCupFixture ?? nextPlateFixture ?? prioritizedFixtures[0] ?? null;
  const teamSummary = getTeamSummary(visiblePlayers);
  const fineSummary = getFineSummary(fines);
  const trainingHeading = todaysTraining.length > 0 ? 'Today’s training' : 'Next training';
  const matchesHeading = displayedMatchesToday.length > 0 ? 'Today’s match' : 'Next match';
  const clubName = activeClub?.name ?? 'Warners Bay Bulldogs';
  const matchCards: MatchDashboardCard[] = [];

  if (nextCupFixture) {
    matchCards.push({
      fixture: nextCupFixture,
      squad: 'cup',
      summary: getAvailabilitySummary(nextCupFixture.id, visiblePlayers, availabilityRecords),
      heading: displayedMatchesToday.some((fixture) => fixture.id === nextCupFixture.id)
        ? 'Today’s Cup match'
        : 'Next Cup match',
    });
  }

  if (nextPlateFixture) {
    matchCards.push({
      fixture: nextPlateFixture,
      squad: 'plate',
      summary: getAvailabilitySummary(nextPlateFixture.id, visiblePlayers, availabilityRecords),
      heading: displayedMatchesToday.some((fixture) => fixture.id === nextPlateFixture.id)
        ? 'Today’s Plate match'
        : 'Next Plate match',
    });
  }

  const attentionItems: AttentionItem[] = [];

  if (canAccessAdmin && visiblePlayers.length === 0) {
    attentionItems.push({
      title: 'Add the playing list',
      detail: 'Get players into the club first so selections, attendance, and stats can flow properly.',
      to: '/admin/team-setup',
      action: 'Open player setup',
    });
  }

  if (displayedTraining && trainingSummary && trainingSummary.unknown > 0) {
    attentionItems.push({
      title: 'Training attendance still needs marking',
      detail: `${trainingSummary.unknown} players still need attendance marked for ${displayedTraining.title}.`,
      to: `/training/${displayedTraining.id}`,
      action: 'Mark attendance',
    });
  }

  matchCards.forEach((card) => {
    if (card.summary.notResponded > 0) {
      attentionItems.push({
        title: `${card.squad === 'cup' ? 'Cup' : 'Plate'} availability still needs replies`,
        detail: `${card.summary.notResponded} players have not responded for ${card.fixture.opponent}.`,
        to: `/matches/${card.fixture.id}`,
        action: 'Open match',
      });
      return;
    }

    if (card.summary.respondedNotSelected > 0) {
      attentionItems.push({
        title: `${card.squad === 'cup' ? 'Cup' : 'Plate'} selection has available players`,
        detail: `${card.summary.respondedNotSelected} players are available and awaiting selection for ${card.fixture.opponent}.`,
        to: `/matches/${card.fixture.id}`,
        action: 'Open match',
      });
    }
  });

  if (canAccessAdmin && fineSummary.outstandingCount > 0) {
    attentionItems.push({
      title: 'Outstanding fines still need collecting',
      detail: `${fineSummary.outstandingCount} fines are unpaid, worth $${fineSummary.outstandingAmount}.`,
      to: '/admin/fines',
      action: 'Review fines',
    });
  }

  if (canAccessAdmin && visibleTrainingSessions.length === 0) {
    attentionItems.push({
      title: 'No training sessions scheduled',
      detail: 'Add the next session so coaches can mark attendance from the training tab.',
      to: '/admin/training',
      action: 'Add training',
    });
  }

  if (canAccessAdmin && visibleFixtures.length === 0) {
    attentionItems.push({
      title: 'No fixtures scheduled',
      detail: 'Create the next fixture before availability and lineup work starts.',
      to: '/admin/matches',
      action: 'Add match',
    });
  }

  const summaryCards = [
    {
      label: 'Active players',
      value: String(teamSummary.active),
      note: `${teamSummary.total} total on the list`,
    },
    {
      label: 'Upcoming training',
      value: String(upcomingTrainingSessions.length),
      note: upcomingTrainingSessions.length > 0 ? 'sessions scheduled' : 'nothing locked in yet',
    },
    {
      label: 'Upcoming matches',
      value: String(upcomingFixtures.length),
      note: upcomingFixtures.length > 0 ? 'fixtures ahead' : 'add the next fixture',
    },
    {
      label: 'Outstanding fines',
      value: `$${fineSummary.outstandingAmount}`,
      note: `${fineSummary.outstandingCount} unpaid`,
    },
  ];

  return (
    <section className="page-grid home-dashboard">
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="eyebrow">{clubName}</span>
          <h2>Run the week from one dashboard.</h2>
          <p className="muted">
            Start with the next session, the next match, and the jobs that still need coach attention.
          </p>

          <div className="home-hero__actions">
            <Link className="schedule-card__action" to={displayedTraining ? `/training/${displayedTraining.id}` : '/training'}>
              {canAccessAdmin && displayedTraining ? 'Open training' : 'View training'}
            </Link>
            <Link className="schedule-card__action" to={primaryMatch ? `/matches/${primaryMatch.id}` : '/matches'}>
              {canAccessAdmin && primaryMatch ? 'Open next match' : 'View matches'}
            </Link>
            {canAccessAdmin ? (
              <Link className="schedule-card__action" to="/admin">
                Open admin
              </Link>
            ) : null}
          </div>
        </div>

        <section className="home-hero__spotlight">
          <div className="home-hero__spotlight-header">
            <img alt="Warners Bay Bulldogs logo" className="home-hero__logo" src={bulldogsLogo} />
            <div className="stack-sm">
              <span className="home-hero__spotlight-label">Current focus</span>
              <strong>{primaryMatch ? matchesHeading : trainingHeading}</strong>
            </div>
          </div>

          {primaryMatch ? (
            <div className="stack-sm">
              <p>{primaryMatch.grade ? `${primaryMatch.grade} • ` : ''}vs {primaryMatch.opponent}</p>
              <p className="muted">{formatDate(primaryMatch.date)}</p>
              <p className="muted">{primaryMatch.venue}</p>
            </div>
          ) : displayedTraining && trainingSummary ? (
            <div className="stack-sm">
              <p>{displayedTraining.title}</p>
              <p className="muted">{formatDate(displayedTraining.date)}</p>
              <p className="muted">{displayedTraining.location}</p>
              <div className="metric-row">
                <span className="metric metric--positive">{trainingSummary.present} marked present</span>
                <span className="metric metric--neutral">{trainingSummary.unknown} not marked</span>
              </div>
            </div>
          ) : (
            <p className="muted">Add players, training, and fixtures to turn this into your weekly club dashboard.</p>
          )}
        </section>
      </section>

      {!hasAnyData ? (
        <section className="card stack">
          <div className="stack-sm">
            <h3>Get started</h3>
            <p className="muted">
              {canAccessAdmin
                ? 'Set up the roster first, then add training and matches so coaches can work from live club data.'
                : 'Your coach or admin will add the roster, training, and matches here.'}
            </p>
          </div>

          {canAccessAdmin ? (
            <>
              <div className="two-column">
                <Link className="home-action-row" to="/admin/team-setup">
                  <div className="stack-sm">
                    <strong>Add or import players</strong>
                    <span className="muted">Build the roster before selections and attendance start.</span>
                  </div>
                  <span className="text-link">Open setup</span>
                </Link>
                <Link className="home-action-row" to="/admin/training">
                  <div className="stack-sm">
                    <strong>Create the first training session</strong>
                    <span className="muted">Give coaches somewhere to mark weekly attendance.</span>
                  </div>
                  <span className="text-link">Open training</span>
                </Link>
                <Link className="home-action-row" to="/admin/matches">
                  <div className="stack-sm">
                    <strong>Create the first fixture</strong>
                    <span className="muted">Start availability, lineup, and match-day workflows.</span>
                  </div>
                  <span className="text-link">Open matches</span>
                </Link>
                <button
                  className="home-action-row home-action-row--button"
                  disabled={!isHydrated}
                  onClick={() => {
                    loadDemoData();
                    setDemoMessage('Dummy data loaded into this club workspace.');
                  }}
                  type="button">
                  <div className="stack-sm">
                    <strong>Load dummy data</strong>
                    <span className="muted">Explore the full workflow with sample players, sessions, and matches.</span>
                  </div>
                  <span className="text-link">Load demo</span>
                </button>
              </div>

              {demoMessage ? <p className="muted">{demoMessage}</p> : null}
            </>
          ) : null}
        </section>
      ) : (
        <>
          <section className="home-summary-grid">
            {summaryCards.map((card) => (
              <section className="card stack-sm" key={card.label}>
                <span className="eyebrow">{card.label}</span>
                <strong className="home-summary-grid__value">{card.value}</strong>
                <span className="muted">{card.note}</span>
              </section>
            ))}
          </section>

          <div className="home-dashboard__grid">
            <section className="card stack">
              <div className="split-row">
                <div className="stack-sm">
                  <h3>Next up</h3>
                  <p className="muted">Jump straight into the next live training or match workflow.</p>
                </div>
              </div>

              <div className="home-focus-grid">
                {displayedTraining && trainingSummary ? (
                  <section className="home-focus-card">
                    <span className="eyebrow">{trainingHeading}</span>
                    <h3>{displayedTraining.title}</h3>
                    <p className="muted">{formatDate(displayedTraining.date)}</p>
                    <p className="muted">{displayedTraining.location}</p>
                    <div className="metric-row">
                      <span className="metric metric--positive">{trainingSummary.present} marked present</span>
                      <span className="metric metric--negative">{trainingSummary.absent} marked absent</span>
                      <span className="metric metric--neutral">{trainingSummary.unknown} not marked</span>
                    </div>
                    {canAccessAdmin ? (
                      <Link className="text-link" to={`/training/${displayedTraining.id}`}>
                        Mark attendance
                      </Link>
                    ) : (
                      <Link className="text-link" to="/training">
                        View training
                      </Link>
                    )}
                  </section>
                ) : (
                  <section className="home-focus-card">
                    <span className="eyebrow">{trainingHeading}</span>
                    <h3>No session scheduled</h3>
                    <p className="muted">
                      {canAccessAdmin
                        ? 'Add the next training session to start marking attendance.'
                        : 'Training sessions will appear here when they are scheduled.'}
                    </p>
                    {canAccessAdmin ? (
                      <Link className="text-link" to="/admin/training">
                        Create training
                      </Link>
                    ) : null}
                  </section>
                )}

                {matchCards.length > 0 ? (
                  matchCards.map((card) => (
                    <section className="home-focus-card" key={card.fixture.id}>
                      <span className="eyebrow">{card.heading}</span>
                      <h3>{card.fixture.grade ? `${card.fixture.grade} • ` : ''}vs {card.fixture.opponent}</h3>
                      <p className="muted">{formatDate(card.fixture.date)}</p>
                      <p className="muted">{card.fixture.venue}</p>
                      <div className="metric-row">
                        <span className="metric metric--positive">{card.summary.available} selected</span>
                        <span className="metric metric--negative">{card.summary.unavailable} unavailable</span>
                        <span className="metric metric--neutral">
                          {card.summary.respondedNotSelected} available
                        </span>
                        <span className="metric metric--neutral">{card.summary.notResponded} no response</span>
                      </div>
                      <Link className="text-link" to={canAccessAdmin ? `/matches/${card.fixture.id}` : '/matches'}>
                        {canAccessAdmin ? 'Manage availability' : 'View fixture'}
                      </Link>
                    </section>
                  ))
                ) : (
                  <section className="home-focus-card">
                    <span className="eyebrow">{matchesHeading}</span>
                    <h3>No fixture scheduled</h3>
                    <p className="muted">
                      {canAccessAdmin
                        ? 'Create the next match to open availability and lineup planning.'
                        : 'Fixtures will appear here when they are scheduled.'}
                    </p>
                    {canAccessAdmin ? (
                      <Link className="text-link" to="/admin/matches">
                        Create match
                      </Link>
                    ) : null}
                  </section>
                )}
              </div>
            </section>

            <section className="card stack">
              <div className="stack-sm">
                <h3>Needs attention</h3>
                <p className="muted">The quickest way to clear the next bit of admin or coach work.</p>
              </div>

              {attentionItems.length > 0 ? (
                <div className="home-action-list">
                  {attentionItems.slice(0, 4).map((item) => (
                    <Link className="home-action-row" key={`${item.title}-${item.to}`} to={item.to}>
                      <div className="stack-sm">
                        <strong>{item.title}</strong>
                        <span className="muted">{item.detail}</span>
                      </div>
                      <span className="text-link">{item.action}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Nothing urgent right now. Training, selection, and club admin are all under control.</p>
              )}

              <div className="home-shortcuts">
                <Link className="schedule-card__action" to="/training">
                  Training
                </Link>
                <Link className="schedule-card__action" to="/matches">
                  Matches
                </Link>
                {canAccessAdmin ? (
                  <Link className="schedule-card__action" to="/admin/team">
                    Team
                  </Link>
                ) : null}
                {canAccessAdmin ? (
                  <Link className="schedule-card__action" to="/admin">
                    Admin hub
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
