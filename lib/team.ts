import type {
  PlayerDevelopmentLevel,
  Player,
  PlayerPositionProfile,
  PlayerRole,
  PlayerRotationGroup,
  PlayerRunningProfile,
  PlayerSquad,
} from '@/lib/types';

const playerRoleOrder: PlayerRole[] = ['player', 'leader', 'vice-captain', 'captain'];
const validPlayerPositions: PlayerPositionProfile[] = ['B', 'HB', 'W', 'C', 'HF', 'F', 'Fol'];
const validRunningProfiles: PlayerRunningProfile[] = ['high', 'balanced', 'managed'];
const validRotationGroups: PlayerRotationGroup[] = [
  'inside-mids',
  'running-players',
  'key-position-players',
  'utility-players',
];
const validDevelopmentLevels: PlayerDevelopmentLevel[] = [
  'emerging',
  'developing',
  'reliable',
  'advanced',
];

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

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
    number?: number | null;
    squad?: PlayerSquad | null;
    primaryPosition?: PlayerPositionProfile | null;
    secondaryPosition?: PlayerPositionProfile | null;
    runningProfile?: PlayerRunningProfile | null;
    rotationGroupOverrides?: PlayerRotationGroup[] | null;
  }
) {
  const player: Player = {
    id: `player-${Date.now()}`,
    name: input.name.trim(),
    nickname: null,
    number: input.number ?? null,
    squad: input.squad ?? null,
    role: 'player',
    active: true,
    primaryPosition: input.primaryPosition ?? null,
    secondaryPosition: input.secondaryPosition ?? null,
    runningProfile: input.runningProfile ?? null,
    rotationGroupOverrides: input.rotationGroupOverrides ?? null,
    seasonGoals: null,
    skillSummary: null,
    developmentLevel: null,
  };

  return [...players, player];
}

export function updatePlayerDetails(
  players: Player[],
  playerId: string,
  input: {
    name?: string;
    nickname?: string | null;
    number?: number | null;
    squad?: PlayerSquad | null;
    primaryPosition?: PlayerPositionProfile | null;
    secondaryPosition?: PlayerPositionProfile | null;
    runningProfile?: PlayerRunningProfile | null;
    rotationGroupOverrides?: PlayerRotationGroup[] | null;
  }
) {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      name: input.name?.trim() || player.name,
      nickname: normalizeOptionalText(input.nickname) ?? null,
      number: input.number ?? null,
      squad: input.squad ?? null,
      primaryPosition: input.primaryPosition ?? null,
      secondaryPosition: input.secondaryPosition ?? null,
      runningProfile: input.runningProfile ?? null,
      rotationGroupOverrides: input.rotationGroupOverrides ?? null,
    };
  });
}

export function updatePlayerDevelopmentProfile(
  players: Player[],
  playerId: string,
  input: {
    seasonGoals?: string | null;
    skillSummary?: string | null;
    developmentLevel?: PlayerDevelopmentLevel | null;
  }
) {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      seasonGoals: normalizeOptionalText(input.seasonGoals) ?? null,
      skillSummary: normalizeOptionalText(input.skillSummary) ?? null,
      developmentLevel: input.developmentLevel ?? null,
    };
  });
}

export function updatePlayerRotationGroupOverrides(
  players: Player[],
  playerId: string,
  rotationGroupOverrides: PlayerRotationGroup[] | null
) {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      rotationGroupOverrides,
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

export function normalizePlayerSquads(value: unknown): PlayerSquad[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => {
          return typeof entry === 'string' ? normalizePlayerSquad(entry) : null;
        })
        .filter((entry): entry is PlayerSquad => entry !== null)
    )
  );
}

export function normalizePlayerPositionProfile(
  value: string | null | undefined
): PlayerPositionProfile | null {
  const normalizedValue = value?.trim().toLowerCase();

  switch (normalizedValue) {
    case 'b':
      return 'B';
    case 'hb':
      return 'HB';
    case 'w':
      return 'W';
    case 'c':
      return 'C';
    case 'hf':
      return 'HF';
    case 'f':
      return 'F';
    case 'fol':
    case 'follower':
      return 'Fol';
    default:
      return null;
  }
}

export function normalizePlayerRunningProfile(
  value: string | null | undefined
): PlayerRunningProfile | null {
  const normalizedValue = value?.trim().toLowerCase() as PlayerRunningProfile | undefined;

  if (normalizedValue && validRunningProfiles.includes(normalizedValue)) {
    return normalizedValue;
  }

  return null;
}

export function normalizePlayerRotationGroups(value: unknown): PlayerRotationGroup[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedValue = value
    .map((entry) => {
      return typeof entry === 'string' ? entry.trim().toLowerCase() : '';
    })
    .filter((entry): entry is PlayerRotationGroup => {
      return validRotationGroups.includes(entry as PlayerRotationGroup);
    });

  if (normalizedValue.length <= 0) {
    return null;
  }

  return Array.from(new Set(normalizedValue));
}

export function normalizePlayerDevelopmentLevel(
  value: string | null | undefined
): PlayerDevelopmentLevel | null {
  const normalizedValue = value?.trim().toLowerCase() as PlayerDevelopmentLevel | undefined;

  if (normalizedValue && validDevelopmentLevels.includes(normalizedValue)) {
    return normalizedValue;
  }

  return null;
}

export function normalizePlayers(
  players: Array<
    Omit<
      Player,
      | 'squad'
      | 'primaryPosition'
      | 'secondaryPosition'
      | 'runningProfile'
      | 'rotationGroupOverrides'
      | 'seasonGoals'
      | 'skillSummary'
      | 'developmentLevel'
      | 'nickname'
    > & {
      squad?: string | null;
      nickname?: string | null;
      primaryPosition?: string | null;
      secondaryPosition?: string | null;
      runningProfile?: string | null;
      rotationGroupOverrides?: unknown;
      rotation_group_overrides?: unknown;
      primary_position?: string | null;
      secondary_position?: string | null;
      running_profile?: string | null;
      seasonGoals?: string | null;
      skillSummary?: string | null;
      developmentLevel?: string | null;
      season_goals?: string | null;
      skill_summary?: string | null;
      development_level?: string | null;
    }
  >
): Player[] {
  return players.map((player) => {
    const { id, name, number, role, active, nickname } = player;

    return {
      id,
      name,
      nickname: normalizeOptionalText(nickname),
      number,
      squad: normalizePlayerSquad(player.squad),
      role,
      active,
      primaryPosition: normalizePlayerPositionProfile(player.primaryPosition ?? player.primary_position),
      secondaryPosition: normalizePlayerPositionProfile(player.secondaryPosition ?? player.secondary_position),
      runningProfile: normalizePlayerRunningProfile(player.runningProfile ?? player.running_profile),
      rotationGroupOverrides: normalizePlayerRotationGroups(
        player.rotationGroupOverrides ?? player.rotation_group_overrides
      ),
      seasonGoals: normalizeOptionalText(player.seasonGoals ?? player.season_goals),
      skillSummary: normalizeOptionalText(player.skillSummary ?? player.skill_summary),
      developmentLevel: normalizePlayerDevelopmentLevel(
        player.developmentLevel ?? player.development_level
      ),
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

export function getPlayerPositionLabel(position: PlayerPositionProfile | null) {
  if (!position) {
    return 'Unassigned';
  }

  if (position === 'Fol') {
    return 'Follower';
  }

  return position;
}

export function getPlayerRunningProfileLabel(profile: PlayerRunningProfile | null) {
  switch (profile) {
    case 'high':
      return 'High running';
    case 'managed':
      return 'Managed load';
    case 'balanced':
      return 'Balanced';
    default:
      return 'Unassigned';
  }
}

export function getPlayerRotationGroupLabel(group: PlayerRotationGroup) {
  switch (group) {
    case 'inside-mids':
      return 'Inside mids';
    case 'running-players':
      return 'Running players';
    case 'key-position-players':
      return 'Key-position players';
    case 'utility-players':
      return 'Utility players';
  }
}

export function getPlayerDevelopmentLevelLabel(level: PlayerDevelopmentLevel | null) {
  switch (level) {
    case 'emerging':
      return 'Emerging';
    case 'developing':
      return 'Developing';
    case 'reliable':
      return 'Reliable';
    case 'advanced':
      return 'Advanced';
    default:
      return 'Unassigned';
  }
}
