import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toPng } from 'html-to-image';

import { getFixtureById, getPlayersForFixture } from '@/lib/availability';
import { getPlayersForFixtureLineup } from '@/lib/match-lineup';
import { buildMatchRotationPlan, buildRotationPlan } from '@/lib/rotation-groups';
import { getPlayerRotationGroupLabel, getPlayerSortValue } from '@/lib/team';
import type { MatchLinePosition, Player, PlayerRotationGroup } from '@/lib/types';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';

type AnnouncementPlayer = Player & {
  availabilityStatus: 'available' | 'unavailable' | 'uncertain';
  matchPosition: MatchLinePosition | null;
};

function formatFixtureDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getPlayerLabel(player: Player) {
  const nameParts = player.name.trim().split(/\s+/);

  if (nameParts.length === 1) {
    return nameParts[0];
  }

  const firstName = nameParts[0];
  const surname = nameParts[nameParts.length - 1];

  return `${firstName.charAt(0).toUpperCase()}. ${surname}`;
}

function sortPlayers(players: AnnouncementPlayer[]) {
  return [...players].sort((left, right) => {
    return (
      getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
      left.name.localeCompare(right.name)
    );
  });
}

function createPositionMap(): Record<MatchLinePosition, AnnouncementPlayer[]> {
  return {
    B: [],
    HB: [],
    W: [],
    C: [],
    HF: [],
    F: [],
    Fol: [],
    Int: [],
  };
}

function getThreeSpotLinePlayers(players: AnnouncementPlayer[]) {
  if (players.length <= 0) {
    return [];
  }

  if (players.length === 1) {
    return [{ player: players[0], slot: 'center' as const }];
  }

  if (players.length === 2) {
    return [
      { player: players[0], slot: 'left' as const },
      { player: players[1], slot: 'right' as const },
    ];
  }

  return [
    { player: players[0], slot: 'left' as const },
    { player: players[1], slot: 'center' as const },
    { player: players[2], slot: 'right' as const },
  ];
}

function getWingPlayers(wingPlayers: AnnouncementPlayer[], centrePlayers: AnnouncementPlayer[]) {
  if (wingPlayers.length > 0) {
    return {
      left: wingPlayers[0] ?? null,
      right: wingPlayers[1] ?? null,
    };
  }

  if (centrePlayers.length === 2) {
    return {
      left: centrePlayers[0],
      right: centrePlayers[1],
    };
  }

  if (centrePlayers.length >= 3) {
    return {
      left: centrePlayers[0],
      right: centrePlayers[2],
    };
  }

  return {
    left: null,
    right: null,
  };
}

function getCentreSquarePlayers(centrePlayers: AnnouncementPlayer[], followerPlayers: AnnouncementPlayer[]) {
  const centrePlayer =
    centrePlayers.length >= 3 ? centrePlayers[1] : centrePlayers.length > 0 ? centrePlayers[0] : null;

  return [centrePlayer, ...followerPlayers].filter((player): player is AnnouncementPlayer => player !== null);
}

function RotationDots({ group }: { group: PlayerRotationGroup | null }) {
  if (!group) {
    return null;
  }

  return (
    <span aria-label="Rotation groups" className="team-sheet__player-dots">
      <span
        aria-hidden="true"
        className={`team-sheet__player-dot team-sheet__player-dot--${group}`}
        title={getPlayerRotationGroupLabel(group)}
      />
    </span>
  );
}

export function TeamSelectionGraphicRoute() {
  const { fixtureId = '' } = useParams();
  const { activeClub } = useClubAccess();
  const { availabilityRecords, fixtures, matchLineupAssignments, matchRotationAssignments, players } =
    useClubData();
  const teamSheetRef = useRef<HTMLElement | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const fixture = getFixtureById(fixtureId, fixtures);

  const lineupPlayers = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return getPlayersForFixtureLineup(
      fixture.id,
      getPlayersForFixture(fixture.id, players, availabilityRecords),
      matchLineupAssignments
    );
  }, [availabilityRecords, fixture, matchLineupAssignments, players]);
  const rotationPlan = useMemo(() => {
    return buildRotationPlan(players);
  }, [players]);
  const matchRotationPlan = useMemo(() => {
    if (!fixture) {
      return { assignments: {} };
    }

    return buildMatchRotationPlan(fixture.id, lineupPlayers, rotationPlan.assignments, matchRotationAssignments);
  }, [fixture, lineupPlayers, matchRotationAssignments, rotationPlan.assignments]);

  const selectionByPosition = useMemo(() => {
    const selectedPlayers = sortPlayers(
      lineupPlayers.filter((player): player is AnnouncementPlayer => player.matchPosition !== null)
    );
    const nextSelection = createPositionMap();

    selectedPlayers.forEach((player) => {
      const position = player.matchPosition;

      if (!position) {
        return;
      }

      nextSelection[position].push(player);
    });

    return nextSelection;
  }, [lineupPlayers]);

  const emergencies = useMemo(() => {
    return sortPlayers(
      lineupPlayers.filter((player): player is AnnouncementPlayer => {
        return player.active && player.availabilityStatus === 'available' && player.matchPosition === null;
      })
    );
  }, [lineupPlayers]);

  const backLinePlayers = getThreeSpotLinePlayers(selectionByPosition.B);
  const halfBackLinePlayers = getThreeSpotLinePlayers(selectionByPosition.HB);
  const wingPlayers = getWingPlayers(selectionByPosition.W, selectionByPosition.C);
  const centreSquarePlayers = getCentreSquarePlayers(selectionByPosition.C, selectionByPosition.Fol);
  const halfForwardLinePlayers = getThreeSpotLinePlayers(selectionByPosition.HF);
  const forwardLinePlayers = getThreeSpotLinePlayers(selectionByPosition.F);
  const interchangePlayers = selectionByPosition.Int;

  if (!fixture) {
    return (
      <section className="page-grid">
        <section className="panel stack">
          <span className="eyebrow">Matches</span>
          <h2>Team announcement not found</h2>
          <p className="muted">Choose a match first, then open the announcement view from that fixture.</p>
          <Link className="text-link" to="/matches">
            Back to matches
          </Link>
        </section>
      </section>
    );
  }

  return (
    <section className="page-grid">
      <section className="card stack">
        <span className="eyebrow">Team Announcement</span>
        <h2>Lineup announcement</h2>
        <p className="muted">
          This screen keeps a fixed desktop layout so you can download the same social-ready image from a phone or desktop.
        </p>
        <div className="inline-actions announcement-actions">
          <button
            className="button"
            disabled={isDownloading}
            type="button"
            onClick={async () => {
              if (!teamSheetRef.current) {
                setDownloadMessage('The team sheet is not ready to download yet.');
                return;
              }

              try {
                setIsDownloading(true);
                setDownloadMessage(null);

                const dataUrl = await toPng(teamSheetRef.current, {
                  backgroundColor: '#2a7f39',
                  cacheBust: true,
                  pixelRatio: 2,
                });
                const link = document.createElement('a');

                link.href = dataUrl;
                link.download = `team-selection-${fixture.id}.png`;
                link.click();
                setDownloadMessage('PNG downloaded.');
              } catch (error: unknown) {
                setDownloadMessage(
                  error instanceof Error ? error.message : 'Unable to download the team sheet right now.'
                );
              } finally {
                setIsDownloading(false);
              }
            }}>
            {isDownloading ? 'Downloading...' : 'Download image'}
          </button>
        </div>
        {downloadMessage ? <p className="muted">{downloadMessage}</p> : null}
        <Link className="text-link" to={`/matches/${fixture.id}`}>
          Back to match team selection
        </Link>
      </section>

      <section className="card team-sheet-stage">
        <div className="team-sheet-stage__scroll">
          <section className="team-sheet" ref={teamSheetRef}>
            <header className="team-sheet__header">
              <div className="team-sheet__header-copy">
                <span className="team-sheet__eyebrow">{activeClub?.name ?? 'Warners Bay Bulldogs'}</span>
                <h1 className="team-sheet__title">Team Selection</h1>
                <div className="team-sheet__meta-row">
                  <span className="team-sheet__badge">{fixture.grade?.trim() || 'Match day'}</span>
                  <span className="team-sheet__meta">
                    {fixture.isHome ? 'v' : '@'} {fixture.opponent}
                  </span>
                </div>
                <p className="team-sheet__detail">
                  {activeClub?.name ?? 'Warners Bay Bulldogs'} • {formatFixtureDate(fixture.date)} • {fixture.venue}
                </p>
              </div>
              <div className="team-sheet__logo-wrap">
                <img alt="Warners Bay Bulldogs logo" className="team-sheet__logo" src={bulldogsLogo} />
              </div>
            </header>

            <section className="team-sheet__field" aria-label="Players shown in their match positions on a football field">
              <div aria-hidden="true" className="team-sheet__oval" />
              <div aria-hidden="true" className="team-sheet__arc team-sheet__arc--top" />
              <div aria-hidden="true" className="team-sheet__arc team-sheet__arc--bottom" />
              <div aria-hidden="true" className="team-sheet__goal-square team-sheet__goal-square--top" />
              <div aria-hidden="true" className="team-sheet__goal-square team-sheet__goal-square--bottom" />
              <div aria-hidden="true" className="team-sheet__goal-posts team-sheet__goal-posts--top" />
              <div aria-hidden="true" className="team-sheet__goal-posts team-sheet__goal-posts--bottom" />
              <div aria-hidden="true" className="team-sheet__centre-square" />
              <div aria-hidden="true" className="team-sheet__centre-circle" />

              {backLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--back-${slot}`}
                  key={`back-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player)}</span>
                    <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                  </div>
                </article>
              ))}

              {halfBackLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--half-back-${slot}`}
                  key={`half-back-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player)}</span>
                    <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                  </div>
                </article>
              ))}

              {wingPlayers.left ? (
                <article className="team-sheet__field-player team-sheet__field-player--wing-left">
                  <span className="team-sheet__field-player-number">{wingPlayers.left.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(wingPlayers.left)}</span>
                    <RotationDots group={matchRotationPlan.assignments[wingPlayers.left.id]?.group ?? null} />
                  </div>
                </article>
              ) : null}

              {wingPlayers.right ? (
                <article className="team-sheet__field-player team-sheet__field-player--wing-right">
                  <span className="team-sheet__field-player-number">{wingPlayers.right.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(wingPlayers.right)}</span>
                    <RotationDots group={matchRotationPlan.assignments[wingPlayers.right.id]?.group ?? null} />
                  </div>
                </article>
              ) : null}

              {centreSquarePlayers.length > 0 ? (
                <div className="team-sheet__centre-stack">
                  {centreSquarePlayers.map((player) => (
                    <article
                      className="team-sheet__field-player team-sheet__field-player--compact team-sheet__field-player--stacked"
                      key={`centre-square-${player.id}`}>
                      <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                      <div className="team-sheet__player-copy">
                        <span className="team-sheet__field-player-name">{getPlayerLabel(player)}</span>
                        <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {halfForwardLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--half-forward-${slot}`}
                  key={`half-forward-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player)}</span>
                    <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                  </div>
                </article>
              ))}

              {forwardLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--forward-${slot}`}
                  key={`forward-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player)}</span>
                    <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                  </div>
                </article>
              ))}
            </section>

            {interchangePlayers.length > 0 || emergencies.length > 0 ? (
              <footer className="team-sheet__bench-grid">
                {interchangePlayers.length > 0 ? (
                  <section className="team-sheet__bench-section">
                    <span className="team-sheet__bench-label">Interchange</span>
                    <div className="team-sheet__bench-list">
                      {interchangePlayers.map((player) => (
                        <article className="team-sheet__bench-player" key={`interchange-${player.id}`}>
                          <span className="team-sheet__bench-number">{player.number ?? '--'}</span>
                          <div className="team-sheet__player-copy">
                            <span className="team-sheet__bench-name">{getPlayerLabel(player)}</span>
                            <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {emergencies.length > 0 ? (
                  <section className="team-sheet__bench-section">
                    <span className="team-sheet__bench-label">Emergency</span>
                    <div className="team-sheet__bench-list">
                      {emergencies.map((player) => (
                        <article className="team-sheet__bench-player" key={`emergency-${player.id}`}>
                          <span className="team-sheet__bench-number">{player.number ?? '--'}</span>
                          <div className="team-sheet__player-copy">
                            <span className="team-sheet__bench-name">{getPlayerLabel(player)}</span>
                            <RotationDots group={matchRotationPlan.assignments[player.id]?.group ?? null} />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </footer>
            ) : null}
          </section>
        </div>
      </section>
    </section>
  );
}
