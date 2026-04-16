import type { PropsWithChildren, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { useClubPermissions } from '@web/lib/club-permissions';

type AdminPageShellProps = PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
}>;

const adminNavItems = [
  { label: 'Overview', to: '/admin' },
  { label: 'Team', to: '/admin/team' },
  { label: 'Setup', to: '/admin/team-setup', requires: 'admin' as const },
  { label: 'Rotations', to: '/admin/rotation-groups' },
  { label: 'Development', to: '/admin/development' },
  { label: 'Training', to: '/admin/training' },
  { label: 'Matches', to: '/admin/matches' },
  { label: 'Fines', to: '/admin/fines' },
  { label: 'Fitness', to: '/admin/fitness' },
  { label: 'Votes', to: '/admin/votes' },
  { label: 'Settings', to: '/admin/settings', requires: 'admin' as const },
  { label: 'Club', to: '/admin/club', requires: 'admin' as const },
] as const;

export function AdminPageShell({ actions, children, description, title }: AdminPageShellProps) {
  const { canManageClubMemberships, canManageRosterSetup } = useClubPermissions();
  const navItems = adminNavItems.filter((item) => {
    if (item.to === '/admin/club') {
      return canManageClubMemberships;
    }

    if (item.to === '/admin/team-setup' || item.to === '/admin/settings') {
      return canManageRosterSetup;
    }

    return true;
  });

  return (
    <section className="page-grid admin-page">
      <section className="admin-page__hero">
        <div className="admin-page__top">
          <div className="admin-page__copy">
            <span className="eyebrow">Admin</span>
            <h2>{title}</h2>
            <p className="muted">{description}</p>
          </div>
          {actions ? <div className="admin-page__actions">{actions}</div> : null}
        </div>

        <nav aria-label="Admin sections" className="admin-page__nav">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => {
                return isActive ? 'admin-page__nav-link admin-page__nav-link--active' : 'admin-page__nav-link';
              }}
              end={item.to === '/admin'}
              key={item.to}
              to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </section>

      {children}
    </section>
  );
}
