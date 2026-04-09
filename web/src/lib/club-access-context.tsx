import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createClubId, createInviteCode, normalizeInviteCode } from '@/lib/club';
import type { Club, ClubMembershipRole } from '@/lib/types';

import { useAuth } from '@web/lib/auth-context';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';
import { supabase } from '@web/lib/supabase';

type ClubAccessContextValue = {
  clubs: Club[];
  activeClub: Club | null;
  activeClubId: string | null;
  isLoading: boolean;
  createClub: (name: string) => Promise<string | null>;
  joinClub: (inviteCode: string) => Promise<string | null>;
  renameClub: (clubId: string, name: string) => Promise<string | null>;
  setActiveClubId: (clubId: string) => Promise<void>;
};

type MembershipRow = {
  club_id: string;
  role: ClubMembershipRole;
};

type ClubRow = {
  id: string;
  name: string;
  invite_code: string;
};

const ACTIVE_CLUB_ID_STORAGE_KEY = 'active-club-id.json';

const ClubAccessContext = createContext<ClubAccessContextValue | null>(null);

async function loadActiveClubId() {
  return readJsonStorage<string>(ACTIVE_CLUB_ID_STORAGE_KEY);
}

async function saveActiveClubId(clubId: string | null) {
  await writeJsonStorage(ACTIVE_CLUB_ID_STORAGE_KEY, clubId);
}

async function loadUserClubs(userId: string) {
  if (!supabase) {
    return [];
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('club_memberships')
    .select('club_id, role')
    .eq('user_id', userId);

  if (membershipError) {
    throw membershipError;
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];

  if (membershipRows.length === 0) {
    return [];
  }

  const clubIds = membershipRows.map((membership) => membership.club_id);
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('id, name, invite_code')
    .in('id', clubIds);

  if (clubsError) {
    throw clubsError;
  }

  const clubRows = (clubs ?? []) as ClubRow[];

  return membershipRows
    .map((membership) => {
      const club = clubRows.find((candidate) => candidate.id === membership.club_id);

      if (!club) {
        return null;
      }

      return {
        id: club.id,
        name: club.name,
        inviteCode: club.invite_code,
        role: membership.role,
      } satisfies Club;
    })
    .filter((club): club is Club => club !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function ClubAccessProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isConfigured || !user?.id) {
      setClubs([]);
      setActiveClubIdState(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const userId = user.id;
    setIsLoading(true);

    async function hydrate() {
      try {
        const [nextClubs, storedActiveClubId] = await Promise.all([
          loadUserClubs(userId),
          loadActiveClubId(),
        ]);

        if (!isMounted) {
          return;
        }

        setClubs(nextClubs);

        const hasStoredClub = storedActiveClubId
          ? nextClubs.some((club) => club.id === storedActiveClubId)
          : false;
        const nextActiveClubId = hasStoredClub ? storedActiveClubId : nextClubs[0]?.id ?? null;

        setActiveClubIdState(nextActiveClubId);
        await saveActiveClubId(nextActiveClubId);
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        console.warn('Failed to load club memberships', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, user?.id]);

  const setActiveClubId = useCallback(async (clubId: string) => {
    setActiveClubIdState(clubId);
    await saveActiveClubId(clubId);
  }, []);

  const createClub = useCallback(
    async (name: string) => {
      if (!supabase || !user?.id) {
        return 'Sign in before creating a club.';
      }

      const normalizedName = name.trim();

      if (!normalizedName) {
        return 'Enter a club name.';
      }

      const clubId = createClubId();
      const inviteCode = createInviteCode();

      const { error: clubError } = await supabase.from('clubs').insert({
        id: clubId,
        name: normalizedName,
        invite_code: inviteCode,
        created_by: user.id,
      });

      if (clubError) {
        return clubError.message;
      }

      const { error: membershipError } = await supabase.from('club_memberships').insert({
        club_id: clubId,
        user_id: user.id,
        role: 'owner',
      });

      if (membershipError) {
        return membershipError.message;
      }

      const nextClub: Club = {
        id: clubId,
        name: normalizedName,
        inviteCode,
        role: 'owner',
      };

      setClubs((current) => {
        return [...current, nextClub].sort((left, right) => left.name.localeCompare(right.name));
      });
      setActiveClubIdState(clubId);
      await saveActiveClubId(clubId);

      return null;
    },
    [user?.id]
  );

  const joinClub = useCallback(
    async (inviteCode: string) => {
      if (!supabase || !user?.id) {
        return 'Sign in before joining a club.';
      }

      const normalizedCode = normalizeInviteCode(inviteCode);

      if (!normalizedCode) {
        return 'Enter an invite code.';
      }

      const { data, error } = await supabase.rpc('find_club_by_invite_code', {
        invite_code_input: normalizedCode,
      });

      if (error) {
        return error.message;
      }

      const clubRow = Array.isArray(data) ? (data[0] as ClubRow | undefined) : undefined;

      if (!clubRow) {
        return 'No club matched that invite code.';
      }

      const existingMembership = clubs.find((club) => club.id === clubRow.id);

      if (existingMembership) {
        setActiveClubIdState(existingMembership.id);
        await saveActiveClubId(existingMembership.id);
        return null;
      }

      const { error: membershipError } = await supabase.from('club_memberships').insert({
        club_id: clubRow.id,
        user_id: user.id,
        role: 'manager',
      });

      if (membershipError) {
        return membershipError.message;
      }

      const nextClub: Club = {
        id: clubRow.id,
        name: clubRow.name,
        inviteCode: clubRow.invite_code,
        role: 'manager',
      };

      setClubs((current) => {
        return [...current, nextClub].sort((left, right) => left.name.localeCompare(right.name));
      });
      setActiveClubIdState(nextClub.id);
      await saveActiveClubId(nextClub.id);

      return null;
    },
    [clubs, user?.id]
  );

  const renameClub = useCallback(async (clubId: string, name: string) => {
    if (!supabase || !user?.id) {
      return 'Sign in before editing a club name.';
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      return 'Enter a club name.';
    }

    const { error } = await supabase
      .from('clubs')
      .update({ name: normalizedName })
      .eq('id', clubId);

    if (error) {
      return error.message;
    }

    setClubs((current) => {
      return current
        .map((club) => {
          if (club.id !== clubId) {
            return club;
          }

          return {
            ...club,
            name: normalizedName,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));
    });

    return null;
  }, [user?.id]);

  const value = useMemo<ClubAccessContextValue>(() => {
    const activeClub = clubs.find((club) => club.id === activeClubId) ?? null;

    return {
      clubs,
      activeClub,
      activeClubId,
      isLoading,
      createClub,
      joinClub,
      renameClub,
      setActiveClubId,
    };
  }, [activeClubId, clubs, createClub, isLoading, joinClub, renameClub, setActiveClubId]);

  return <ClubAccessContext.Provider value={value}>{children}</ClubAccessContext.Provider>;
}

export function useClubAccess() {
  const context = useContext(ClubAccessContext);

  if (!context) {
    throw new Error('useClubAccess must be used within ClubAccessProvider');
  }

  return context;
}
