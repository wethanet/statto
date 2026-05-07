import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  upsertCloudClubPolicySettings,
} from '@web/lib/storage/cloud-club-policy-storage';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';

type ClubPolicyContextValue = {
  policySettings: ClubPolicySettings;
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;
  refreshPolicySettings: () => Promise<void>;
  savePolicySettings: (settings: ClubPolicySettings) => Promise<void>;
};

const ClubPolicyContext = createContext<ClubPolicyContextValue | null>(null);

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

  const refreshPolicySettings = useCallback(async () => {
    if (isAuthLoading || isClubAccessLoading) {
      return;
    }

    setIsLoading(true);
    setLastError(null);

    try {
      if (isConfigured && activeClubId) {
        setPolicySettings(await loadCloudClubPolicySettings(activeClubId));
        return;
      }

      const localSettings = await readJsonStorage<Partial<ClubPolicySettings>>(
        getLocalPolicyStorageKey(activeClubId)
      );
      setPolicySettings(normalizeClubPolicySettings(localSettings));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load club policy settings.';
      setLastError(message);
      setPolicySettings(DEFAULT_CLUB_POLICY_SETTINGS);
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
