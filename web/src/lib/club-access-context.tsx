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
import type { Club, ClubMembershipRole, PlayerSquad } from '@/lib/types';

import { useAuth } from '@web/lib/auth-context';
import { readJsonStorage, writeJsonStorage } from '@web/lib/storage/local-storage';
import { supabase } from '@web/lib/supabase';
import { normalizePlayerSquads } from '@/lib/team';

type ClubAccessContextValue = {
  clubs: Club[];
  activeClub: Club | null;
  activeClubId: string | null;
  isLoading: boolean;
  createClub: (name: string) => Promise<string | null>;
  joinClub: (inviteCode: string) => Promise<string | null>;
  renameClub: (clubId: string, name: string) => Promise<string | null>;
  refreshClubs: () => Promise<void>;
  setActiveClubId: (clubId: string) => Promise<void>;
};

type MembershipRow = {
  club_id: string;
  role: string;
  email: string | null;
  player_id: string | null;
  squads: unknown;
};

type ClubRow = {
  id: string;
  name: string;
  invite_code: string;
};

type ClubInviteRow = {
  email: string;
  role: string;
  player_id: string | null;
  squads: unknown;
};

type JoinClubRpcRow = {
  id: string;
  name: string;
  invite_code: string;
  membership_role: string;
  player_id: string | null;
  squads: unknown;
};

const ACTIVE_CLUB_ID_STORAGE_KEY = 'active-club-id.json';

const ClubAccessContext = createContext<ClubAccessContextValue | null>(null);

async function loadActiveClubId() {
  return readJsonStorage<string>(ACTIVE_CLUB_ID_STORAGE_KEY);
}

async function saveActiveClubId(clubId: string | null) {
  await writeJsonStorage(ACTIVE_CLUB_ID_STORAGE_KEY, clubId);
}

function isMissingClubMembershipColumnError(error: unknown) {
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : null;

  if (!message) {
    return false;
  }

  return (
    message.includes("'club_memberships'") &&
    (message.includes("'email' column") ||
      message.includes("'player_id' column") ||
      message.includes("'squads' column"))
  );
}

function getSupabaseErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return null;
}

function isClubMembershipRoleConstraintError(error: unknown) {
  const message = getSupabaseErrorMessage(error);

  if (!message) {
    return false;
  }

  return (
    message.includes('club_memberships_role_check') ||
    message.includes('violates check constraint') && message.includes('club_memberships')
  );
}

function isMissingClubInviteSchemaError(error: unknown) {
  const message = getSupabaseErrorMessage(error);

  if (!message) {
    return false;
  }

  return (
    message.includes("'club_member_invites'") ||
    message.includes('relation "public.club_member_invites" does not exist')
  );
}

function normalizeClubMembershipRole(role: string | null | undefined): ClubMembershipRole {
  if (role === 'admin' || role === 'coach' || role === 'player') {
    return role;
  }

  if (role === 'owner' || role === 'manager') {
    return 'admin';
  }

  return 'player';
}

async function insertMembershipWithFallback(input: {
  club_id: string;
  user_id: string;
  role: ClubMembershipRole;
  email: string | null;
  player_id: string | null;
  squads: PlayerSquad[];
}) {
  if (!supabase) {
    return 'Supabase is not configured yet.';
  }

  const normalizedRole = normalizeClubMembershipRole(input.role);
  const { error } = await supabase.from('club_memberships').insert({
    ...input,
    role: normalizedRole,
  });

  if (!error) {
    return null;
  }

  if (isClubMembershipRoleConstraintError(error)) {
    const { error: safeInsertError } = await supabase.from('club_memberships').insert({
      ...input,
      role: 'player',
      email: null,
      player_id: null,
      squads: [],
    });

    if (safeInsertError) {
      return safeInsertError.message;
    }

    if (normalizedRole !== 'player') {
      const { error: upgradeRoleError } = await supabase
        .from('club_memberships')
        .update({
          role: normalizedRole,
          email: input.email,
          player_id: input.player_id,
          squads: normalizedRole === 'admin' ? [] : input.squads,
        })
        .eq('club_id', input.club_id)
        .eq('user_id', input.user_id);

      if (upgradeRoleError) {
        return upgradeRoleError.message;
      }
    }

    return null;
  }

  if (!isMissingClubMembershipColumnError(error)) {
    return error.message;
  }

  const { error: legacyInsertError } = await supabase.from('club_memberships').insert({
    club_id: input.club_id,
    user_id: input.user_id,
    role: normalizedRole,
  });

  return legacyInsertError?.message ?? null;
}

async function loadClubInviteForUser(clubId: string, email: string | null | undefined) {
  if (!supabase || !email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from('club_member_invites')
    .select('email, role, player_id, squads')
    .eq('club_id', clubId)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    if (isMissingClubInviteSchemaError(error)) {
      return null;
    }

    throw error;
  }

  const invite = data as ClubInviteRow | null;

  if (!invite) {
    return null;
  }

  return {
    email: invite.email,
    role: normalizeClubMembershipRole(invite.role),
    playerId: invite.player_id,
    squads: normalizePlayerSquads(invite.squads),
  };
}

async function deleteClubInvite(clubId: string, email: string | null | undefined) {
  if (!supabase || !email) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return;
  }

  const { error } = await supabase
    .from('club_member_invites')
    .delete()
    .eq('club_id', clubId)
    .eq('email', normalizedEmail);

  if (error && !isMissingClubInviteSchemaError(error)) {
    throw error;
  }
}

async function loadUserClubs(userId: string) {
  if (!supabase) {
    return [];
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('club_memberships')
    .select('club_id, role, email, player_id, squads')
    .eq('user_id', userId);

  let membershipRows = (memberships ?? []) as MembershipRow[];

  if (membershipError && isMissingClubMembershipColumnError(membershipError)) {
    const { data: legacyMemberships, error: legacyMembershipError } = await supabase
      .from('club_memberships')
      .select('club_id, role')
      .eq('user_id', userId);

    if (legacyMembershipError) {
      throw legacyMembershipError;
    }

    membershipRows = ((legacyMemberships ?? []) as Array<{ club_id: string; role: string }>).map(
      (membership) => ({
        club_id: membership.club_id,
        role: membership.role,
        email: null,
        player_id: null,
        squads: [],
      })
    );
  } else if (membershipError) {
    throw membershipError;
  }

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
        role: normalizeClubMembershipRole(membership.role),
        email: membership.email,
        playerId: membership.player_id,
        squads: normalizePlayerSquads(membership.squads),
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

  const refreshClubs = useCallback(async () => {
    if (!isConfigured || !user?.id) {
      setClubs([]);
      setActiveClubIdState(null);
      await saveActiveClubId(null);
      return;
    }

    setIsLoading(true);

    try {
      const [nextClubs, storedActiveClubId] = await Promise.all([
        loadUserClubs(user.id),
        loadActiveClubId(),
      ]);

      setClubs(nextClubs);

      const hasStoredClub = storedActiveClubId
        ? nextClubs.some((club) => club.id === storedActiveClubId)
        : false;
      const nextActiveClubId = hasStoredClub ? storedActiveClubId : nextClubs[0]?.id ?? null;

      setActiveClubIdState(nextActiveClubId);
      await saveActiveClubId(nextActiveClubId);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, user?.id]);

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
    refreshClubs().catch((error: unknown) => {
      if (!isMounted) {
        return;
      }

      console.warn('Failed to load club memberships', error);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, refreshClubs, user?.id]);

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

      const membershipError = await insertMembershipWithFallback({
        club_id: clubId,
        user_id: user.id,
        role: 'admin',
        email: user.email ?? null,
        player_id: null,
        squads: [],
      });

      if (membershipError) {
        return membershipError;
      }

      const nextClub: Club = {
        id: clubId,
        name: normalizedName,
        inviteCode,
        role: 'admin',
        email: user.email ?? null,
        playerId: null,
        squads: [],
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

      const joinRpc = await supabase.rpc('join_club_by_invite_code', {
        invite_code_input: normalizedCode,
      });

      if (!joinRpc.error) {
        const joinRow = Array.isArray(joinRpc.data)
          ? (joinRpc.data[0] as JoinClubRpcRow | undefined)
          : undefined;

        if (!joinRow) {
          return 'No club matched that invite code.';
        }

        const nextClub: Club = {
          id: joinRow.id,
          name: joinRow.name,
          inviteCode: joinRow.invite_code,
          role: normalizeClubMembershipRole(joinRow.membership_role),
          email: user.email ?? null,
          playerId: joinRow.player_id,
          squads: normalizePlayerSquads(joinRow.squads),
        };

        setClubs((current) => {
          const filtered = current.filter((club) => club.id !== nextClub.id);
          return [...filtered, nextClub].sort((left, right) => left.name.localeCompare(right.name));
        });
        setActiveClubIdState(nextClub.id);
        await saveActiveClubId(nextClub.id);
        return null;
      }

      const rpcMessage = getSupabaseErrorMessage(joinRpc.error);

      if (rpcMessage && !rpcMessage.includes('join_club_by_invite_code')) {
        return rpcMessage;
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

      let pendingInvite: Awaited<ReturnType<typeof loadClubInviteForUser>> | null = null;

      try {
        pendingInvite = await loadClubInviteForUser(clubRow.id, user.email ?? null);
      } catch (error: unknown) {
        return getSupabaseErrorMessage(error) ?? 'Could not load the club invite for this user.';
      }

      const membershipError = await insertMembershipWithFallback({
        club_id: clubRow.id,
        user_id: user.id,
        role: pendingInvite?.role ?? 'player',
        email: user.email ?? null,
        player_id: pendingInvite?.playerId ?? null,
        squads: pendingInvite?.squads ?? [],
      });

      if (membershipError) {
        return membershipError;
      }

      try {
        await deleteClubInvite(clubRow.id, user.email ?? null);
      } catch (error: unknown) {
        console.warn('Failed to clear accepted club invite', error);
      }

      const nextClub: Club = {
        id: clubRow.id,
        name: clubRow.name,
        inviteCode: clubRow.invite_code,
        role: pendingInvite?.role ?? 'player',
        email: user.email ?? null,
        playerId: pendingInvite?.playerId ?? null,
        squads: pendingInvite?.squads ?? [],
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
      refreshClubs,
      setActiveClubId,
    };
  }, [activeClubId, clubs, createClub, isLoading, joinClub, refreshClubs, renameClub, setActiveClubId]);

  return <ClubAccessContext.Provider value={value}>{children}</ClubAccessContext.Provider>;
}

export function useClubAccess() {
  const context = useContext(ClubAccessContext);

  if (!context) {
    throw new Error('useClubAccess must be used within ClubAccessProvider');
  }

  return context;
}
