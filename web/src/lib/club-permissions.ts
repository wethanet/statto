import type { Player, PlayerSquad } from '@/lib/types';

import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';

function overlapsSquad(left: PlayerSquad | null, right: PlayerSquad[]) {
  if (!left) {
    return true;
  }

  return right.includes(left);
}

export function useClubPermissions() {
  const { activeClub } = useClubAccess();
  const { players } = useClubData();
  const role = activeClub?.role ?? null;
  const allowedSquads = activeClub?.squads ?? [];
  const ownedPlayerId = activeClub?.playerId ?? null;
  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';
  const isPlayer = role === 'player';
  const ownedPlayer = ownedPlayerId
    ? players.find((player) => {
        return player.id === ownedPlayerId;
      }) ?? null
    : null;
  const playerSquads =
    isPlayer && ownedPlayer?.squad
      ? [ownedPlayer.squad]
      : allowedSquads;

  function canManagePlayer(player: Player) {
    if (isAdmin) {
      return true;
    }

    if (isCoach) {
      return overlapsSquad(player.squad, allowedSquads);
    }

    return false;
  }

  function canViewPlayer(player: Player) {
    if (isAdmin) {
      return true;
    }

    if (isCoach) {
      return overlapsSquad(player.squad, allowedSquads);
    }

    if (isPlayer) {
      return ownedPlayerId === player.id;
    }

    return false;
  }

  function canViewSquadItem(squad: PlayerSquad | null) {
    if (isAdmin) {
      return true;
    }

    if (isCoach) {
      return overlapsSquad(squad, allowedSquads);
    }

    if (isPlayer) {
      return overlapsSquad(squad, playerSquads);
    }

    return false;
  }

  return {
    role,
    allowedSquads,
    ownedPlayerId,
    isAdmin,
    isCoach,
    isPlayer,
    canAccessAdmin: isAdmin || isCoach,
    canAccessPlayerApp: isPlayer || isCoach || isAdmin,
    canManageClubMemberships: isAdmin,
    canManageRosterSetup: isAdmin,
    canManagePlayer,
    canViewPlayer,
    canViewSquadItem,
  };
}
