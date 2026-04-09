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
  const { resolvedColorScheme, setThemePreference, themePreference } = useSettings();

  async function handleSignOut() {
    const message = await signOut();

    if (message) {
      window.alert(message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <img alt="Warners Bay Bulldogs logo" className="topbar__logo" src={bulldogsLogo} />
            <div>
              <p className="eyebrow">Warners Bay Bulldogs</p>
              <h1 className="topbar__title">{activeClub?.name ?? 'Local club workspace'}</h1>
              <p className="muted">
                {storageMode === 'cloud'
                  ? 'Supabase sync is active for this club.'
                  : 'Running in local mode until Supabase club access is configured.'}
              </p>
            </div>
          </div>

          <div className="topbar__actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setThemePreference((current) => {
                  if (current === 'system') {
                    return resolvedColorScheme === 'dark' ? 'light' : 'dark';
                  }

                  return current === 'dark' ? 'light' : 'dark';
                });
              }}>
              Theme: {themePreference === 'system' ? `System (${resolvedColorScheme})` : themePreference}
            </button>

            <button className="button button--ghost" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        <nav className="tab-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) => {
                  return isActive ? 'tab-link tab-link--active' : 'tab-link';
                }}
                end={item.end}
                to={item.to}>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
