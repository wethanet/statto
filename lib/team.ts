import type { Player, PlayerRole, PlayerSquad } from '@/lib/types';

const playerRoleOrder: PlayerRole[] = ['player', 'leader', 'vice-captain', 'captain'];

type TeamSummary = {
  total: number;
  active: number;
  inactive: number;
  leaders: number;
  cup: number;
  plate: number;
  unassigned: number;
};

export function getTeamSummary(players: Player[]): TeamSummary {
  return players.reduce<TeamSummary>(
    (summary, player) => {
      summary.total += 1;

      if (player.active) {
        summary.active += 1;
      } else {
        summary.inactive += 1;
      }

      if (player.role !== 'player') {
        summary.leaders += 1;
      }

      if (player.squad === 'cup') {
        summary.cup += 1;
      } else if (player.squad === 'plate') {
        summary.plate += 1;
      } else {
        summary.unassigned += 1;
      }

      return summary;
    },
    { total: 0, active: 0, inactive: 0, leaders: 0, cup: 0, plate: 0, unassigned: 0 }
  );
}

export function getSortedTeam(players: Player[]) {
  return [...players].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (left.role !== right.role) {
      return playerRoleOrder.indexOf(right.role) - playerRoleOrder.indexOf(left.role);
    }

    return getPlayerSortValue(left.number) - getPlayerSortValue(right.number);
  });
}

export function togglePlayerActive(players: Player[], playerId: string) {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      active: !player.active,
    };
  });
}

export function deletePlayer(players: Player[], playerId: string) {
  return players.filter((player) => {
    return player.id !== playerId;
  });
}

export function addPlayer(
  players: Player[],
  input: {
    name: string;
    nickname?: string | null;
    number?: number | null;
    squad?: PlayerSquad | null;
  }
) {
  const player: Player = {
    id: `player-${Date.now()}`,
    name: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    number: input.number ?? null,
    squad: input.squad ?? null,
    role: 'player',
    active: true,
  };

  return [...players, player];
}

export function updatePlayerDetails(
  players: Player[],
  playerId: string,
  input: {
    nickname?: string | null;
    number?: number | null;
    squad?: PlayerSquad | null;
  }
) {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      nickname: input.nickname?.trim() || null,
      number: input.number ?? null,
      squad: input.squad ?? null,
    };
  });
}

export function cyclePlayerRole(players: Player[], playerId: string) {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    const currentIndex = playerRoleOrder.indexOf(player.role);
    const nextRole = playerRoleOrder[(currentIndex + 1) % playerRoleOrder.length] ?? 'player';

    return {
      ...player,
      role: nextRole,
    };
  });
}

export function getPlayerRoleLabel(role: PlayerRole) {
  switch (role) {
    case 'captain':
      return 'Captain';
    case 'vice-captain':
      return 'Vice-captain';
    case 'leader':
      return 'Leader';
    default:
      return 'Player';
  }
}

export function getPlayerDisplayName(player: Pick<Player, 'name' | 'number'>) {
  if (player.number == null) {
    return player.name;
  }

  return `#${player.number} ${player.name}`;
}

export function getPlayerSortValue(number: Player['number']) {
  return number ?? Number.MAX_SAFE_INTEGER;
}

export function normalizePlayerSquad(value: string | null | undefined): PlayerSquad | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'cup' || normalizedValue === 'plate') {
    return normalizedValue;
  }

  return null;
}

export function normalizePlayers(
  players: Array<Omit<Player, 'squad' | 'nickname'> & { squad?: string | null; nickname?: string | null }>
): Player[] {
  return players.map((player) => {
    const { id, name, number, role, active } = player;

    return {
      id,
      name,
      nickname: player.nickname?.trim() || null,
      number,
      squad: normalizePlayerSquad(player.squad),
      role,
      active,
    };
  });
}

export function getPlayerSquadLabel(squad: PlayerSquad | null) {
  if (squad === 'cup') {
    return 'Cup';
  }

  if (squad === 'plate') {
    return 'Plate';
  }

  return 'Unassigned';
}
