import type { PropsWithChildren, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useClubPermissions } from '@web/lib/club-permissions';

type AdminPageShellProps = PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
}>;

type AdminNavItem = {
  label: string;
  to: string;
  end?: boolean;
  matchPaths?: string[];
  requires?: 'club-admin' | 'roster-admin';
};

type AdminNavGroup = {
  label: string;
  description: string;
  items: AdminNavItem[];
};

const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Club',
    description: 'Workspace, access, settings',
    items: [
      { label: 'Overview', to: '/admin', end: true },
      { label: 'Club access', to: '/admin/club', requires: 'club-admin' },
      { label: 'Policy settings', to: '/admin/settings', requires: 'roster-admin' },
    ],
  },
  {
    label: 'People',
    description: 'Roster, roles, development',
    items: [
      { label: 'Team list', to: '/admin/team' },
      { label: 'Add/import', to: '/admin/team-setup', requires: 'roster-admin' },
      { label: 'Rotation groups', to: '/admin/rotation-groups' },
      { label: 'Development', to: '/admin/development' },
    ],
  },
  {
    label: 'Training',
    description: 'Sessions, plans, attendance',
    items: [
      { label: 'Sessions', to: '/admin/training', end: true },
      { label: 'Add session', to: '/admin/training/new' },
      { label: 'Library', to: '/admin/training/library' },
      { label: 'Settings', to: '/admin/training/settings' },
    ],
  },
  {
    label: 'Matches',
    description: 'Fixtures, selection, votes',
    items: [
      { label: 'Fixtures', to: '/admin/matches' },
      { label: 'Votes', to: '/admin/votes' },
    ],
  },
  {
    label: 'Operations',
    description: 'Finance and performance',
    items: [
      { label: 'Fines', to: '/admin/fines' },
      { label: 'Fitness', to: '/admin/fitness' },
    ],
  },
] as const;

function matchesAdminNavItem(pathname: string, item: AdminNavItem) {
  if (item.end) {
    return pathname === item.to || item.matchPaths?.some((path) => pathname.startsWith(path)) === true;
  }

  return (
    pathname === item.to ||
    pathname.startsWith(`${item.to}/`) ||
    item.matchPaths?.some((path) => pathname.startsWith(path)) === true
  );
}

export function AdminPageShell({ actions, children, description, title }: AdminPageShellProps) {
  const { canManageClubMemberships, canManageRosterSetup } = useClubPermissions();
  const location = useLocation();
  const navGroups = adminNavGroups
    .map((group) => {
      return {
        ...group,
        items: group.items.filter((item) => {
          if (item.requires === 'club-admin') {
            return canManageClubMemberships;
          }

          if (item.requires === 'roster-admin') {
            return canManageRosterSetup;
          }

          return true;
        }),
      };
    })
    .filter((group) => {
      return group.items.length > 0;
    });
  const activeGroup =
    navGroups.find((group) => {
      return group.items.some((item) => {
        return matchesAdminNavItem(location.pathname, item);
      });
    }) ?? navGroups[0];
  const activeItem =
    [...(activeGroup?.items ?? [])]
      .sort((left, right) => right.to.length - left.to.length)
      .find((item) => {
        return matchesAdminNavItem(location.pathname, item);
      }) ?? activeGroup?.items[0];

  return (
    <section className="page-grid admin-page">
      <section className="admin-page__hero">
        <div className="admin-page__top">
          <div className="admin-page__copy">
            <div className="admin-breadcrumbs" aria-label="Admin breadcrumb">
              <Link to="/admin">Admin</Link>
              {activeGroup ? <span>{activeGroup.label}</span> : null}
              {activeItem ? <span>{activeItem.label}</span> : null}
            </div>
            <h2>{title}</h2>
            <p className="muted">{description}</p>
          </div>
          {actions ? <div className="admin-page__actions">{actions}</div> : null}
        </div>

        <div className="admin-ia">
          <nav aria-label="Admin areas" className="admin-ia__groups">
            {navGroups.map((group) => {
              const groupIsActive = group.label === activeGroup?.label;
              const firstItem = group.items[0];

              return (
                <Link
                  className={groupIsActive ? 'admin-ia__group admin-ia__group--active' : 'admin-ia__group'}
                  key={group.label}
                  to={firstItem.to}>
                  <span>{group.label}</span>
                  <small>{group.description}</small>
                </Link>
              );
            })}
          </nav>

          {activeGroup ? (
            <nav aria-label={`${activeGroup.label} sections`} className="admin-ia__sections">
              {activeGroup.items.map((item) => (
                <NavLink
                  className={({ isActive }) => {
                    return isActive ? 'admin-ia__section admin-ia__section--active' : 'admin-ia__section';
                  }}
                  end={item.end}
                  key={item.to}
                  to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {children}
    </section>
  );
}
