import { fitnessResults } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { FitnessResult } from '@/lib/types';

const FITNESS_RESULTS_STORAGE_KEY = 'fitness-results.json';

export async function loadFitnessResults() {
  const storedFitnessResults = await readJsonStorage<FitnessResult[]>(FITNESS_RESULTS_STORAGE_KEY);

  return storedFitnessResults ?? fitnessResults;
}

export async function saveFitnessResults(fitnessResultsToSave: FitnessResult[]) {
  await writeJsonStorage(FITNESS_RESULTS_STORAGE_KEY, fitnessResultsToSave);
}
