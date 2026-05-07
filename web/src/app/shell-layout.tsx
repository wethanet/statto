import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { getPlayerDisplayName, getPlayerSortValue } from '@/lib/team';
import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { PageSkeleton } from '@web/components/loading/page-skeleton';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { usePlayerProfile } from '@web/lib/player-profile-context';
import { useSettings } from '@web/lib/settings-context';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/training', label: 'Training' },
  { to: '/matches', label: 'Matches' },
  { to: '/admin', label: 'Admin', requires: 'admin' as const },
];

export function ShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeClub } = useClubAccess();
  const { signOut } = useAuth();
  const { isHydrated, players, storageMode } = useClubData();
  const { canAccessAdmin, canAccessPlayerApp, canManagePlayer } = useClubPermissions();
  const { selectedPlayer, selectedPlayerId, setSelectedPlayerId } = usePlayerProfile();
  const { setThemePreference, themePreference } = useSettings();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isPlayerView = location.pathname.startsWith('/player');
  const isAdminView = location.pathname.startsWith('/admin');
  const canSwitchView = canAccessAdmin && canAccessPlayerApp;
  const availablePlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.active && canManagePlayer(player))
      .sort((left, right) => {
        return (
          getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
          left.name.localeCompare(right.name)
        );
      });
  }, [canManagePlayer, players]);
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.requires === 'admin') {
      return canAccessAdmin;
    }

    if (item.requires === 'player') {
      return canAccessPlayerApp;
    }

    return true;
  });

  async function handleSignOut() {
    const message = await signOut();

    if (message) {
      window.alert(message);
    }
  }

  return (
    <div className="app-shell">
      <button
        aria-controls="primary-navigation"
        aria-expanded={isDrawerOpen}
        className="drawer-toggle"
        type="button"
        onClick={() => {
          setIsDrawerOpen((current) => !current);
        }}>
        {isDrawerOpen ? 'Close' : 'Menu'}
      </button>

      <aside className={isDrawerOpen ? 'shell-drawer shell-drawer--open' : 'shell-drawer'}>
        <div className="shell-drawer__panel">
          <div className="shell-drawer__brand">
            <img alt="Warners Bay Bulldogs logo" className="shell-drawer__logo" src={bulldogsLogo} />
            <div className="stack-sm">
              <p className="eyebrow">Warners Bay Bulldogs</p>
              <h1 className="shell-drawer__title">{activeClub?.name ?? 'Local club workspace'}</h1>
            </div>
          </div>

          <div className="shell-drawer__meta">
            <span
              className={
                storageMode === 'cloud'
                  ? 'status-pill status-pill--positive'
                  : 'status-pill status-pill--neutral'
              }>
              {storageMode === 'cloud' ? 'Cloud sync active' : 'Local mode'}
            </span>
          </div>

          <div className="shell-drawer__body">
            <div className="shell-drawer__section">
              <span className="shell-drawer__section-label">Workspace</span>
              <nav className="drawer-nav" id="primary-navigation" aria-label="Primary">
                {navItems.map((item) => {
                  return (
                    <NavLink
                      key={item.to}
                      className={({ isActive }) => {
                        return isActive ? 'drawer-link drawer-link--active' : 'drawer-link';
                      }}
                      end={item.end}
                      to={item.to}
                      onClick={() => {
                        setIsDrawerOpen(false);
                      }}>
                      <span className="drawer-link__bullet" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="shell-drawer__footer">
            <div className="shell-drawer__section">
              <span className="shell-drawer__section-label">Preferences</span>
            </div>
            <div className="shell-drawer__actions">
              {canSwitchView ? (
                <div className="shell-view-switcher">
                  <div className="shell-view-switcher__header">
                    <span className="shell-view-switcher__label">View mode</span>
                    {selectedPlayer ? (
                      <span className="shell-view-switcher__player">{getPlayerDisplayName(selectedPlayer)}</span>
                    ) : null}
                  </div>

                  <div className="shell-view-switcher__tabs" aria-label="View mode">
                    <button
                      className={
                        isAdminView || !isPlayerView
                          ? 'shell-view-switcher__tab shell-view-switcher__tab--active'
                          : 'shell-view-switcher__tab'
                      }
                      onClick={() => {
                        navigate('/admin');
                        setIsDrawerOpen(false);
                      }}
                      type="button">
                      Admin
                    </button>
                    <button
                      className={
                        isPlayerView
                          ? 'shell-view-switcher__tab shell-view-switcher__tab--active'
                          : 'shell-view-switcher__tab'
                      }
                      onClick={() => {
                        navigate('/player');
                        setIsDrawerOpen(false);
                      }}
                      type="button">
                      Player
                    </button>
                  </div>

                  <label className="shell-view-switcher__field">
                    <span>Viewing as</span>
                    <select
                      className="input"
                      onChange={(event) => {
                        const nextPlayerId = event.target.value || null;
                        setSelectedPlayerId(nextPlayerId).catch((error: unknown) => {
                          console.warn('Failed to save selected player profile', error);
                        });
                      }}
                      value={selectedPlayerId ?? ''}>
                      <option value="">Choose player</option>
                      {availablePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {getPlayerDisplayName(player)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  setThemePreference((current) => {
                    return current === 'dark' ? 'light' : 'dark';
                  });
                }}>
                Theme: {themePreference}
              </button>

              <button className="button button--ghost" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {isDrawerOpen ? (
        <button
          aria-hidden="true"
          className="drawer-backdrop"
          type="button"
          onClick={() => {
            setIsDrawerOpen(false);
          }}
        />
      ) : null}

      <div className="shell-main">
        <header className="mobile-topbar">
          <div className="stack-sm">
            <p className="eyebrow">Warners Bay Bulldogs</p>
            <h1 className="mobile-topbar__title">{activeClub?.name ?? 'Local club workspace'}</h1>
          </div>
        </header>

        <main className="page-shell">
          {isHydrated ? <Outlet /> : <PageSkeleton pathname={location.pathname} />}
        </main>
      </div>
    </div>
  );
}
