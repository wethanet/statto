import type { TrainingSession, TrainingSessionDrill } from '@/lib/types';

type TrainingSessionStructure = {
  focus: string;
  isSuggested: boolean;
  runPlan: TrainingSessionDrill[];
};

export function resolveTrainingSessionStructure(
  session: TrainingSession,
  _sessions: TrainingSession[]
): TrainingSessionStructure {
  return {
    focus: session.focus ?? 'No session focus has been added yet.',
    isSuggested: false,
    runPlan: session.runPlan,
  };
}
