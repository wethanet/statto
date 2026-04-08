import type { MatchStatEntry } from '@/lib/types';

import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';

const MATCH_STATS_STORAGE_KEY = 'match-stats.json';

export async function loadMatchStats() {
  return (await readJsonStorage<MatchStatEntry[]>(MATCH_STATS_STORAGE_KEY)) ?? [];
}

export async function saveMatchStats(matchStats: MatchStatEntry[]) {
  await writeJsonStorage(MATCH_STATS_STORAGE_KEY, matchStats);
}
