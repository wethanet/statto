import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { buildRotationPlan } from '@/lib/rotation-groups';
import { getPlayerSquadLabel } from '@/lib/team';
import type { PlayerSquad } from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { AdminRecordList, AdminSection, AdminSummaryStrip } from '@web/components/admin/admin-workflow';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { useClubPolicy } from '@web/lib/club-policy-context';

export function RotationGroupsAdminRoute() {
  const { isHydrated, players } = useClubData();
  const { canManagePlayer } = useClubPermissions();
  const { policySettings } = useClubPolicy();
  const [squadFilter, setSquadFilter] = useState<'all' | PlayerSquad | 'unassigned'>('all');
  const manageablePlayers = useMemo(() => {
    return players.filter((player) => canManagePlayer(player));
  }, [canManagePlayer, players]);
  const filteredPlayers = useMemo(() => {
    return manageablePlayers.filter((player) => {
      if (squadFilter === 'all') {
        return true;
      }

      if (squadFilter === 'unassigned') {
        return player.squad == null;
      }

      return player.squad === squadFilter;
    });
  }, [manageablePlayers, squadFilter]);
  const rotationPlan = useMemo(() => buildRotationPlan(filteredPlayers), [filteredPlayers]);
  const activePlayerCount = filteredPlayers.filter((player) => player.active).length;

  if (!policySettings.rotationGroupsEnabled) {
    return <Navigate replace to="/admin/settings" />;
  }

  return (
    <AdminPageShell
      description="Review the generated rotation plan, then jump back to team management to tweak player attributes or set manual overrides."
      title="Rotation groups">
      <AdminSection
        eyebrow="Context"
        title="Generated player groups"
        description={isHydrated ? 'Rotation settings are saved with player records.' : 'Loading player settings...'}
        actions={
          <Link className="text-link" to="/admin/team">
            Back to team management
          </Link>
        }>
        <AdminSummaryStrip
          items={[
            { label: 'Active players', value: String(activePlayerCount), note: 'current filter' },
            { label: 'Visible players', value: String(filteredPlayers.length), note: 'including inactive' },
          ]}
        />
      </AdminSection>

      <AdminSection
        eyebrow="Records"
        title="Rotation plan"
        description="Filter by squad, then check which players are generated or manually assigned to each support group.">
        <AdminRecordList
          title="Rotation group records"
          description="Manual overrides are changed from each player row in team management."
          actions={
            <label className="field field--inline">
              <span>Squad filter</span>
              <select
                className="input"
                onChange={(event) => setSquadFilter(event.target.value as typeof squadFilter)}
                value={squadFilter}>
                <option value="all">All squads</option>
                <option value="cup">{getPlayerSquadLabel('cup')}</option>
                <option value="plate">{getPlayerSquadLabel('plate')}</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
          }>
        <div className="rotation-groups-grid">
          {rotationPlan.summaries.map((summaryCard) => (
            <section className="rotation-group-card" key={summaryCard.group}>
              <div className="stack-sm">
                <div className="split-row">
                  <h3>{summaryCard.label}</h3>
                  <span className="metric metric--neutral">{summaryCard.players.length}</span>
                </div>
                <p className="muted">{summaryCard.description}</p>
              </div>
              {summaryCard.players.length > 0 ? (
                <div className="rotation-group-card__list">
                  {summaryCard.players.map(({ player, source }) => (
                    <div className="rotation-group-card__item" key={`${summaryCard.group}-${player.id}`}>
                      <span>
                        {player.number != null ? `#${player.number} ` : ''}
                        {player.name}
                      </span>
                      <span className="muted">{source === 'manual' ? 'Manual' : 'Generated'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No active players in this group for the current filter.</p>
              )}
            </section>
          ))}
        </div>
        </AdminRecordList>
      </AdminSection>
    </AdminPageShell>
  );
}
