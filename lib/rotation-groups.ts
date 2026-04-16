import { getPlayerSortValue } from '@/lib/team';
import type {
  AvailabilityStatus,
  MatchLinePosition,
  Player,
  PlayerPositionProfile,
  PlayerRotationGroup,
  PlayerRunningProfile,
} from '@/lib/types';

type RotationGroupDefinition = {
  group: PlayerRotationGroup;
  label: string;
  description: string;
  minimumPlayers: number;
};

type RotationAssignment = {
  groups: PlayerRotationGroup[];
  source: 'generated' | 'manual';
};

export type RotationGroupSummary = RotationGroupDefinition & {
  players: Array<{
    player: Player;
    source: 'generated' | 'manual';
  }>;
};

export type RotationPlan = {
  assignments: Record<string, RotationAssignment>;
  summaries: RotationGroupSummary[];
};

export type MatchRotationPlan = {
  assignments: Record<
    string,
    {
      group: PlayerRotationGroup;
      source: 'generated' | 'manual';
      candidates: PlayerRotationGroup[];
    }
  >;
};

type MatchRotationPlayer = Player & {
  matchPosition: MatchLinePosition | null;
  availabilityStatus?: AvailabilityStatus;
};

const rotationGroupDefinitions: RotationGroupDefinition[] = [
  {
    group: 'inside-mids',
    label: 'Inside mids',
    description: 'High-rotation contest players around the ball.',
    minimumPlayers: 4,
  },
  {
    group: 'running-players',
    label: 'Running players',
    description: 'Wings and link players who cover the ground.',
    minimumPlayers: 6,
  },
  {
    group: 'key-position-players',
    label: 'Key-position players',
    description: 'Lower-rotation spine players at either end.',
    minimumPlayers: 4,
  },
  {
    group: 'utility-players',
    label: 'Utility players',
    description: 'Flexible support options who can patch multiple lines.',
    minimumPlayers: 0,
  },
];

const groupOrder = rotationGroupDefinitions.map((definition) => definition.group);

function getPositionGroup(position: PlayerPositionProfile | null) {
  if (position === 'C' || position === 'Fol') {
    return 'inside-mids' satisfies PlayerRotationGroup;
  }

  if (position === 'W' || position === 'HB' || position === 'HF') {
    return 'running-players' satisfies PlayerRotationGroup;
  }

  if (position === 'B' || position === 'F') {
    return 'key-position-players' satisfies PlayerRotationGroup;
  }

  return null;
}

function getMatchPositionGroup(position: MatchLinePosition | null) {
  if (position === 'Int') {
    return null;
  }

  return getPositionGroup(position);
}

function getSupportPriority(profile: PlayerRunningProfile | null, group: PlayerRotationGroup) {
  if (group === 'running-players') {
    if (profile === 'high') {
      return 3;
    }

    if (profile === 'balanced') {
      return 2;
    }

    return 1;
  }

  if (group === 'inside-mids') {
    if (profile === 'balanced') {
      return 3;
    }

    if (profile === 'high') {
      return 2;
    }

    return 1;
  }

  if (group === 'key-position-players') {
    if (profile === 'managed') {
      return 3;
    }

    if (profile === 'balanced') {
      return 2;
    }

    return 1;
  }

  return 1;
}

function sortPlayers(players: Player[]) {
  return [...players].sort((left, right) => {
    return (
      Number(right.active) - Number(left.active) ||
      getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
      left.name.localeCompare(right.name)
    );
  });
}

export function buildRotationPlan(players: Player[]): RotationPlan {
  const sortedPlayers = sortPlayers(players);
  const activePlayers = sortedPlayers.filter((player) => player.active);
  const assignments = new Map<string, RotationAssignment>();
  const supportCandidates = new Map<PlayerRotationGroup, Player[]>(
    groupOrder.map((group) => [group, [] as Player[]])
  );

  sortedPlayers.forEach((player) => {
    if (player.rotationGroupOverrides) {
      assignments.set(player.id, {
        groups: player.rotationGroupOverrides,
        source: 'manual',
      });
      return;
    }

    const groups = new Set<PlayerRotationGroup>();
    const primaryGroup = getPositionGroup(player.primaryPosition);
    const secondaryGroup = getPositionGroup(player.secondaryPosition);

    if (primaryGroup) {
      groups.add(primaryGroup);
    } else if (secondaryGroup) {
      groups.add(secondaryGroup);
    }

    if (!primaryGroup) {
      groups.add('utility-players');
    }

    if (secondaryGroup && secondaryGroup !== primaryGroup) {
      groups.add('utility-players');
      supportCandidates.get(secondaryGroup)?.push(player);
    }

    assignments.set(player.id, {
      groups: Array.from(groups),
      source: 'generated',
    });
  });

  rotationGroupDefinitions
    .filter((definition) => definition.group !== 'utility-players')
    .forEach((definition) => {
      const currentCount = activePlayers.filter((player) => {
        return assignments.get(player.id)?.groups.includes(definition.group);
      }).length;

      if (currentCount >= definition.minimumPlayers) {
        return;
      }

      const candidates = sortPlayers(supportCandidates.get(definition.group) ?? []).sort((left, right) => {
        return (
          getSupportPriority(right.runningProfile, definition.group) -
            getSupportPriority(left.runningProfile, definition.group) ||
          getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
          left.name.localeCompare(right.name)
        );
      });

      let nextCount = currentCount;

      candidates.forEach((player) => {
        if (nextCount >= definition.minimumPlayers) {
          return;
        }

        const assignment = assignments.get(player.id);

        if (!assignment || assignment.groups.includes(definition.group)) {
          return;
        }

        assignment.groups = [...assignment.groups, definition.group];
        nextCount += 1;
      });
    });

  const assignmentRecord = Object.fromEntries(assignments.entries());
  const summaries = rotationGroupDefinitions.map((definition) => {
    const groupedPlayers = activePlayers
      .filter((player) => {
        return assignmentRecord[player.id]?.groups.includes(definition.group);
      })
      .map((player) => {
        return {
          player,
          source: assignmentRecord[player.id]?.source ?? 'generated',
        };
      });

    return {
      ...definition,
      players: groupedPlayers,
    };
  });

  return {
    assignments: assignmentRecord,
    summaries,
  };
}

function getMatchRotationCandidates(
  player: MatchRotationPlayer,
  profileAssignments: RotationPlan['assignments']
): PlayerRotationGroup[] {
  const profileGroups = profileAssignments[player.id]?.groups ?? [];

  if (profileGroups.length > 0) {
    return profileGroups;
  }

  const matchPositionGroup = getMatchPositionGroup(player.matchPosition);

  if (matchPositionGroup) {
    return [matchPositionGroup];
  }

  return ['utility-players'];
}

function getGroupScarcity(
  group: PlayerRotationGroup,
  players: Array<{
    candidates: PlayerRotationGroup[];
  }>
) {
  return players.filter((player) => {
    return player.candidates.includes(group);
  }).length;
}

export function buildMatchRotationPlan(
  players: MatchRotationPlayer[],
  profileAssignments: RotationPlan['assignments']
): MatchRotationPlan {
  const selectedPlayers = [...players]
    .filter((player) => {
      return player.active && (player.availabilityStatus ?? 'available') === 'available';
    })
    .sort((left, right) => {
      return (
        Number(right.active) - Number(left.active) ||
        getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
        left.name.localeCompare(right.name)
      );
    });
  const counts = new Map<PlayerRotationGroup, number>(groupOrder.map((group) => [group, 0]));
  const assignments: MatchRotationPlan['assignments'] = {};
  const generatedPlayers = selectedPlayers
    .map((player) => {
      const candidates = getMatchRotationCandidates(player, profileAssignments);
      const profileSource = profileAssignments[player.id]?.source ?? 'generated';

      return {
        player,
        candidates,
        source: profileSource,
      };
    })
    .filter((entry): entry is {
      player: MatchRotationPlayer;
      candidates: PlayerRotationGroup[];
      source: 'generated' | 'manual';
    } => {
      return entry !== null;
    })
    .sort((left, right) => {
      return (
        left.candidates.length - right.candidates.length ||
        getPlayerSortValue(left.player.number) - getPlayerSortValue(right.player.number) ||
        left.player.name.localeCompare(right.player.name)
      );
    });

  generatedPlayers.forEach((entry, index) => {
    const remainingEntries = generatedPlayers.slice(index);
    const positionGroup = getMatchPositionGroup(entry.player.matchPosition);

    const selectedGroup =
      [...entry.candidates].sort((left, right) => {
        const leftCount = counts.get(left) ?? 0;
        const rightCount = counts.get(right) ?? 0;
        const leftNeedScore = leftCount === 0 ? 1000 - getGroupScarcity(left, remainingEntries) * 10 : 0;
        const rightNeedScore = rightCount === 0 ? 1000 - getGroupScarcity(right, remainingEntries) * 10 : 0;
        const leftPositionScore = positionGroup === left ? 100 : 0;
        const rightPositionScore = positionGroup === right ? 100 : 0;
        const leftBalanceScore = -leftCount * 10;
        const rightBalanceScore = -rightCount * 10;
        const leftProfileScore = 10 - entry.candidates.indexOf(left);
        const rightProfileScore = 10 - entry.candidates.indexOf(right);

        return (
          rightNeedScore -
            leftNeedScore ||
          rightPositionScore -
            leftPositionScore ||
          rightBalanceScore -
            leftBalanceScore ||
          rightProfileScore - leftProfileScore
        );
      })[0] ?? 'utility-players';

    assignments[entry.player.id] = {
      group: selectedGroup,
      source: entry.source,
      candidates: entry.candidates,
    };
    counts.set(selectedGroup, (counts.get(selectedGroup) ?? 0) + 1);
  });

  return {
    assignments,
  };
}
