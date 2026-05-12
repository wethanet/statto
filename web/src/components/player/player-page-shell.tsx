import type { PropsWithChildren, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { getPlayerDisplayName, getPlayerSortValue } from '@/lib/team';

import { PlayerReminderPanel } from '@web/components/player/player-reminder-panel';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { usePlayerProfile } from '@web/lib/player-profile-context';

type PlayerPageShellProps = PropsWithChildren<{
  title: string;
  description: string;
  emptyState?: ReactNode;
}>;

export function PlayerPageShell({
  children,
  description,
  emptyState,
  title,
}: PlayerPageShellProps) {
  const { activeClub } = useClubAccess();
  const { players } = useClubData();
  const { canManagePlayer, isPlayer } = useClubPermissions();
  const {
    clearSelectedPlayer,
    isLoading,
    isLocked,
    selectedPlayer,
    selectedPlayerId,
    setSelectedPlayerId,
  } = usePlayerProfile();
  const availablePlayers = [...players]
    .filter((player) => player.active && (isLocked ? player.id === selectedPlayerId : canManagePlayer(player)))
    .sort((left, right) => {
      return (
        getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
        left.name.localeCompare(right.name)
      );
    });
  const playerNavItems = [
    { label: 'Overview', to: '/player' },
    { label: 'Availability', to: '/player/availability' },
    ...(isPlayer ? ([{ label: 'Votes', to: '/player/votes' }] as const) : []),
    { label: 'Fines', to: '/player/fines' },
  ];

  return (
    <section className="page-grid player-page">
      <section className="player-page__hero">
        <div className="player-page__copy">
          <span className="eyebrow">Player App</span>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>

        <nav aria-label="Player sections" className="admin-page__nav">
          {playerNavItems.map((item) => (
            <NavLink
              className={({ isActive }) => {
                return isActive ? 'admin-page__nav-link admin-page__nav-link--active' : 'admin-page__nav-link';
              }}
              end={item.to === '/player'}
              key={item.to}
              to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="card stack">
        <div className="split-row">
          <div className="stack-sm">
            <h3>Player profile</h3>
            <p className="muted">
              {isLocked
                ? activeClub
                  ? `Your ${activeClub.name} access is linked to one player profile by an admin.`
                  : 'Your player access is linked to one player profile.'
                : activeClub
                  ? `Choose the player profile to use inside ${activeClub.name}. This choice is saved on this device.`
                  : 'Choose the player profile to use in the player app.'}
            </p>
          </div>

          {selectedPlayer ? (
            <span className="metric metric--positive">{getPlayerDisplayName(selectedPlayer)}</span>
          ) : null}
        </div>

        {isLoading ? (
          <p className="muted">Loading player profile...</p>
        ) : isLocked ? (
          selectedPlayer ? (
            <p className="muted">This account is locked to your assigned player profile.</p>
          ) : (
            <p className="muted">An admin still needs to link this account to a player profile.</p>
          )
        ) : availablePlayers.length > 0 ? (
          <>
            <label className="field field--inline">
              <span>Current player</span>
              <select
                className="input"
                onChange={(event) => {
                  const nextPlayerId = event.target.value || null;
                  setSelectedPlayerId(nextPlayerId).catch((error: unknown) => {
                    console.warn('Failed to save selected player profile', error);
                  });
                }}
                value={selectedPlayerId ?? ''}>
                <option value="">Choose a player profile</option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {getPlayerDisplayName(player)}
                  </option>
                ))}
              </select>
            </label>

            {selectedPlayer ? (
              <div className="inline-actions">
                <button
                  className="button button--ghost"
                  onClick={() => {
                    clearSelectedPlayer().catch((error: unknown) => {
                      console.warn('Failed to clear selected player profile', error);
                    });
                  }}
                  type="button">
                  Clear player
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted">No active players are available in this club yet.</p>
        )}
      </section>

      {selectedPlayer ? <PlayerReminderPanel playerId={selectedPlayer.id} /> : null}

      {selectedPlayer ? (
        children
      ) : (
        emptyState ?? (
          <section className="card stack">
            <h3>Choose your player profile</h3>
            <p className="muted">
              {isLocked
                ? 'An admin still needs to link this account to a player profile before the player app can be used.'
                : 'Select yourself above to manage your match availability and keep tabs on fines.'}
            </p>
          </section>
        )
      )}
    </section>
  );
}
