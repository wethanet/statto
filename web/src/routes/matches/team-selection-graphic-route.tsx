import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getFixtureById, getPlayersForFixture } from '@/lib/availability';
import { getPlayersForFixtureLineup } from '@/lib/match-lineup';
import { buildMatchRotationPlan, buildRotationPlan } from '@/lib/rotation-groups';
import { getPlayerRotationGroupLabel, getPlayerSortValue } from '@/lib/team';
import type { MatchLinePosition, Player, PlayerRotationGroup } from '@/lib/types';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';

type AnnouncementPlayer = Player & {
  availabilityStatus: 'available' | 'unavailable' | 'not-responded';
  matchPosition: MatchLinePosition | null;
};

type PlayerLabelMode = 'full-name' | 'nickname';
type GraphicVariant = 'selection' | 'rotation-groups';
const rotationGroupOrder: PlayerRotationGroup[] = [
  'inside-mids',
  'running-players',
  'key-position-players',
  'utility-players',
];

function formatFixtureDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getPlayerLabel(player: Player, labelMode: PlayerLabelMode) {
  const baseLabel =
    labelMode === 'nickname' && player.nickname?.trim()
      ? player.nickname.trim()
      : player.name.trim();

  if (player.role === 'captain') {
    return `${baseLabel} (c)`;
  }

  return baseLabel;
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

function RotationMarker({
  group,
  variant,
  isVisible,
}: {
  group: PlayerRotationGroup | null;
  variant: GraphicVariant;
  isVisible: boolean;
}) {
  if (!group || !isVisible) {
    return null;
  }

  const markerClassName =
    variant === 'rotation-groups'
      ? `team-sheet__rotation-marker team-sheet__rotation-marker--${group}`
      : `team-sheet__player-dot team-sheet__player-dot--${group}`;

  return (
    <span aria-label="Rotation groups" className="team-sheet__player-dots">
      <span
        aria-hidden="true"
        className={markerClassName}
        title={getPlayerRotationGroupLabel(group)}
      />
    </span>
  );
}

function getRotationGroupCardClass(group: PlayerRotationGroup | null, variant: GraphicVariant) {
  if (!group || variant !== 'rotation-groups') {
    return '';
  }

  return ` team-sheet__rotation-card team-sheet__rotation-card--${group}`;
}

export function TeamSelectionGraphicRoute() {
  useEnsureClubCollections(['fixtures', 'matchLineupAssignments', 'players']);

  const { fixtureId = '' } = useParams();
  const { activeClub } = useClubAccess();
  const { availabilityRecords, fixtures, matchLineupAssignments, players } = useClubData();
  const { policySettings } = useClubPolicy();
  const teamSheetRef = useRef<HTMLElement | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<GraphicVariant | null>(null);
  const [playerLabelMode, setPlayerLabelMode] = useState<PlayerLabelMode>('full-name');
  const [graphicVariant, setGraphicVariant] = useState<GraphicVariant>('selection');
  const fixture = getFixtureById(fixtureId, fixtures);
  const rotationGroupsEnabled = policySettings.rotationGroupsEnabled;

  useEffect(() => {
    if (!rotationGroupsEnabled && graphicVariant === 'rotation-groups') {
      setGraphicVariant('selection');
    }
  }, [graphicVariant, rotationGroupsEnabled]);

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

    return buildMatchRotationPlan(lineupPlayers, rotationPlan.assignments);
  }, [fixture, lineupPlayers, rotationPlan.assignments]);

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
  const rotationGroupColumns = useMemo(() => {
    return rotationGroupOrder
      .map((group) => {
        const groupPlayers = sortPlayers(
          lineupPlayers.filter((player) => {
            return matchRotationPlan.assignments[player.id]?.group === group;
          })
        );

        return {
          group,
          players: groupPlayers,
        };
      })
      .filter((entry) => entry.players.length > 0);
  }, [lineupPlayers, matchRotationPlan.assignments]);

  async function waitForRenderFrame() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  async function downloadGraphic(variant: GraphicVariant) {
    if (!teamSheetRef.current) {
      setDownloadMessage('The team sheet is not ready to download yet.');
      return;
    }

    try {
      setIsDownloading(variant);
      setDownloadMessage(null);
      await waitForRenderFrame();

      const dataUrl = await toPng(teamSheetRef.current, {
        backgroundColor: '#2a7f39',
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');

      link.href = dataUrl;
      link.download =
        variant === 'rotation-groups'
          ? `team-selection-rotation-groups-${fixtureId}.png`
          : `team-selection-${fixtureId}.png`;
      link.click();
      setDownloadMessage('PNG downloaded.');
    } catch (error: unknown) {
      setDownloadMessage(
        error instanceof Error ? error.message : 'Unable to download the team sheet right now.'
      );
    } finally {
      setIsDownloading(null);
    }
  }

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
          <div className="button-group">
            <div aria-label="Player label mode" className="button-group__controls" role="group">
              <button
                className={
                  playerLabelMode === 'full-name'
                    ? 'pill-button pill-button--compact pill-button--selected'
                    : 'pill-button pill-button--compact'
                }
                onClick={() => setPlayerLabelMode('full-name')}
                type="button">
                Full name
              </button>
              <button
                className={
                  playerLabelMode === 'nickname'
                    ? 'pill-button pill-button--compact pill-button--selected'
                    : 'pill-button pill-button--compact'
                }
                onClick={() => setPlayerLabelMode('nickname')}
                type="button">
                Nickname
              </button>
            </div>
          </div>
          <div className="button-group">
            <div aria-label="Announcement layout" className="button-group__controls" role="group">
              <button
                className={
                  graphicVariant === 'selection'
                    ? 'pill-button pill-button--compact pill-button--selected'
                    : 'pill-button pill-button--compact'
                }
                onClick={() => setGraphicVariant('selection')}
                type="button">
                Field view
              </button>
              {rotationGroupsEnabled ? (
                <button
                  className={
                    graphicVariant === 'rotation-groups'
                      ? 'pill-button pill-button--compact pill-button--selected'
                      : 'pill-button pill-button--compact'
                  }
                  onClick={() => setGraphicVariant('rotation-groups')}
                  type="button">
                  Rotation groups
                </button>
              ) : null}
            </div>
          </div>
          <button
            className="button"
            disabled={isDownloading !== null}
            type="button"
            onClick={() => {
              void downloadGraphic(graphicVariant);
            }}>
            {isDownloading !== null ? 'Downloading...' : 'Download image'}
          </button>
        </div>
        {downloadMessage ? <p className="muted">{downloadMessage}</p> : null}
        <Link className="text-link" to={`/matches/${fixture.id}`}>
          Back to match team selection
        </Link>
      </section>

      <section className="card team-sheet-stage">
        <div className="team-sheet-stage__scroll">
          <section
            className={
              graphicVariant === 'rotation-groups'
                ? 'team-sheet team-sheet--rotation-groups'
                : 'team-sheet'
            }
            ref={teamSheetRef}>
            <header className="team-sheet__header">
              <div className="team-sheet__header-copy">
                <span className="team-sheet__eyebrow">{activeClub?.name ?? 'Warners Bay Bulldogs'}</span>
                <h1 className="team-sheet__title">
                  {graphicVariant === 'rotation-groups' ? 'Rotation Groups' : 'Team Selection'}
                </h1>
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

            {graphicVariant === 'rotation-groups' ? (
              <section className="rotation-board" aria-label="Players grouped by rotation group">
                <div
                  className="rotation-board__grid"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(rotationGroupColumns.length, 1)}, minmax(0, 1fr))`,
                  }}>
                  {rotationGroupColumns.map((column) => (
                    <section
                      className={`rotation-board__column rotation-board__column--${column.group}`}
                      key={column.group}>
                      <div className="rotation-board__column-header">
                        <span
                          aria-hidden="true"
                          className={`rotation-board__swatch rotation-board__swatch--${column.group}`}
                        />
                        <span className="rotation-board__count">
                          {column.players.length} player{column.players.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="rotation-board__list">
                        {column.players.map((player) => (
                          <article className="rotation-board__player" key={`rotation-board-${column.group}-${player.id}`}>
                            <span className="rotation-board__number">{player.number ?? '--'}</span>
                            <span className="rotation-board__name">{getPlayerLabel(player, playerLabelMode)}</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ) : (
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
                  className={`team-sheet__field-player team-sheet__field-player--back-${slot}${getRotationGroupCardClass(
                    matchRotationPlan.assignments[player.id]?.group ?? null,
                    graphicVariant
                  )}`}
                  key={`back-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player, playerLabelMode)}</span>
                    <RotationMarker
                      group={matchRotationPlan.assignments[player.id]?.group ?? null}
                      isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                      variant={graphicVariant}
                    />
                  </div>
                </article>
              ))}

              {halfBackLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--half-back-${slot}${getRotationGroupCardClass(
                    matchRotationPlan.assignments[player.id]?.group ?? null,
                    graphicVariant
                  )}`}
                  key={`half-back-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player, playerLabelMode)}</span>
                    <RotationMarker
                      group={matchRotationPlan.assignments[player.id]?.group ?? null}
                      isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                      variant={graphicVariant}
                    />
                  </div>
                </article>
              ))}

              {wingPlayers.left ? (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--wing-left${getRotationGroupCardClass(
                    matchRotationPlan.assignments[wingPlayers.left.id]?.group ?? null,
                    graphicVariant
                  )}`}>
                  <span className="team-sheet__field-player-number">{wingPlayers.left.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">
                      {getPlayerLabel(wingPlayers.left, playerLabelMode)}
                    </span>
                    <RotationMarker
                      group={matchRotationPlan.assignments[wingPlayers.left.id]?.group ?? null}
                      isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                      variant={graphicVariant}
                    />
                  </div>
                </article>
              ) : null}

              {wingPlayers.right ? (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--wing-right${getRotationGroupCardClass(
                    matchRotationPlan.assignments[wingPlayers.right.id]?.group ?? null,
                    graphicVariant
                  )}`}>
                  <span className="team-sheet__field-player-number">{wingPlayers.right.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">
                      {getPlayerLabel(wingPlayers.right, playerLabelMode)}
                    </span>
                    <RotationMarker
                      group={matchRotationPlan.assignments[wingPlayers.right.id]?.group ?? null}
                      isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                      variant={graphicVariant}
                    />
                  </div>
                </article>
              ) : null}

              {centreSquarePlayers.length > 0 ? (
                <div className="team-sheet__centre-stack">
                  {centreSquarePlayers.map((player) => (
                    <article
                      className={`team-sheet__field-player team-sheet__field-player--compact team-sheet__field-player--stacked${getRotationGroupCardClass(
                        matchRotationPlan.assignments[player.id]?.group ?? null,
                        graphicVariant
                      )}`}
                      key={`centre-square-${player.id}`}>
                      <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                      <div className="team-sheet__player-copy">
                        <span className="team-sheet__field-player-name">{getPlayerLabel(player, playerLabelMode)}</span>
                        <RotationMarker
                          group={matchRotationPlan.assignments[player.id]?.group ?? null}
                          isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                          variant={graphicVariant}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {halfForwardLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--half-forward-${slot}${getRotationGroupCardClass(
                    matchRotationPlan.assignments[player.id]?.group ?? null,
                    graphicVariant
                  )}`}
                  key={`half-forward-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player, playerLabelMode)}</span>
                    <RotationMarker
                      group={matchRotationPlan.assignments[player.id]?.group ?? null}
                      isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                      variant={graphicVariant}
                    />
                  </div>
                </article>
              ))}

              {forwardLinePlayers.map(({ player, slot }) => (
                <article
                  className={`team-sheet__field-player team-sheet__field-player--forward-${slot}${getRotationGroupCardClass(
                    matchRotationPlan.assignments[player.id]?.group ?? null,
                    graphicVariant
                  )}`}
                  key={`forward-${player.id}`}>
                  <span className="team-sheet__field-player-number">{player.number ?? '--'}</span>
                  <div className="team-sheet__player-copy">
                    <span className="team-sheet__field-player-name">{getPlayerLabel(player, playerLabelMode)}</span>
                    <RotationMarker
                      group={matchRotationPlan.assignments[player.id]?.group ?? null}
                      isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                      variant={graphicVariant}
                    />
                  </div>
                </article>
              ))}
            </section>
            )}

            {graphicVariant === 'selection' && (interchangePlayers.length > 0 || emergencies.length > 0) ? (
              <footer className="team-sheet__bench-grid">
                {interchangePlayers.length > 0 ? (
                  <section className="team-sheet__bench-section">
                    <span className="team-sheet__bench-label">Interchange</span>
                    <div className="team-sheet__bench-list">
                      {interchangePlayers.map((player) => (
                        <article
                          className={`team-sheet__bench-player${getRotationGroupCardClass(
                            matchRotationPlan.assignments[player.id]?.group ?? null,
                            graphicVariant
                          )}`}
                          key={`interchange-${player.id}`}>
                          <span className="team-sheet__bench-number">{player.number ?? '--'}</span>
                          <div className="team-sheet__player-copy">
                            <span className="team-sheet__bench-name">{getPlayerLabel(player, playerLabelMode)}</span>
                            <RotationMarker
                              group={matchRotationPlan.assignments[player.id]?.group ?? null}
                              isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                              variant={graphicVariant}
                            />
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
                        <article
                          className={`team-sheet__bench-player${getRotationGroupCardClass(
                            matchRotationPlan.assignments[player.id]?.group ?? null,
                            graphicVariant
                          )}`}
                          key={`emergency-${player.id}`}>
                          <span className="team-sheet__bench-number">{player.number ?? '--'}</span>
                          <div className="team-sheet__player-copy">
                            <span className="team-sheet__bench-name">{getPlayerLabel(player, playerLabelMode)}</span>
                            <RotationMarker
                              group={matchRotationPlan.assignments[player.id]?.group ?? null}
                              isVisible={rotationGroupsEnabled && playerLabelMode === 'nickname'}
                              variant={graphicVariant}
                            />
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
