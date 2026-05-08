import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildGamesPlayedByGrade, getPlayerGamesPlayedSummary } from '@/lib/games-played';
import {
  getPlayerSquadLabel,
  normalizePlayerPositionProfile,
  normalizePlayerRunningProfile,
  normalizePlayerSquad,
} from '@/lib/team';
import type { PlayerRotationGroup, PlayerSquad } from '@/lib/types';

import { deleteAttendanceRecordsForPlayer } from '@/lib/attendance';
import { deleteAvailabilityRecordsForPlayer } from '@/lib/availability';
import { deleteFinesForPlayer } from '@/lib/fines';
import { deleteFitnessResultsForPlayer } from '@/lib/fitness';
import { deletePlayerDevelopmentEntriesForPlayer } from '@/lib/player-development';
import {
  cyclePlayerRole,
  deletePlayer,
  getSortedTeam,
  getTeamSummary,
  togglePlayerActive,
  updatePlayerDetails,
} from '@/lib/team';
import { deletePlayerVoteBallotsForPlayer, deleteVoteEntriesForPlayer } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { TeamPlayerRow } from '@web/components/team/team-player-row';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import { upsertCloudPlayer } from '@web/lib/storage/cloud-core-data-storage';

export function TeamAdminRoute() {
  const { activeClubId } = useClubAccess();
  const { policySettings } = useClubPolicy();
  const { canManagePlayer } = useClubPermissions();
  const {
    fixtures,
    isHydrated,
    matchLineupAssignments,
    players,
    setAttendanceRecords,
    setAvailabilityRecords,
    setFitnessResults,
    setFines,
    setPlayers,
    setPlayerDevelopmentEntries,
    setPlayerVoteBallots,
    setVoteEntries,
  } = useClubData();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [squadFilter, setSquadFilter] = useState<'all' | PlayerSquad | 'unassigned'>('all');
  const manageablePlayers = players.filter((player) => canManagePlayer(player));
  const summary = getTeamSummary(manageablePlayers);
  const roster = getSortedTeam(manageablePlayers);
  const gamesPlayedByPlayer = useMemo(() => {
    return buildGamesPlayedByGrade(fixtures, matchLineupAssignments, policySettings);
  }, [fixtures, matchLineupAssignments, policySettings]);
  const filteredRoster = roster.filter((player) => {
    if (squadFilter === 'all') {
      return true;
    }

    if (squadFilter === 'unassigned') {
      return player.squad == null;
    }

    return player.squad === squadFilter;
  });

  function handleDeletePlayer(playerId: string, playerName: string) {
    setPlayers((current) => {
      return deletePlayer(current, playerId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForPlayer(current, playerId);
    });
    setAvailabilityRecords((current) => {
      return deleteAvailabilityRecordsForPlayer(current, playerId);
    });
    setFitnessResults((current) => {
      return deleteFitnessResultsForPlayer(current, playerId);
    });
    setPlayerDevelopmentEntries((current) => {
      return deletePlayerDevelopmentEntriesForPlayer(current, playerId);
    });
    setFines((current) => {
      return deleteFinesForPlayer(current, playerId);
    });
    setVoteEntries((current) => {
      return deleteVoteEntriesForPlayer(current, playerId);
    });
    setPlayerVoteBallots((current) => {
      return deletePlayerVoteBallotsForPlayer(current, playerId);
    });
    setImportMessage(`${playerName} was removed from the roster.`);
  }

  async function handleSavePlayerDetails(
    playerId: string,
    playerName: string,
    input: {
      name: string;
      nickname: string;
      number: string;
      squad: string;
      primaryPosition: string;
      secondaryPosition: string;
      runningProfile: string;
      rotationGroupOverrides: PlayerRotationGroup[] | null;
    }
  ) {
    const normalizedName = input.name.trim();
    const normalizedNickname = input.nickname.trim();
    const normalizedNumberInput = input.number.trim();
    const normalizedNumber = normalizedNumberInput ? Number(normalizedNumberInput) : null;
    const normalizedSquad = normalizePlayerSquad(input.squad);
    const normalizedPrimaryPosition = normalizePlayerPositionProfile(input.primaryPosition);
    const normalizedSecondaryPosition = normalizePlayerPositionProfile(input.secondaryPosition);
    const normalizedRunningProfile = normalizePlayerRunningProfile(input.runningProfile);

    if (!normalizedName) {
      return 'Enter a player name.';
    }

    if (
      normalizedNumberInput &&
      (!Number.isInteger(normalizedNumber) || normalizedNumber == null || normalizedNumber <= 0)
    ) {
      return 'Enter a valid guernsey number greater than zero.';
    }

    const duplicateNumber =
      normalizedNumber != null &&
      players.some((player) => {
        return player.id !== playerId && player.number === normalizedNumber;
      });

    if (duplicateNumber) {
      return `Player number ${normalizedNumber} is already in use.`;
    }

    if (
      normalizedPrimaryPosition &&
      normalizedSecondaryPosition &&
      normalizedPrimaryPosition === normalizedSecondaryPosition
    ) {
      return 'Choose a different secondary position or leave it unassigned.';
    }

    if (input.rotationGroupOverrides && input.rotationGroupOverrides.length <= 0) {
      return 'Select at least one manual rotation group or switch back to generated groups.';
    }

    const currentPlayer = players.find((player) => player.id === playerId);

    if (!currentPlayer) {
      return 'Player record could not be found.';
    }

    const nextPlayer = {
      ...currentPlayer,
      name: normalizedName,
      nickname: normalizedNickname || null,
      number: normalizedNumber,
      squad: normalizedSquad,
      primaryPosition: normalizedPrimaryPosition,
      secondaryPosition: normalizedSecondaryPosition,
      runningProfile: normalizedRunningProfile,
      rotationGroupOverrides: input.rotationGroupOverrides,
    };

    setPlayers((current) => {
      return updatePlayerDetails(current, playerId, {
        name: normalizedName,
        nickname: normalizedNickname || null,
        number: normalizedNumber,
        squad: normalizedSquad,
        primaryPosition: normalizedPrimaryPosition,
        secondaryPosition: normalizedSecondaryPosition,
        runningProfile: normalizedRunningProfile,
        rotationGroupOverrides: input.rotationGroupOverrides,
      });
    });

    if (activeClubId) {
      try {
        await upsertCloudPlayer(activeClubId, nextPlayer);
      } catch (error: unknown) {
        return error instanceof Error
          ? `Failed to save ${playerName} to cloud storage: ${error.message}`
          : `Failed to save ${playerName} to cloud storage.`;
      }
    }

    setImportMessage(`${playerName} details updated.`);

    return null;
  }

  return (
    <AdminPageShell
      description="Keep the playing list current, adjust leadership roles, and shape the squad cleanly."
      title="Team management">
      <section className="card stack">
        <h3>Roster summary</h3>
        <div className="metric-row">
          <span className="metric metric--neutral">{summary.total} total</span>
          <span className="metric metric--positive">{summary.active} active</span>
          <span className="metric metric--negative">{summary.inactive} inactive</span>
          <span className="metric metric--neutral">{summary.leaders} leaders</span>
          <span className="metric metric--positive">{summary.cup} cup</span>
          <span className="metric metric--negative">{summary.plate} plate</span>
          <span className="metric metric--neutral">{summary.unassigned} unassigned</span>
        </div>
        <p className="muted">
          {isHydrated
            ? 'Roster changes are saved in the browser app. Games played count past fixture lineups only.'
            : 'Loading saved roster...'}
        </p>
        <div className="inline-actions">
          <label className="field field--inline">
            <span>Squad filter</span>
            <select className="input" onChange={(event) => setSquadFilter(event.target.value as typeof squadFilter)} value={squadFilter}>
              <option value="all">All squads</option>
              <option value="cup">{getPlayerSquadLabel('cup')}</option>
              <option value="plate">{getPlayerSquadLabel('plate')}</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <Link className="text-link" to="/admin/rotation-groups">
            Open rotation groups
          </Link>
          <Link className="text-link" to="/admin/team-setup">
            Add or import players
          </Link>
        </div>
      </section>

      <section className="card team-player-table">
        <div className="team-player-table__header" aria-hidden="true">
          <span>Player</span>
          <span>Role</span>
          <span>Games</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filteredRoster.length > 0 ? (
          filteredRoster.map((player) => {
            return (
              <TeamPlayerRow
                key={player.id}
                onCycleRole={() => {
                  setPlayers((current) => cyclePlayerRole(current, player.id));
                }}
                onDelete={() => {
                  handleDeletePlayer(player.id, player.name);
                }}
                onSaveDetails={(input) => {
                  return handleSavePlayerDetails(player.id, player.name, input);
                }}
                onToggleActive={() => {
                  setPlayers((current) => togglePlayerActive(current, player.id));
                }}
                player={player}
                gamesPlayed={getPlayerGamesPlayedSummary(gamesPlayedByPlayer, player.id)}
              />
            );
          })
        ) : (
          <p className="muted">No players match this filter.</p>
        )}
      </section>
    </AdminPageShell>
  );
}
