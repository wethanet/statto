import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Player } from '@/lib/types';

import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';

type PlayerProfileContextValue = {
  isLoading: boolean;
  isLocked: boolean;
  selectedPlayer: Player | null;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (playerId: string | null) => Promise<void>;
  clearSelectedPlayer: () => Promise<void>;
};

const PlayerProfileContext = createContext<PlayerProfileContextValue | null>(null);

function getStorageKey(clubId: string) {
  return `player-profile:${clubId}.json`;
}

export function PlayerProfileProvider({ children }: PropsWithChildren) {
  const { activeClub, activeClubId } = useClubAccess();
  const { isHydrated, players } = useClubData();
  const [selectedPlayerId, setSelectedPlayerIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeClubId || !isHydrated) {
      setSelectedPlayerIdState(null);
      setIsLoading(false);
      return;
    }

    if (activeClub?.role === 'player') {
      setSelectedPlayerIdState(activeClub.playerId);
      setIsLoading(false);
      return;
    }

    const clubId = activeClubId;
    let isMounted = true;
    setIsLoading(true);

    async function hydrate() {
      const storedPlayerId = await readJsonStorage<string>(getStorageKey(clubId));

      if (!isMounted) {
        return;
      }

      const hasStoredPlayer = storedPlayerId
        ? players.some((player) => player.id === storedPlayerId)
        : false;
      const nextPlayerId = hasStoredPlayer ? storedPlayerId : null;

      setSelectedPlayerIdState(nextPlayerId);
      if (storedPlayerId && !hasStoredPlayer) {
        await writeJsonStorage(getStorageKey(clubId), null);
      }
      setIsLoading(false);
    }

    hydrate().catch((error: unknown) => {
      console.warn('Failed to load selected player profile', error);
      if (isMounted) {
        setSelectedPlayerIdState(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeClub, activeClubId, isHydrated, players]);

  const setSelectedPlayerId = useCallback(
    async (playerId: string | null) => {
      if (!activeClubId) {
        setSelectedPlayerIdState(null);
        return;
      }

      if (activeClub?.role === 'player') {
        setSelectedPlayerIdState(activeClub.playerId);
        return;
      }

      setSelectedPlayerIdState(playerId);
      await writeJsonStorage(getStorageKey(activeClubId), playerId);
    },
    [activeClub, activeClubId]
  );

  const clearSelectedPlayer = useCallback(async () => {
    await setSelectedPlayerId(null);
  }, [setSelectedPlayerId]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) {
      return null;
    }

    return players.find((player) => player.id === selectedPlayerId) ?? null;
  }, [players, selectedPlayerId]);
  const isLocked = activeClub?.role === 'player';

  const value = useMemo<PlayerProfileContextValue>(() => {
    return {
      isLoading,
      isLocked,
      selectedPlayer,
      selectedPlayerId,
      setSelectedPlayerId,
      clearSelectedPlayer,
    };
  }, [clearSelectedPlayer, isLoading, isLocked, selectedPlayer, selectedPlayerId, setSelectedPlayerId]);

  return <PlayerProfileContext.Provider value={value}>{children}</PlayerProfileContext.Provider>;
}

export function usePlayerProfile() {
  const context = useContext(PlayerProfileContext);

  if (!context) {
    throw new Error('usePlayerProfile must be used within PlayerProfileProvider');
  }

  return context;
}
