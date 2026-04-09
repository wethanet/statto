import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useSettings } from '@web/lib/settings-context';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/training', label: 'Training' },
  { to: '/matches', label: 'Matches' },
  { to: '/admin', label: 'Admin' },
];

export function ShellLayout() {
  const { activeClub } = useClubAccess();
  const { signOut } = useAuth();
  const { storageMode } = useClubData();
  const { setThemePreference, themePreference } = useSettings();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
              <p className="muted">
                {storageMode === 'cloud'
                  ? 'Supabase sync is active for this club.'
                  : 'Running in local mode until Supabase club access is configured.'}
              </p>
            </div>
          </div>

          <nav className="drawer-nav" id="primary-navigation" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
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
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="shell-drawer__actions">
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
