import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';

const ACTIVE_CLUB_ID_STORAGE_KEY = 'active-club-id.json';

export async function loadActiveClubId() {
  return readJsonStorage<string>(ACTIVE_CLUB_ID_STORAGE_KEY);
}

export async function saveActiveClubId(clubId: string | null) {
  await writeJsonStorage(ACTIVE_CLUB_ID_STORAGE_KEY, clubId);
}
