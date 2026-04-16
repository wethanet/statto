import type { Player, PlayerDevelopmentEntry, PlayerDevelopmentTask } from '@/lib/types';

import { supabase } from '@web/lib/supabase';

export type PlayerDevelopmentCoachMessage = {
  content: string;
  role: 'assistant' | 'coach';
};

export type PlayerDevelopmentCoachDraft = {
  seasonGoals: string;
  weeklyFocus: {
    coachingNote: string;
    tasks: Array<Pick<PlayerDevelopmentTask, 'title' | 'priority'>>;
  };
};

export type PlayerDevelopmentCoachReply = {
  assistantMessage: string;
  draft: PlayerDevelopmentCoachDraft;
  generatedAt: string;
};

type GeneratedTaskShape = Pick<PlayerDevelopmentTask, 'title' | 'priority'>;

export async function chatPlayerDevelopmentCoach(input: {
  currentWeekEntry: PlayerDevelopmentEntry | null;
  messages: PlayerDevelopmentCoachMessage[];
  player: Player;
  recentEntries: PlayerDevelopmentEntry[];
  weekStart: string;
}): Promise<PlayerDevelopmentCoachReply> {
  if (!supabase) {
    throw new Error('Supabase is not configured, so AI development chat is unavailable.');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || 'Could not verify your sign-in session.');
  }

  if (!session?.access_token) {
    throw new Error('Your Supabase session has expired. Please sign in again, then try the development chat.');
  }

  const { data, error } = await supabase.functions.invoke('generate-player-development-focus', {
    body: input,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(
      error.message || 'Could not reach the development coach right now. Please check your sign-in session and try again.'
    );
  }

  const assistantMessage =
    typeof data?.assistantMessage === 'string' ? data.assistantMessage.trim() : '';
  const seasonGoals = typeof data?.seasonGoals === 'string' ? data.seasonGoals.trim() : '';
  const coachingNote =
    typeof data?.weeklyFocus?.coachingNote === 'string' ? data.weeklyFocus.coachingNote.trim() : '';
  const tasks = Array.isArray(data?.weeklyFocus?.tasks)
    ? data.weeklyFocus.tasks
        .map((entry: unknown, index: number) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const task = entry as {
            priority?: unknown;
            title?: unknown;
          };

          const title = typeof task.title === 'string' ? task.title.trim() : '';
          const priorityValue =
            typeof task.priority === 'number'
              ? task.priority
              : typeof task.priority === 'string'
                ? Number(task.priority)
                : index + 1;

          if (!title) {
            return null;
          }

          return {
            title,
            priority: Number.isInteger(priorityValue) && priorityValue > 0 ? priorityValue : index + 1,
          };
        })
        .filter((entry: GeneratedTaskShape | null): entry is GeneratedTaskShape => entry != null)
        .sort((left: GeneratedTaskShape, right: GeneratedTaskShape) => left.priority - right.priority)
        .slice(0, 5)
    : [];

  if (!assistantMessage || !seasonGoals || !coachingNote || tasks.length <= 0) {
    throw new Error('The coaching response was incomplete. Please try again.');
  }

  return {
    assistantMessage,
    draft: {
      seasonGoals,
      weeklyFocus: {
        coachingNote,
        tasks,
      },
    },
    generatedAt:
      typeof data?.generatedAt === 'string' && data.generatedAt.trim()
        ? data.generatedAt
        : new Date().toISOString(),
  };
}
