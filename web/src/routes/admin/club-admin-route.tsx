import { useEffect, useMemo, useState } from 'react';

import { getPlayerDisplayName, getPlayerSortValue, normalizePlayerSquads } from '@/lib/team';
import type { ClubMembershipRole, PlayerSquad } from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminActionPanel,
  AdminHelpText,
  AdminRecordList,
  AdminSection,
  AdminSupportingPanel,
} from '@web/components/admin/admin-workflow';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { supabase } from '@web/lib/supabase';

type ClubMember = {
  userId: string;
  email: string | null;
  role: ClubMembershipRole;
  playerId: string | null;
  squads: PlayerSquad[];
  joinedAt: string;
};

type MembershipDraft = {
  role: ClubMembershipRole;
  playerId: string | null;
  squads: PlayerSquad[];
};

type PendingInvite = {
  email: string;
  role: ClubMembershipRole;
  playerId: string | null;
  squads: PlayerSquad[];
  createdAt: string;
};

type SendClubInviteResponse = {
  inviteSaved: boolean;
  emailSent: boolean;
  message?: string | null;
};

const roleOptions: ClubMembershipRole[] = ['admin', 'coach', 'player'];
const squadOptions: PlayerSquad[] = ['cup', 'plate'];

function formatJoinedAt(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getRoleLabel(role: ClubMembershipRole) {
  if (role === 'admin') {
    return 'Admin';
  }

  if (role === 'coach') {
    return 'Coach';
  }

  return 'Player';
}

function getSquadLabel(squad: PlayerSquad) {
  return squad === 'cup' ? 'Cup' : 'Plate';
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

function isMissingInviteSchemaError(error: unknown) {
  const message = getErrorMessage(error);

  return (
    message.includes("'club_member_invites'") ||
    message.includes('relation "public.club_member_invites" does not exist')
  );
}

export function ClubAdminRoute() {
  useEnsureClubCollections(['players']);

  const { user } = useAuth();
  const { activeClub, activeClubId, refreshClubs } = useClubAccess();
  const { players } = useClubData();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [drafts, setDrafts] = useState<Record<string, MembershipDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingUserId, setIsSavingUserId] = useState<string | null>(null);
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ClubMembershipRole>('player');
  const [invitePlayerId, setInvitePlayerId] = useState<string>('');
  const [inviteSquads, setInviteSquads] = useState<PlayerSquad[]>(['cup']);
  const [message, setMessage] = useState<string | null>(null);
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.active)
      .sort((left, right) => {
        return (
          getPlayerSortValue(left.number) - getPlayerSortValue(right.number) ||
          left.name.localeCompare(right.name)
        );
      });
  }, [players]);
  const playersById = useMemo(() => {
    return Object.fromEntries(sortedPlayers.map((player) => [player.id, player]));
  }, [sortedPlayers]);

  useEffect(() => {
    if (!activeClubId || !supabase) {
      setMembers([]);
      setDrafts({});
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    const client = supabase;

    async function loadMembers() {
      const [{ data, error }, inviteResult] = await Promise.all([
        client
        .from('club_memberships')
        .select('user_id, email, role, player_id, squads, joined_at')
        .eq('club_id', activeClubId)
          .order('joined_at', { ascending: true }),
        client
          .from('club_member_invites')
          .select('email, role, player_id, squads, created_at')
          .eq('club_id', activeClubId)
          .order('created_at', { ascending: true }),
      ]);

      if (error) {
        throw error;
      }

      if (!isMounted) {
        return;
      }

      const nextMembers = ((data ?? []) as Array<{
        user_id: string;
        email: string | null;
        role: ClubMembershipRole;
        player_id: string | null;
        squads: unknown;
        joined_at: string;
      }>).map((member) => ({
        userId: member.user_id,
        email: member.email,
        role: member.role,
        playerId: member.player_id,
        squads: normalizePlayerSquads(member.squads),
        joinedAt: member.joined_at,
      }));

      setMembers(nextMembers);
      setDrafts(
        Object.fromEntries(
          nextMembers.map((member) => [
            member.userId,
            {
              role: member.role,
              playerId: member.playerId,
              squads: member.squads,
            },
          ])
        )
      );

      if (inviteResult.error) {
        if (isMissingInviteSchemaError(inviteResult.error)) {
          setPendingInvites([]);
          setMessage(
            'Invite linking will appear after the latest database schema is applied. Existing member role updates still work.'
          );
          return;
        }

        throw inviteResult.error;
      }

      const nextInvites = ((inviteResult.data ?? []) as Array<{
        email: string;
        role: ClubMembershipRole;
        player_id: string | null;
        squads: unknown;
        created_at: string;
      }>).map((invite) => ({
        email: invite.email,
        role: invite.role,
        playerId: invite.player_id,
        squads: normalizePlayerSquads(invite.squads),
        createdAt: invite.created_at,
      }));

      setPendingInvites(nextInvites);
    }

    loadMembers()
      .catch((error: unknown) => {
        console.warn('Failed to load club members', error);
        if (isMounted) {
          setMessage(
            `Could not load club members: ${getErrorMessage(error)}`
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeClubId]);

  function updateDraft(userId: string, patch: Partial<MembershipDraft>) {
    setDrafts((current) => {
      const existing = current[userId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [userId]: {
          ...existing,
          ...patch,
        },
      };
    });
  }

  function toggleSquad(userId: string, squad: PlayerSquad) {
    const currentDraft = drafts[userId];

    if (!currentDraft) {
      return;
    }

    const nextSquads = currentDraft.squads.includes(squad)
      ? currentDraft.squads.filter((candidate) => candidate !== squad)
      : [...currentDraft.squads, squad];

    updateDraft(userId, { squads: nextSquads });
  }

  function toggleInviteSquad(squad: PlayerSquad) {
    setInviteSquads((current) => {
      return current.includes(squad)
        ? current.filter((candidate) => candidate !== squad)
        : [...current, squad];
    });
    setMessage(null);
  }

  function resetInviteForm() {
    setInviteEmail('');
    setInviteRole('player');
    setInvitePlayerId('');
    setInviteSquads(['cup']);
  }

  async function handleSaveMember(member: ClubMember) {
    if (!activeClubId || !supabase) {
      setMessage('Supabase is not configured for club membership updates.');
      return;
    }

    const draft = drafts[member.userId];

    if (!draft) {
      return;
    }

    if ((draft.role === 'coach' || draft.role === 'player') && draft.squads.length <= 0) {
      setMessage(`Assign at least one squad to ${member.email ?? 'this member'}.`);
      return;
    }

    if (draft.role === 'player' && !draft.playerId) {
      setMessage(`Link ${member.email ?? 'this player'} to a roster profile before saving.`);
      return;
    }

    setIsSavingUserId(member.userId);

    const { error } = await supabase
      .from('club_memberships')
      .update({
        role: draft.role,
        player_id: draft.playerId,
        squads: draft.role === 'admin' ? [] : draft.squads,
      })
      .eq('club_id', activeClubId)
      .eq('user_id', member.userId);

    setIsSavingUserId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    const nextMember: ClubMember = {
      ...member,
      role: draft.role,
      playerId: draft.playerId,
      squads: draft.role === 'admin' ? [] : draft.squads,
    };

    setMembers((current) => {
      return current.map((candidate) => (candidate.userId === member.userId ? nextMember : candidate));
    });
    setMessage(`${member.email ?? 'Member'} updated.`);

    if (member.userId === user?.id) {
      await refreshClubs();
    }
  }

  async function handleCreateInvite() {
    if (!activeClubId || !supabase) {
      setMessage('Supabase is not configured for invites.');
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage('Enter the email address to invite.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setMessage('Enter a valid email address.');
      return;
    }

    if ((inviteRole === 'coach' || inviteRole === 'player') && inviteSquads.length <= 0) {
      setMessage('Assign at least one squad before saving the invite.');
      return;
    }

    if (inviteRole === 'player' && !invitePlayerId) {
      setMessage('Link a player before saving a player invite.');
      return;
    }

    setIsSavingInvite(true);

    const { data, error } = await supabase.functions.invoke<SendClubInviteResponse>('send-club-invite', {
      body: {
        clubId: activeClubId,
        email: normalizedEmail,
        role: inviteRole,
        playerId: inviteRole === 'player' ? invitePlayerId : null,
        squads: inviteRole === 'admin' ? [] : inviteSquads,
        redirectTo: window.location.origin,
      },
    });

    setIsSavingInvite(false);

    if (error) {
      if (isMissingInviteSchemaError(error)) {
        setMessage('Apply the latest database schema before using email invites.');
        return;
      }

      setMessage(error.message);
      return;
    }

    const nextInvite: PendingInvite = {
      email: normalizedEmail,
      role: inviteRole,
      playerId: inviteRole === 'player' ? invitePlayerId : null,
      squads: inviteRole === 'admin' ? [] : inviteSquads,
      createdAt: new Date().toISOString(),
    };

    setPendingInvites((current) => {
      const filtered = current.filter((invite) => invite.email !== normalizedEmail);
      return [...filtered, nextInvite].sort((left, right) => left.email.localeCompare(right.email));
    });
    resetInviteForm();
    setMessage(
      data?.emailSent
        ? `Invite emailed to ${normalizedEmail}. When they sign up or accept the invite, they will be added to ${activeClub?.name ?? 'the club'} automatically.`
        : data?.message?.trim()
          ? data.message
          : `Invite saved for ${normalizedEmail}. If they already have an account, they can sign in with that email and will be added to ${activeClub?.name ?? 'the club'} automatically.`
    );
  }

  async function handleDeleteInvite(email: string) {
    if (!activeClubId || !supabase) {
      setMessage('Supabase is not configured for invites.');
      return;
    }

    const { error } = await supabase
      .from('club_member_invites')
      .delete()
      .eq('club_id', activeClubId)
      .eq('email', email);

    if (error) {
      if (isMissingInviteSchemaError(error)) {
        setMessage('Apply the latest database schema before using email invites.');
        return;
      }

      setMessage(error.message);
      return;
    }

    setPendingInvites((current) => current.filter((invite) => invite.email !== email));
    setMessage(`Removed the invite for ${email}.`);
  }

  return (
    <AdminPageShell
      description="Assign membership roles, link player accounts, and limit coaches and players to the squads they should manage or see."
      title="Club access">
      <AdminSection
        eyebrow="Access model"
        title="Invite and link members"
        description="Start with the invite path, then review pending invites and joined members separately.">
        <AdminSupportingPanel
          title="Club invite code"
          description="Share this code when someone needs to join with a different email address, then link their member record afterward.">
          <span className="metric metric--neutral">
            {activeClub ? `Invite code ${activeClub.inviteCode}` : 'No active club'}
          </span>
          <AdminHelpText>
            Email invites apply role and player links automatically only when the signed-in email matches.
            The invite code still lets a different email join the club so an admin can link the profile.
          </AdminHelpText>
        </AdminSupportingPanel>
      </AdminSection>

      <AdminSection
        eyebrow="Primary workflow"
        title="Pre-assign an invite"
        description="Use this when you know the email address the player or coach will use to sign in.">
        <AdminActionPanel
          title="Email invite and player linking"
          description="Pre-assign a role, squad access, and linked player before sending the invite email.">

        <div className="two-column">
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              onChange={(event) => {
                setInviteEmail(event.target.value);
                setMessage(null);
              }}
              placeholder="player@example.com"
              value={inviteEmail}
            />
          </label>

          <label className="field">
            <span>Invite role</span>
            <select
              className="input"
              onChange={(event) => {
                const nextRole = event.target.value as ClubMembershipRole;
                setInviteRole(nextRole);
                if (nextRole !== 'player') {
                  setInvitePlayerId('');
                }
                if (nextRole === 'admin') {
                  setInviteSquads([]);
                } else if (inviteSquads.length <= 0) {
                  setInviteSquads(['cup']);
                }
                setMessage(null);
              }}
              value={inviteRole}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Linked player</span>
          <select
            className="input"
            disabled={inviteRole !== 'player'}
            onChange={(event) => {
              setInvitePlayerId(event.target.value);
              setMessage(null);
            }}
            value={invitePlayerId}>
            <option value="">No linked player</option>
            {sortedPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {getPlayerDisplayName(player)}
              </option>
            ))}
          </select>
        </label>

        <div className="stack-sm">
          <span>Squad access</span>
          <div className="inline-actions">
            {squadOptions.map((squad) => {
              const isSelected = inviteSquads.includes(squad);

              return (
                <button
                  key={squad}
                  className={isSelected ? 'pill-button pill-button--selected' : 'pill-button'}
                  disabled={inviteRole === 'admin'}
                  onClick={() => {
                    toggleInviteSquad(squad);
                  }}
                  type="button">
                  {squad === 'cup' ? 'Cup' : 'Plate'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="inline-actions">
          <button className="button" disabled={isSavingInvite} onClick={() => void handleCreateInvite()} type="button">
            {isSavingInvite ? 'Sending invite...' : 'Send invite email'}
          </button>
        </div>
        </AdminActionPanel>
      </AdminSection>

      <AdminSection
        eyebrow="Pending"
        title="Invites waiting for signup"
        description="These records explain what will happen when the matching email signs in.">
        <AdminRecordList
          title="Pending invites"
          description="Remove stale invites here; joined members are managed in the next section.">
        {pendingInvites.length > 0 ? (
          pendingInvites.map((invite) => (
            <section className="nested-card stack" key={invite.email}>
              <div className="split-row">
                <div className="stack-sm">
                  <strong>{invite.email}</strong>
                  <span className="muted">Saved {formatJoinedAt(invite.createdAt)}</span>
                </div>
                <span className="metric metric--neutral">{getRoleLabel(invite.role)}</span>
              </div>

              <div className="metric-row">
                {invite.playerId ? (
                  <span className="metric metric--positive">
                    {(() => {
                      const linkedPlayer = sortedPlayers.find((player) => player.id === invite.playerId);
                      return linkedPlayer ? getPlayerDisplayName(linkedPlayer) : 'Linked player';
                    })()}
                  </span>
                ) : null}
                {invite.squads.map((squad) => (
                  <span className="metric metric--neutral" key={`${invite.email}-${squad}`}>
                    {squad === 'cup' ? 'Cup' : 'Plate'}
                  </span>
                ))}
                {invite.role === 'admin' ? <span className="metric metric--positive">All access</span> : null}
              </div>

              <div className="inline-actions">
                <button
                  className="button button--ghost"
                  onClick={() => {
                    void handleDeleteInvite(invite.email);
                  }}
                  type="button">
                  Remove invite
                </button>
              </div>
            </section>
          ))
        ) : (
          <p className="muted">No pending invites yet.</p>
        )}
        </AdminRecordList>
      </AdminSection>

      <AdminSection
        eyebrow="Members"
        title="Joined member access"
        description="Use this list after someone has joined to set their role, squads, and linked player profile.">
        <AdminRecordList
          title="Member roles"
          description="Admins can configure the club. Coaches can manage squads. Players are locked to their linked profile.">
        {isLoading ? (
          <p className="muted">Loading club members...</p>
        ) : members.length > 0 ? (
          <section className="schedule-board">
            <div className="schedule-board__header schedule-board__row--club">
              <span>Member</span>
              <span>Role</span>
              <span>Linked player</span>
              <span>Squad access</span>
              <span>Action</span>
            </div>
            <div className="schedule-board__body">
              {members.map((member) => {
                const draft = drafts[member.userId];

                if (!draft) {
                  return null;
                }

                const linkedPlayer = draft.playerId ? playersById[draft.playerId] : null;

                return (
                  <section className="schedule-board__row schedule-board__row--club" key={member.userId}>
                    <div className="schedule-board__cell schedule-board__primary">
                      <h3 className="schedule-board__title">{member.email ?? 'Email unavailable'}</h3>
                      <p className="schedule-board__meta">
                        Joined {formatJoinedAt(member.joinedAt)}
                        {member.userId === user?.id ? ' • You' : ''}
                      </p>
                    </div>

                    <div className="schedule-board__cell">
                      <label className="field schedule-board__field">
                        <span>Role</span>
                        <select
                          className="input"
                          onChange={(event) => {
                            const nextRole = event.target.value as ClubMembershipRole;
                            updateDraft(member.userId, {
                              role: nextRole,
                              playerId: nextRole === 'player' ? draft.playerId : null,
                              squads: nextRole === 'admin' ? [] : draft.squads,
                            });
                            setMessage(null);
                          }}
                          value={draft.role}>
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="schedule-board__cell">
                      <label className="field schedule-board__field">
                        <span>Linked player</span>
                        <select
                          className="input"
                          disabled={draft.role !== 'player'}
                          onChange={(event) => {
                            updateDraft(member.userId, { playerId: event.target.value || null });
                            setMessage(null);
                          }}
                          value={draft.playerId ?? ''}>
                          <option value="">No linked player</option>
                          {sortedPlayers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {getPlayerDisplayName(player)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="schedule-board__hint">
                        {linkedPlayer ? getPlayerDisplayName(linkedPlayer) : 'Not linked'}
                      </p>
                    </div>

                    <div className="schedule-board__cell">
                      <div className="stack-sm">
                        <span className="schedule-board__field-label">Squad access</span>
                        <div className="inline-actions">
                          {squadOptions.map((squad) => {
                            const isSelected = draft.squads.includes(squad);

                            return (
                              <button
                                key={squad}
                                className={isSelected ? 'pill-button pill-button--selected' : 'pill-button'}
                                disabled={draft.role === 'admin'}
                                onClick={() => {
                                  toggleSquad(member.userId, squad);
                                  setMessage(null);
                                }}
                                type="button">
                                {getSquadLabel(squad)}
                              </button>
                            );
                          })}
                        </div>
                        <p className="schedule-board__hint">
                          {draft.role === 'admin'
                            ? 'All access'
                            : draft.squads.length > 0
                              ? draft.squads.map(getSquadLabel).join(', ')
                              : 'No squads selected'}
                        </p>
                      </div>
                    </div>

                    <div className="schedule-board__cell schedule-board__action">
                      <button
                        className="button"
                        disabled={isSavingUserId === member.userId}
                        onClick={() => {
                          void handleSaveMember(member);
                        }}
                        type="button">
                        {isSavingUserId === member.userId ? 'Saving...' : 'Save member'}
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="muted">No members have joined this club yet.</p>
        )}
        </AdminRecordList>
      </AdminSection>

      {message ? <p className="muted">{message}</p> : null}
    </AdminPageShell>
  );
}
