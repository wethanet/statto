import { getPlayerSortValue } from '@/lib/team';
import type { FitnessMetric, FitnessPhase, FitnessResult, Player } from '@/lib/types';

type FitnessMetricDefinition = {
  id: FitnessMetric;
  label: string;
  placeholder: string;
};

type FitnessPhaseDefinition = {
  id: FitnessPhase;
  label: string;
};

export const fitnessMetrics: FitnessMetricDefinition[] = [
  {
    id: 'time-trial-1.2km',
    label: '1.2km time trial',
    placeholder: 'e.g. 320.5',
  },
  {
    id: 'agility',
    label: 'Agility',
    placeholder: 'e.g. 8.7',
  },
  {
    id: 'speed',
    label: 'Speed',
    placeholder: 'e.g. 3.1',
  },
];

export const fitnessPhases: FitnessPhaseDefinition[] = [
  {
    id: 'start-of-season',
    label: 'Start of season',
  },
  {
    id: 'mid-season',
    label: 'Mid-season',
  },
  {
    id: 'end-of-season',
    label: 'End of season',
  },
];

type FitnessSummary = {
  completed: number;
  totalSlots: number;
};

export function getFitnessMetricLabel(metric: FitnessMetric) {
  return fitnessMetrics.find((definition) => definition.id === metric)?.label ?? metric;
}

export function getFitnessMetricPlaceholder(metric: FitnessMetric) {
  return fitnessMetrics.find((definition) => definition.id === metric)?.placeholder ?? 'Enter result';
}

export function getFitnessPhaseLabel(phase: FitnessPhase) {
  return fitnessPhases.find((definition) => definition.id === phase)?.label ?? phase;
}

export function getFitnessSummary(
  players: Player[],
  fitnessResults: FitnessResult[],
  phase: FitnessPhase
): FitnessSummary {
  const activePlayers = players.filter((player) => player.active);
  const completed = fitnessResults.filter((result) => result.phase === phase).length;

  return {
    completed,
    totalSlots: activePlayers.length * fitnessMetrics.length,
  };
}

export function getFitnessResultForPlayer(
  fitnessResults: FitnessResult[],
  playerId: string,
  metric: FitnessMetric,
  phase: FitnessPhase
) {
  return fitnessResults.find((result) => {
    return result.playerId === playerId && result.metric === metric && result.phase === phase;
  });
}

export function getFitnessResultsForSelection(
  players: Player[],
  fitnessResults: FitnessResult[],
  metric: FitnessMetric,
  phase: FitnessPhase
) {
  return [...fitnessResults]
    .filter((result) => {
      return result.metric === metric && result.phase === phase;
    })
    .map((result) => {
      const player = players.find((candidate) => candidate.id === result.playerId);

      return {
        ...result,
        player,
      };
    })
    .sort((left, right) => {
      if (!left.player && !right.player) {
        return 0;
      }

      if (!left.player) {
        return 1;
      }

      if (!right.player) {
        return -1;
      }

      return (
        Number(right.player.active) - Number(left.player.active) ||
        getPlayerSortValue(left.player.number) - getPlayerSortValue(right.player.number) ||
        left.player.name.localeCompare(right.player.name)
      );
    });
}

export function upsertFitnessResult(
  fitnessResults: FitnessResult[],
  input: {
    playerId: string;
    metric: FitnessMetric;
    phase: FitnessPhase;
    value: number;
  }
) {
  const nextResults = fitnessResults.filter((result) => {
    return !(
      result.playerId === input.playerId &&
      result.metric === input.metric &&
      result.phase === input.phase
    );
  });

  nextResults.push({
    ...input,
    recordedAt: new Date().toISOString(),
  });

  return nextResults;
}

export function deleteFitnessResult(
  fitnessResults: FitnessResult[],
  playerId: string,
  metric: FitnessMetric,
  phase: FitnessPhase
) {
  return fitnessResults.filter((result) => {
    return !(result.playerId === playerId && result.metric === metric && result.phase === phase);
  });
}

export function deleteFitnessResultsForPlayer(fitnessResults: FitnessResult[], playerId: string) {
  return fitnessResults.filter((result) => {
    return result.playerId !== playerId;
  });
}

export function formatFitnessValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
}
