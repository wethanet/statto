import { voteEntries } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { VoteEntry } from '@/lib/types';
import { normalizeVoteEntries } from '@/lib/votes';

const VOTES_STORAGE_KEY = 'vote-entries.json';

export async function loadVoteEntries() {
  const storedVoteEntries = await readJsonStorage<VoteEntry[]>(VOTES_STORAGE_KEY);

  return normalizeVoteEntries(storedVoteEntries ?? voteEntries);
}

export async function saveVoteEntries(voteEntries: VoteEntry[]) {
  await writeJsonStorage(VOTES_STORAGE_KEY, voteEntries);
}
