import { createTrainingWarmUpBlock } from '@/lib/attendance';
import type { ClubPolicySettings, TrainingSession } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTimeId(value: string) {
  return value.replace(':', '');
}

function getSessionDateTime(dayKey: string, time: string) {
  return `${dayKey}T${time}:00`;
}

function getExistingTrainingDayKeys(sessions: TrainingSession[]) {
  return new Set(
    sessions.map((session) => {
      return session.date.slice(0, 10);
    })
  );
}

export function generateTrainingSessionsFromPolicy(
  sessions: TrainingSession[],
  policySettings: ClubPolicySettings,
  now = new Date()
) {
  const existingDayKeys = getExistingTrainingDayKeys(sessions);
  const generatedSessions: TrainingSession[] = [];
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startDate.getTime() + policySettings.trainingGenerationWeeks * 7 * DAY_MS);
  let matchingTrainingDayIndex = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = new Date(cursor.getTime() + DAY_MS)) {
    if (!policySettings.trainingDefaultDays.includes(cursor.getDay())) {
      continue;
    }

    const dayKey = getLocalDateKey(cursor);

    if (!existingDayKeys.has(dayKey)) {
      const locationIndex =
        Math.floor(matchingTrainingDayIndex / policySettings.trainingLocationRotationSpan) %
        policySettings.trainingDefaultLocations.length;

      generatedSessions.push({
        id: `ts-policy-${dayKey}-${getTimeId(policySettings.trainingDefaultTime)}`,
        title: policySettings.trainingDefaultTitle,
        date: getSessionDateTime(dayKey, policySettings.trainingDefaultTime),
        location: policySettings.trainingDefaultLocations[locationIndex],
        squad: null,
        goal: null,
        focus: null,
        sessionPlan: null,
        runPlan: [createTrainingWarmUpBlock()],
      });
    }

    matchingTrainingDayIndex += 1;
  }

  return generatedSessions;
}
