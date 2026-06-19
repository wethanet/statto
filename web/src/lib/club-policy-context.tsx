import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_CLUB_POLICY_SETTINGS,
  normalizeClubPolicySettings,
} from '@/lib/club-policy';
import type { ClubPolicySettings } from '@/lib/types';

import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import {
  loadCloudClubPolicySettings,
  mapRowToPolicySettings,
  upsertCloudClubPolicySettings,
} from '@web/lib/storage/cloud-club-policy-storage';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';
import { supabase } from '@web/lib/supabase';

type ClubPolicyContextValue = {
  policySettings: ClubPolicySettings;
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;
  refreshPolicySettings: () => Promise<void>;
  savePolicySettings: (settings: ClubPolicySettings) => Promise<void>;
};

const ClubPolicyContext = createContext<ClubPolicyContextValue | null>(null);
const POLICY_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const POLICY_STALE_MS = 5 * 60 * 1000;

function getLocalPolicyStorageKey(activeClubId: string | null) {
  return `club-policy:${activeClubId ?? 'local'}:settings.json`;
}

export function ClubPolicyProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const { activeClubId, isLoading: isClubAccessLoading } = useClubAccess();
  const [policySettings, setPolicySettings] = useState(DEFAULT_CLUB_POLICY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastPolicyRefreshAtRef = useRef(0);

  const refreshPolicySettings = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    if (isAuthLoading || isClubAccessLoading) {
      return;
    }

    if (
      options?.silent &&
      !options.force &&
      Date.now() - lastPolicyRefreshAtRef.current < POLICY_STALE_MS
    ) {
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    setLastError(null);

    try {
      if (isConfigured && activeClubId) {
        setPolicySettings(await loadCloudClubPolicySettings(activeClubId));
        lastPolicyRefreshAtRef.current = Date.now();
        return;
      }

      const localSettings = await readJsonStorage<Partial<ClubPolicySettings>>(
        getLocalPolicyStorageKey(activeClubId)
      );
      setPolicySettings(normalizeClubPolicySettings(localSettings));
      lastPolicyRefreshAtRef.current = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load club policy settings.';
      setLastError(message);
      if (!options?.silent) {
        setPolicySettings(DEFAULT_CLUB_POLICY_SETTINGS);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeClubId, isAuthLoading, isClubAccessLoading, isConfigured]);

  const savePolicySettings = useCallback(
    async (settings: ClubPolicySettings) => {
      const normalizedSettings = normalizeClubPolicySettings(settings);
      setIsSaving(true);
      setLastError(null);

      try {
        if (isConfigured && activeClubId) {
          await upsertCloudClubPolicySettings(activeClubId, normalizedSettings);
        } else {
          await writeJsonStorage(getLocalPolicyStorageKey(activeClubId), normalizedSettings);
        }

        setPolicySettings(normalizedSettings);
        lastPolicyRefreshAtRef.current = Date.now();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save club policy settings.';
        setLastError(message);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [activeClubId, isConfigured]
  );

  useEffect(() => {
    void refreshPolicySettings();
  }, [refreshPolicySettings]);

  useEffect(() => {
    if (isAuthLoading || isClubAccessLoading || !isConfigured || !activeClubId) {
      return;
    }

    const refreshSilently = () => {
      void refreshPolicySettings({ silent: true });
    };
    const interval = window.setInterval(refreshSilently, POLICY_REFRESH_INTERVAL_MS);

    function handleFocus() {
      refreshSilently();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    activeClubId,
    isAuthLoading,
    isClubAccessLoading,
    isConfigured,
    refreshPolicySettings,
  ]);

  useEffect(() => {
    if (isAuthLoading || isClubAccessLoading || !isConfigured || !activeClubId || !supabase) {
      return;
    }

    const client = supabase;
    const channel = client
      .channel(`club-policy:${activeClubId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_policy_settings',
          filter: `club_id=eq.${activeClubId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPolicySettings(DEFAULT_CLUB_POLICY_SETTINGS);
            lastPolicyRefreshAtRef.current = Date.now();
            return;
          }

          if (payload.new && Object.keys(payload.new).length > 0) {
            setPolicySettings(mapRowToPolicySettings(payload.new as Parameters<typeof mapRowToPolicySettings>[0]));
            lastPolicyRefreshAtRef.current = Date.now();
            return;
          }

          void refreshPolicySettings({ force: true, silent: true });
        }
      );

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [
    activeClubId,
    isAuthLoading,
    isClubAccessLoading,
    isConfigured,
    refreshPolicySettings,
  ]);

  const value = useMemo<ClubPolicyContextValue>(() => {
    return {
      policySettings,
      isLoading,
      isSaving,
      lastError,
      refreshPolicySettings,
      savePolicySettings,
    };
  }, [isLoading, isSaving, lastError, policySettings, refreshPolicySettings, savePolicySettings]);

  return <ClubPolicyContext.Provider value={value}>{children}</ClubPolicyContext.Provider>;
}

export function useClubPolicy() {
  const value = useContext(ClubPolicyContext);

  if (!value) {
    throw new Error('useClubPolicy must be used within ClubPolicyProvider.');
  }

  return value;
}
