import { fines } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { Fine } from '@/lib/types';

const FINES_STORAGE_KEY = 'fines.json';

export async function loadFines() {
  const storedFines = await readJsonStorage<Fine[]>(FINES_STORAGE_KEY);

  return storedFines ?? fines;
}

export async function saveFines(fines: Fine[]) {
  await writeJsonStorage(FINES_STORAGE_KEY, fines);
}
