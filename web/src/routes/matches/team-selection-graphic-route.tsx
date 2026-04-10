import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toPng } from 'html-to-image';

import { getFixtureById, getPlayersForFixture } from '@/lib/availability';
import { getPlayersForFixtureLineup } from '@/lib/match-lineup';
import { getPlayerSortValue } from '@/lib/team';
import type { MatchLinePosition, Player } from '@/lib/types';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';

type AnnouncementPlayer = Player & {
  availabilityStatus: 'available' | 'unavailable' | 'uncertain';
  matchPosition: MatchLinePosition | null;
};

const POSITION_SECTIONS: MatchLinePosition[] = ['B', 'HB', 'C', 'HF', 'F', 'Fol', 'Int'];

function formatFixtureDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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

export function TeamSelectionGraphicRoute() {
  const { fixtureId = '' } = useParams();
  const { activeClub } = useClubAccess();
  const { availabilityRecords, fixtures, matchLineupAssignments, players } = useClubData();
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

  const groupedSelection = useMemo(() => {
    const selectedPlayers = sortPlayers(
      lineupPlayers.filter((player): player is AnnouncementPlayer => player.matchPosition !== null)
    );

    return POSITION_SECTIONS.map((position) => {
      const playersForPosition = selectedPlayers.filter((player) => player.matchPosition === position);

      return {
        position,
        rows: chunkItems(playersForPosition, 3),
      };
    });
  }, [lineupPlayers]);

  const emergencies = useMemo(() => {
    return sortPlayers(
      lineupPlayers.filter((player): player is AnnouncementPlayer => {
        return player.active && player.availabilityStatus === 'available' && player.matchPosition === null;
      })
    );
  }, [lineupPlayers]);

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
                  backgroundColor: '#0f3cc9',
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
                <span className="team-sheet__eyebrow">Warners Bay Bulldogs</span>
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

            <div className="team-sheet__body">
              {groupedSelection.map((group) => (
                <section className="team-sheet__section" key={group.position}>
                  <div className="team-sheet__position">{group.position === 'Int' ? 'INT' : group.position}</div>
                  <div className="team-sheet__section-body">
                    {group.rows.length > 0 ? (
                      group.rows.map((row, rowIndex) => (
                        <div className="team-sheet__row" key={`${group.position}-${rowIndex}`}>
                          {row.map((player) => (
                            <article className="team-sheet__player" key={player.id}>
                              <span className="team-sheet__number">{player.number ?? '--'}</span>
                              <span className="team-sheet__name">{getPlayerLabel(player)}</span>
                            </article>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p className="team-sheet__empty">No players selected in this line yet.</p>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {emergencies.length > 0 ? (
              <footer className="team-sheet__footer">
                <span className="team-sheet__footer-label">EMG</span>
                <p className="team-sheet__footer-copy">
                  {emergencies
                    .map((player) => {
                      return `${player.number ?? '--'} ${getPlayerLabel(player)}`;
                    })
                    .join('   •   ')}
                </p>
              </footer>
            ) : null}
          </section>
        </div>
      </section>
    </section>
  );
}
