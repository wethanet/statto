import { trainingSessions } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { TrainingSession } from '@/lib/types';

const TRAINING_SESSIONS_STORAGE_KEY = 'training-sessions.json';

export async function loadTrainingSessions() {
  const storedSessions = await readJsonStorage<TrainingSession[]>(TRAINING_SESSIONS_STORAGE_KEY);

  return storedSessions ?? trainingSessions;
}

export async function saveTrainingSessions(sessions: TrainingSession[]) {
  await writeJsonStorage(TRAINING_SESSIONS_STORAGE_KEY, sessions);
}
