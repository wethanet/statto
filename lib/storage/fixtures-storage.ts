import { fixtures } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { Fixture } from '@/lib/types';

const FIXTURES_STORAGE_KEY = 'fixtures.json';

export async function loadFixtures() {
  const storedFixtures = await readJsonStorage<Fixture[]>(FIXTURES_STORAGE_KEY);

  return storedFixtures ?? fixtures;
}

export async function saveFixtures(fixtures: Fixture[]) {
  await writeJsonStorage(FIXTURES_STORAGE_KEY, fixtures);
}
