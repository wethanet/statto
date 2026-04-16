import type {
  PlayerDevelopmentEntry,
  PlayerDevelopmentLevel,
  PlayerDevelopmentProgressStatus,
  PlayerDevelopmentTask,
} from '@/lib/types';

export const playerDevelopmentLevels: PlayerDevelopmentLevel[] = [
  'emerging',
  'developing',
  'reliable',
  'advanced',
];

export const playerDevelopmentProgressStatuses: PlayerDevelopmentProgressStatus[] = [
  'not-started',
  'building',
  'on-track',
  'banked',
];
export const MAX_PLAYER_DEVELOPMENT_TASKS = 5;

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toDateOnlyString(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

export function getCurrentDevelopmentWeekStart(referenceDate: Date = new Date()) {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  date.setDate(date.getDate() + mondayOffset);

  return toDateOnlyString(date);
}

export function formatDevelopmentWeekLabel(weekStart: string) {
  const date = new Date(`${weekStart}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return weekStart;
  }

  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function normalizePlayerDevelopmentProgressStatus(
  value: string | null | undefined
): PlayerDevelopmentProgressStatus {
  const normalizedValue = value?.trim().toLowerCase() as PlayerDevelopmentProgressStatus | undefined;

  if (normalizedValue && playerDevelopmentProgressStatuses.includes(normalizedValue)) {
    return normalizedValue;
  }

  return 'not-started';
}

export function createPlayerDevelopmentTask(
  title = '',
  priority = 1,
  progressStatus: PlayerDevelopmentProgressStatus = 'not-started'
): PlayerDevelopmentTask {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    priority,
    progressStatus,
  };
}

export function normalizePlayerDevelopmentTasks(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedTasks = value
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const title = entry.trim();

        if (!title) {
          return null;
        }

        return {
          id: `legacy-task-${index + 1}`,
          title,
          priority: index + 1,
          progressStatus: 'not-started',
        } satisfies PlayerDevelopmentTask;
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const title =
        typeof entry.title === 'string'
          ? entry.title.trim()
          : typeof entry.name === 'string'
            ? entry.name.trim()
            : '';

      if (!title) {
        return null;
      }

      const priorityValue =
        typeof entry.priority === 'number'
          ? entry.priority
          : typeof entry.priority === 'string'
            ? Number(entry.priority)
            : index + 1;

      return {
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id.trim()
            : `task-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        priority: Number.isInteger(priorityValue) && priorityValue > 0 ? priorityValue : index + 1,
        progressStatus: normalizePlayerDevelopmentProgressStatus(
          typeof entry.progressStatus === 'string'
            ? entry.progressStatus
            : typeof entry.progress_status === 'string'
              ? entry.progress_status
              : undefined
        ),
      } satisfies PlayerDevelopmentTask;
    })
    .filter((entry): entry is PlayerDevelopmentTask => entry != null)
    .sort((left, right) => left.priority - right.priority)
    .slice(0, MAX_PLAYER_DEVELOPMENT_TASKS);

  return normalizedTasks.map((task, index) => ({
    ...task,
    priority: index + 1,
  }));
}

function normalizePlayerDevelopmentProficiency(value: unknown): PlayerDevelopmentEntry['proficiency'] {
  const normalizedValue =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;

  if (Number.isInteger(normalizedValue) && normalizedValue >= 1 && normalizedValue <= 5) {
    return normalizedValue as PlayerDevelopmentEntry['proficiency'];
  }

  return null;
}

export function createEmptyPlayerDevelopmentEntry(
  playerId: string,
  weekStart: string
): PlayerDevelopmentEntry {
  return {
    playerId,
    weekStart,
    tasks: [],
    coachingNote: null,
    progressStatus: 'not-started',
    proficiency: null,
    progressNote: null,
    generatedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizePlayerDevelopmentEntries(
  entries: Array<
    Omit<PlayerDevelopmentEntry, 'weekStart' | 'tasks' | 'coachingNote' | 'progressStatus' | 'proficiency' | 'progressNote' | 'generatedAt' | 'updatedAt'> & {
      weekStart?: string | null;
      week_start?: string | null;
      tasks?: unknown;
      focus_areas?: unknown;
      coachingNote?: string | null;
      coaching_note?: string | null;
      progressStatus?: string | null;
      progress_status?: string | null;
      proficiency?: unknown;
      progressNote?: string | null;
      progress_note?: string | null;
      generatedAt?: string | null;
      generated_at?: string | null;
      updatedAt?: string | null;
      updated_at?: string | null;
    }
  >
) {
  return entries
    .map((entry) => {
      const weekStart = (entry.weekStart ?? entry.week_start ?? '').trim();

      if (!weekStart) {
        return null;
      }

      return {
        playerId: entry.playerId,
        weekStart,
        tasks: normalizePlayerDevelopmentTasks(entry.tasks ?? entry.focus_areas),
        coachingNote: normalizeOptionalText(entry.coachingNote ?? entry.coaching_note),
        progressStatus: normalizePlayerDevelopmentProgressStatus(
          entry.progressStatus ?? entry.progress_status
        ),
        proficiency: normalizePlayerDevelopmentProficiency(entry.proficiency),
        progressNote: normalizeOptionalText(entry.progressNote ?? entry.progress_note),
        generatedAt: normalizeOptionalText(entry.generatedAt ?? entry.generated_at),
        updatedAt: normalizeOptionalText(entry.updatedAt ?? entry.updated_at) ?? new Date().toISOString(),
      } satisfies PlayerDevelopmentEntry;
    })
    .filter((entry): entry is PlayerDevelopmentEntry => entry != null)
    .sort((left, right) => right.weekStart.localeCompare(left.weekStart));
}

export function upsertPlayerDevelopmentEntry(
  entries: PlayerDevelopmentEntry[],
  nextEntry: PlayerDevelopmentEntry
) {
  const nextEntries = entries.filter((entry) => {
    return !(entry.playerId === nextEntry.playerId && entry.weekStart === nextEntry.weekStart);
  });

  return normalizePlayerDevelopmentEntries([...nextEntries, nextEntry]);
}

export function deletePlayerDevelopmentEntry(
  entries: PlayerDevelopmentEntry[],
  playerId: string,
  weekStart: string
) {
  return entries.filter((entry) => {
    return !(entry.playerId === playerId && entry.weekStart === weekStart);
  });
}

export function deletePlayerDevelopmentEntriesForPlayer(
  entries: PlayerDevelopmentEntry[],
  playerId: string
) {
  return entries.filter((entry) => entry.playerId !== playerId);
}

export function getPlayerDevelopmentEntry(
  entries: PlayerDevelopmentEntry[],
  playerId: string,
  weekStart: string
) {
  return entries.find((entry) => {
    return entry.playerId === playerId && entry.weekStart === weekStart;
  }) ?? null;
}

export function getPlayerDevelopmentHistory(entries: PlayerDevelopmentEntry[], playerId: string) {
  return entries.filter((entry) => entry.playerId === playerId).sort((left, right) => {
    return right.weekStart.localeCompare(left.weekStart);
  });
}

export function getPlayerDevelopmentProgressStatusLabel(status: PlayerDevelopmentProgressStatus) {
  switch (status) {
    case 'building':
      return 'Building';
    case 'on-track':
      return 'On track';
    case 'banked':
      return 'Banked';
    default:
      return 'Not started';
  }
}

export function getPlayerDevelopmentProficiencyLabel(value: PlayerDevelopmentEntry['proficiency']) {
  if (value == null) {
    return 'Not rated';
  }

  return `${value}/5`;
}

export function getPlayerDevelopmentTaskSummary(entry: PlayerDevelopmentEntry | null) {
  if (!entry || entry.tasks.length <= 0) {
    return 'No tasks set';
  }

  return entry.tasks
    .slice(0, 2)
    .map((task) => task.title)
    .join(' • ');
}
