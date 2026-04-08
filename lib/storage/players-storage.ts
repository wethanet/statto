import { players } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { Player } from '@/lib/types';

const PLAYERS_STORAGE_KEY = 'players.json';

export async function loadPlayers() {
  const storedPlayers = await readJsonStorage<Player[]>(PLAYERS_STORAGE_KEY);

  return storedPlayers ?? players;
}

export async function savePlayers(players: Player[]) {
  await writeJsonStorage(PLAYERS_STORAGE_KEY, players);
}
