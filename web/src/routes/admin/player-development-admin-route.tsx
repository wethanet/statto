import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  createEmptyPlayerDevelopmentEntry,
  createPlayerDevelopmentTask,
  formatDevelopmentWeekLabel,
  getCurrentDevelopmentWeekStart,
  getPlayerDevelopmentEntry,
  getPlayerDevelopmentHistory,
  getPlayerDevelopmentProficiencyLabel,
  getPlayerDevelopmentProgressStatusLabel,
  getPlayerDevelopmentTaskSummary,
  MAX_PLAYER_DEVELOPMENT_TASKS,
  playerDevelopmentLevels,
  playerDevelopmentProgressStatuses,
  upsertPlayerDevelopmentEntry,
} from '@/lib/player-development';
import {
  getPlayerDevelopmentLevelLabel,
  getPlayerDisplayName,
  getPlayerPositionLabel,
  getPlayerRunningProfileLabel,
  getPlayerSquadLabel,
  normalizePlayerDevelopmentLevel,
  updatePlayerDevelopmentProfile,
} from '@/lib/team';
import type { PlayerDevelopmentEntry, PlayerDevelopmentTask, PlayerSquad } from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';
import {
  chatPlayerDevelopmentCoach,
  type PlayerDevelopmentCoachDraft,
  type PlayerDevelopmentCoachMessage,
} from '@web/lib/player-development-ai';
import {
  upsertCloudPlayer,
  upsertCloudPlayerDevelopmentEntry,
} from '@web/lib/storage/cloud-core-data-storage';

function getDefaultWeeklyProficiency(entry: PlayerDevelopmentEntry | null) {
  return entry?.proficiency != null ? String(entry.proficiency) : '';
}

function normalizeWeeklyTasks(tasks: PlayerDevelopmentTask[]) {
  return tasks
    .map((task, index) => ({
      ...task,
      title: task.title.trim(),
      priority: index + 1,
    }))
    .filter((task) => task.title.length > 0)
    .slice(0, MAX_PLAYER_DEVELOPMENT_TASKS);
}

function createDevelopmentChatIntro(playerName: string): PlayerDevelopmentCoachMessage {
  return {
    role: 'assistant',
    content: `I’m ready to help shape ${playerName}'s development plan. Tell me what you’re seeing, what role you want them to grow into, and what success would look like by season’s end.`,
  };
}

export function PlayerDevelopmentAdminRoute() {
  const { activeClubId } = useClubAccess();
  const { canManagePlayer } = useClubPermissions();
  const { isHydrated, playerDevelopmentEntries, players, setPlayerDevelopmentEntries, setPlayers, storageMode } =
    useClubData();
  const [squadFilter, setSquadFilter] = useState<'all' | PlayerSquad | 'unassigned'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [seasonGoals, setSeasonGoals] = useState('');
  const [skillSummary, setSkillSummary] = useState('');
  const [developmentLevel, setDevelopmentLevel] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [weeklyMessage, setWeeklyMessage] = useState<string | null>(null);
  const [weeklyTasks, setWeeklyTasks] = useState<PlayerDevelopmentTask[]>([]);
  const [coachingNote, setCoachingNote] = useState('');
  const [progressStatus, setProgressStatus] = useState<PlayerDevelopmentEntry['progressStatus']>('not-started');
  const [proficiency, setProficiency] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [developmentChatMessages, setDevelopmentChatMessages] = useState<PlayerDevelopmentCoachMessage[]>([]);
  const [developmentChatInput, setDevelopmentChatInput] = useState('');
  const [latestChatDraft, setLatestChatDraft] = useState<PlayerDevelopmentCoachDraft | null>(null);
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingWeek, setIsSavingWeek] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [weeklyDirty, setWeeklyDirty] = useState(false);
  const lastProfilePlayerIdRef = useRef<string | null>(null);
  const lastWeeklyDraftKeyRef = useRef<string | null>(null);
  const currentWeekStart = useMemo(() => getCurrentDevelopmentWeekStart(), []);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (!canManagePlayer(player)) {
        return false;
      }

      if (squadFilter === 'all') {
        return true;
      }

      if (squadFilter === 'unassigned') {
        return player.squad == null;
      }

      return player.squad === squadFilter;
    });
  }, [canManagePlayer, players, squadFilter]);

  useEffect(() => {
    if (filteredPlayers.length <= 0) {
      setSelectedPlayerId(null);
      return;
    }

    if (!selectedPlayerId || !filteredPlayers.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(filteredPlayers[0]?.id ?? null);
    }
  }, [filteredPlayers, selectedPlayerId]);

  const selectedPlayer = filteredPlayers.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedPlayerHistory = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    return getPlayerDevelopmentHistory(playerDevelopmentEntries, selectedPlayer.id);
  }, [playerDevelopmentEntries, selectedPlayer]);
  const currentWeekEntry = useMemo(() => {
    if (!selectedPlayer) {
      return null;
    }

    return getPlayerDevelopmentEntry(playerDevelopmentEntries, selectedPlayer.id, currentWeekStart);
  }, [currentWeekStart, playerDevelopmentEntries, selectedPlayer]);

  useEffect(() => {
    if (!selectedPlayer) {
      setSeasonGoals('');
      setSkillSummary('');
      setDevelopmentLevel('');
      setProfileDirty(false);
      lastProfilePlayerIdRef.current = null;
      return;
    }

    const playerChanged = lastProfilePlayerIdRef.current !== selectedPlayer.id;

    if (playerChanged || !profileDirty) {
      setSeasonGoals(selectedPlayer.seasonGoals ?? '');
      setSkillSummary(selectedPlayer.skillSummary ?? '');
      setDevelopmentLevel(selectedPlayer.developmentLevel ?? '');
      setProfileDirty(false);
    }

    lastProfilePlayerIdRef.current = selectedPlayer.id;
  }, [profileDirty, selectedPlayer]);

  useEffect(() => {
    if (!selectedPlayer) {
      setWeeklyTasks([]);
      setCoachingNote('');
      setProgressStatus('not-started');
      setProficiency('');
      setProgressNote('');
      setWeeklyDirty(false);
      lastWeeklyDraftKeyRef.current = null;
      return;
    }

    const draftKey = `${selectedPlayer.id}::${currentWeekStart}`;
    const draftChanged = lastWeeklyDraftKeyRef.current !== draftKey;

    if (draftChanged || !weeklyDirty) {
      const nextWeekEntry =
        currentWeekEntry ?? createEmptyPlayerDevelopmentEntry(selectedPlayer.id, currentWeekStart);
      setWeeklyTasks(
        nextWeekEntry.tasks.length > 0
          ? nextWeekEntry.tasks
          : [
              createPlayerDevelopmentTask('', 1),
              createPlayerDevelopmentTask('', 2),
              createPlayerDevelopmentTask('', 3),
            ]
      );
      setCoachingNote(nextWeekEntry.coachingNote ?? '');
      setProgressStatus(nextWeekEntry.progressStatus);
      setProficiency(getDefaultWeeklyProficiency(nextWeekEntry));
      setProgressNote(nextWeekEntry.progressNote ?? '');
      setWeeklyDirty(false);
    }

    lastWeeklyDraftKeyRef.current = draftKey;
  }, [currentWeekEntry, currentWeekStart, selectedPlayer, weeklyDirty]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setDevelopmentChatMessages([]);
      setDevelopmentChatInput('');
      setLatestChatDraft(null);
      setChatMessage(null);
      return;
    }

    if (!selectedPlayer) {
      return;
    }

    setDevelopmentChatMessages([createDevelopmentChatIntro(getPlayerDisplayName(selectedPlayer))]);
    setDevelopmentChatInput('');
    setLatestChatDraft(null);
    setChatMessage(null);
  }, [selectedPlayerId]);

  const profileCoverageCount = filteredPlayers.filter((player) => {
    return Boolean(player.seasonGoals || player.skillSummary || player.developmentLevel);
  }).length;
  const thisWeekUpdatedCount = playerDevelopmentEntries.filter((entry) => {
    return entry.weekStart === currentWeekStart;
  }).length;

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlayer) {
      return;
    }

    const normalizedDevelopmentLevel = normalizePlayerDevelopmentLevel(developmentLevel);
    const nextPlayer = {
      ...selectedPlayer,
      seasonGoals: seasonGoals.trim() || null,
      skillSummary: skillSummary.trim() || null,
      developmentLevel: normalizedDevelopmentLevel,
    };

    setIsSavingProfile(true);
    setPlayers((current) => {
      return updatePlayerDevelopmentProfile(current, selectedPlayer.id, {
        seasonGoals,
        skillSummary,
        developmentLevel: normalizedDevelopmentLevel,
      });
    });

    if (activeClubId) {
      try {
        await upsertCloudPlayer(activeClubId, nextPlayer);
      } catch (error: unknown) {
        setIsSavingProfile(false);
        setProfileMessage(
          error instanceof Error ? `Could not save the player profile: ${error.message}` : 'Could not save the player profile.'
        );
        return;
      }
    }

    setIsSavingProfile(false);
    setProfileDirty(false);
    setProfileMessage('Development profile saved.');
  }

  async function handleSaveWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlayer) {
      return;
    }

    const nextEntry: PlayerDevelopmentEntry = {
      playerId: selectedPlayer.id,
      weekStart: currentWeekStart,
      tasks: normalizeWeeklyTasks(weeklyTasks),
      coachingNote: coachingNote.trim() || null,
      progressStatus,
      proficiency:
        proficiency.trim() && Number.isInteger(Number(proficiency))
          ? (Number(proficiency) as PlayerDevelopmentEntry['proficiency'])
          : null,
      progressNote: progressNote.trim() || null,
      generatedAt: currentWeekEntry?.generatedAt ?? null,
      updatedAt: new Date().toISOString(),
    };

    setIsSavingWeek(true);
    setPlayerDevelopmentEntries((current) => {
      return upsertPlayerDevelopmentEntry(current, nextEntry);
    });

    if (activeClubId) {
      try {
        await upsertCloudPlayerDevelopmentEntry(activeClubId, nextEntry);
      } catch (error: unknown) {
        setIsSavingWeek(false);
        setWeeklyMessage(
          error instanceof Error ? `Could not save this week's update: ${error.message}` : `Could not save this week's update.`
        );
        return;
      }
    }

    setIsSavingWeek(false);
    setWeeklyDirty(false);
    setWeeklyMessage('Weekly update saved.');
  }

  async function handleSendDevelopmentChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlayer) {
      return;
    }

    const nextInput = developmentChatInput.trim();

    if (!nextInput) {
      setChatMessage('Add a coaching question or observation before sending.');
      return;
    }

    const coachMessage: PlayerDevelopmentCoachMessage = {
      role: 'coach',
      content: nextInput,
    };
    const nextMessages = [...developmentChatMessages, coachMessage];

    setDevelopmentChatMessages(nextMessages);
    setDevelopmentChatInput('');
    setChatMessage(null);
    setIsChatting(true);

    try {
      const response = await chatPlayerDevelopmentCoach({
        currentWeekEntry,
        messages: nextMessages,
        player: {
          ...selectedPlayer,
          seasonGoals: seasonGoals.trim() || null,
          skillSummary: skillSummary.trim() || null,
          developmentLevel: normalizePlayerDevelopmentLevel(developmentLevel),
        },
        recentEntries: selectedPlayerHistory.slice(0, 4),
        weekStart: currentWeekStart,
      });

      setDevelopmentChatMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.assistantMessage,
        },
      ]);
      setLatestChatDraft(response.draft);
      setChatMessage('Draft updated from the latest chat turn.');
    } catch (error: unknown) {
      setChatMessage(
        error instanceof Error ? error.message : 'Could not reach the development coach right now.'
      );
    } finally {
      setIsChatting(false);
    }
  }

  function handleApplySeasonGoalsDraft() {
    if (!latestChatDraft) {
      return;
    }

    setSeasonGoals(latestChatDraft.seasonGoals);
    setProfileDirty(true);
    setProfileMessage('Draft applied to season goals. Save profile to keep it.');
  }

  function handleApplyWeeklyFocusDraft() {
    if (!latestChatDraft || !selectedPlayer) {
      return;
    }

    setWeeklyTasks(
      latestChatDraft.weeklyFocus.tasks.map((task, index) => {
        return {
          ...createPlayerDevelopmentTask(task.title, index + 1),
          priority: index + 1,
          progressStatus: 'not-started',
        };
      })
    );
    setCoachingNote(latestChatDraft.weeklyFocus.coachingNote);
    setWeeklyDirty(true);
    setWeeklyMessage('Draft applied to this week. Save weekly update to keep it.');
  }

  return (
    <AdminPageShell
      description="Set season goals, track weekly progress, and generate focused coaching priorities for each player."
      title="Player development">
      <section className="card stack">
        <div className="inline-actions">
          <label className="field field--inline">
            <span>Squad filter</span>
            <select className="input" onChange={(event) => setSquadFilter(event.target.value as typeof squadFilter)} value={squadFilter}>
              <option value="all">All squads</option>
              <option value="cup">{getPlayerSquadLabel('cup')}</option>
              <option value="plate">{getPlayerSquadLabel('plate')}</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <span className="metric metric--neutral">{profileCoverageCount} profiles set</span>
          <span className="metric metric--neutral">{thisWeekUpdatedCount} weekly updates this week</span>
          <span className="metric metric--neutral">Week of {formatDevelopmentWeekLabel(currentWeekStart)}</span>
        </div>
        <p className="muted">
          {!isHydrated
            ? 'Loading player development plans...'
            : storageMode === 'cloud'
              ? 'Coach chat uses the club’s Supabase function and OpenAI key, then lets you apply draft goals and weekly focuses into the player record.'
              : 'Profile and progress tracking work locally. AI coaching chat needs Supabase to be configured.'}
        </p>
      </section>

      <section className="development-layout">
        <aside className="card stack development-player-list">
          <h3>Players</h3>
          {filteredPlayers.length > 0 ? (
            <div className="development-player-list__items">
              {filteredPlayers.map((player) => {
                const latestEntry = getPlayerDevelopmentHistory(playerDevelopmentEntries, player.id)[0] ?? null;
                const isSelected = player.id === selectedPlayer?.id;

                return (
                  <button
                    key={player.id}
                    className={isSelected ? 'development-player-list__button development-player-list__button--selected' : 'development-player-list__button'}
                    onClick={() => {
                      setSelectedPlayerId(player.id);
                      setProfileMessage(null);
                      setWeeklyMessage(null);
                      setProfileDirty(false);
                      setWeeklyDirty(false);
                    }}
                    type="button">
                    <div className="stack-sm">
                      <strong>{getPlayerDisplayName(player)}</strong>
                      <span className="muted">
                        {getPlayerSquadLabel(player.squad)} • {getPlayerDevelopmentLevelLabel(player.developmentLevel)}
                      </span>
                      <span className="muted">
                        {latestEntry
                          ? `${formatDevelopmentWeekLabel(latestEntry.weekStart)} • ${getPlayerDevelopmentTaskSummary(latestEntry)}`
                          : 'No weekly update yet'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted">No players match the current squad filter.</p>
          )}
        </aside>

        <div className="stack-lg">
          {selectedPlayer ? (
            <>
              <section className="card stack">
                <div className="split-row">
                  <div className="stack-sm">
                    <h3>{getPlayerDisplayName(selectedPlayer)}</h3>
                    <p className="muted">
                      {getPlayerPositionLabel(selectedPlayer.primaryPosition)} primary
                      {selectedPlayer.secondaryPosition
                        ? ` • ${getPlayerPositionLabel(selectedPlayer.secondaryPosition)} secondary`
                        : ''}
                      {selectedPlayer.runningProfile
                        ? ` • ${getPlayerRunningProfileLabel(selectedPlayer.runningProfile)}`
                        : ''}
                    </p>
                  </div>
                  <span className="metric metric--neutral">{getPlayerSquadLabel(selectedPlayer.squad)}</span>
                </div>

                <form className="stack-sm" onSubmit={handleSaveProfile}>
                  <div className="two-column">
                    <label className="field">
                      <span>Current level</span>
                      <select
                        className="input"
                        onChange={(event) => {
                          setDevelopmentLevel(event.target.value);
                          setProfileMessage(null);
                          setProfileDirty(true);
                        }}
                        value={developmentLevel}>
                        <option value="">Unassigned</option>
                        {playerDevelopmentLevels.map((level) => (
                          <option key={level} value={level}>
                            {getPlayerDevelopmentLevelLabel(level)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Current skill snapshot</span>
                    <textarea
                      className="input textarea"
                      onChange={(event) => {
                        setSkillSummary(event.target.value);
                        setProfileMessage(null);
                        setProfileDirty(true);
                      }}
                      placeholder="What can this player do well right now, and what still needs work?"
                      value={skillSummary}
                    />
                  </label>
                  <label className="field">
                    <span>Season goals</span>
                    <textarea
                      className="input textarea"
                      onChange={(event) => {
                        setSeasonGoals(event.target.value);
                        setProfileMessage(null);
                        setProfileDirty(true);
                      }}
                      placeholder="Describe the 1-2 season outcomes you want this player to build toward."
                      value={seasonGoals}
                    />
                  </label>
                  <div className="inline-actions">
                    <button className="button" disabled={isSavingProfile} type="submit">
                      {isSavingProfile ? 'Saving...' : 'Save profile'}
                    </button>
                    {profileMessage ? <p className="muted">{profileMessage}</p> : null}
                  </div>
                </form>
              </section>

              <section className="card stack">
                <div className="split-row">
                  <div className="stack-sm">
                    <h3>Coach development chat</h3>
                    <p className="muted">
                      Talk through what you are seeing, what role this player is growing into, and what you want their next step to be. Each reply refreshes a draft you can apply into season goals or this week’s focus.
                    </p>
                  </div>
                  <span className="metric metric--neutral">Week of {formatDevelopmentWeekLabel(currentWeekStart)}</span>
                </div>

                <div className="development-chat">
                  <div className="development-chat__messages">
                    {developmentChatMessages.map((message, index) => (
                      <article
                        className={
                          message.role === 'coach'
                            ? 'development-chat__message development-chat__message--coach'
                            : 'development-chat__message development-chat__message--assistant'
                        }
                        key={`${message.role}-${index}-${message.content.slice(0, 20)}`}>
                        <span className="eyebrow">{message.role === 'coach' ? 'Coach' : 'Assistant'}</span>
                        <p>{message.content}</p>
                      </article>
                    ))}
                  </div>

                  <form className="stack-sm" onSubmit={handleSendDevelopmentChat}>
                    <label className="field">
                      <span>Message</span>
                      <textarea
                        className="input textarea"
                        onChange={(event) => {
                          setDevelopmentChatInput(event.target.value);
                          setChatMessage(null);
                        }}
                        placeholder="Example: She is brave at the contest but rushes the ball and loses shape once pressure arrives. I want her to become a reliable half-back by August."
                        value={developmentChatInput}
                      />
                    </label>
                    <div className="inline-actions">
                      <button className="button" disabled={isChatting || storageMode !== 'cloud'} type="submit">
                        {isChatting ? 'Thinking...' : 'Send to coach chat'}
                      </button>
                      {chatMessage ? <p className="muted">{chatMessage}</p> : null}
                    </div>
                  </form>

                  {latestChatDraft ? (
                    <div className="development-chat__draft card stack-sm">
                      <div className="split-row">
                        <div className="stack-sm">
                          <h4>Latest draft</h4>
                          <p className="muted">Apply this draft into the editable profile and weekly forms, then save when you are happy with it.</p>
                        </div>
                        <div className="inline-actions">
                          <button className="button button--secondary" onClick={handleApplySeasonGoalsDraft} type="button">
                            Use as season goals
                          </button>
                          <button className="button button--secondary" onClick={handleApplyWeeklyFocusDraft} type="button">
                            Use as weekly focus
                          </button>
                        </div>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Season goals draft</span>
                        <p className="muted">{latestChatDraft.seasonGoals}</p>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Weekly focus draft</span>
                        <p className="muted">{latestChatDraft.weeklyFocus.coachingNote}</p>
                        <div className="development-focus-list">
                          {latestChatDraft.weeklyFocus.tasks.map((task) => (
                            <span className="metric metric--neutral" key={task.priority}>
                              {`P${task.priority} ${task.title}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="card stack">
                <div className="split-row">
                  <div className="stack-sm">
                    <h3>This week</h3>
                    <p className="muted">Week of {formatDevelopmentWeekLabel(currentWeekStart)}</p>
                  </div>
                  {latestChatDraft ? <span className="metric metric--neutral">Draft ready to apply</span> : null}
                </div>

                <form className="stack-sm" onSubmit={handleSaveWeek}>
                  <div className="stack-sm">
                    <div className="split-row">
                      <span className="field-label">Priority tasks</span>
                      <button
                        className="button button--ghost"
                        disabled={weeklyTasks.length >= MAX_PLAYER_DEVELOPMENT_TASKS}
                        onClick={() => {
                          setWeeklyTasks((current) => [
                            ...current,
                            createPlayerDevelopmentTask('', current.length + 1),
                          ]);
                          setWeeklyDirty(true);
                          setWeeklyMessage(null);
                        }}
                        type="button">
                        Add task
                      </button>
                    </div>
                    <div className="development-task-list">
                      {weeklyTasks.map((task, index) => (
                        <div className="development-task-row" key={task.id}>
                          <span className="metric metric--neutral">P{index + 1}</span>
                          <input
                            className="input"
                            onChange={(event) => {
                              setWeeklyTasks((current) =>
                                current.map((entry) =>
                                  entry.id === task.id ? { ...entry, title: event.target.value } : entry
                                )
                              );
                              setWeeklyDirty(true);
                              setWeeklyMessage(null);
                            }}
                            placeholder="Add a specific drill, tactic, or coaching cue"
                            value={task.title}
                          />
                          <select
                            className="input"
                            onChange={(event) => {
                              setWeeklyTasks((current) =>
                                current.map((entry) =>
                                  entry.id === task.id
                                    ? {
                                        ...entry,
                                        progressStatus:
                                          event.target.value as PlayerDevelopmentTask['progressStatus'],
                                      }
                                    : entry
                                )
                              );
                              setWeeklyDirty(true);
                              setWeeklyMessage(null);
                            }}
                            value={task.progressStatus}>
                            {playerDevelopmentProgressStatuses.map((status) => (
                              <option key={status} value={status}>
                                {getPlayerDevelopmentProgressStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                          <button
                            className="button button--ghost"
                            disabled={weeklyTasks.length <= 1}
                            onClick={() => {
                              setWeeklyTasks((current) =>
                                current
                                  .filter((entry) => entry.id !== task.id)
                                  .map((entry, taskIndex) => ({ ...entry, priority: taskIndex + 1 }))
                              );
                              setWeeklyDirty(true);
                              setWeeklyMessage(null);
                            }}
                            type="button">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="field">
                    <span>Coaching note</span>
                    <textarea
                      className="input textarea"
                      onChange={(event) => {
                        setCoachingNote(event.target.value);
                        setWeeklyMessage(null);
                        setWeeklyDirty(true);
                      }}
                      value={coachingNote}
                    />
                  </label>
                  <div className="two-column">
                    <label className="field">
                      <span>Progress this week</span>
                      <select
                        className="input"
                        onChange={(event) => {
                          setProgressStatus(event.target.value as PlayerDevelopmentEntry['progressStatus']);
                          setWeeklyMessage(null);
                          setWeeklyDirty(true);
                        }}
                        value={progressStatus}>
                        {playerDevelopmentProgressStatuses.map((status) => (
                          <option key={status} value={status}>
                            {getPlayerDevelopmentProgressStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Proficiency</span>
                      <select
                        className="input"
                        onChange={(event) => {
                          setProficiency(event.target.value);
                          setWeeklyMessage(null);
                          setWeeklyDirty(true);
                        }}
                        value={proficiency}>
                        <option value="">Not rated</option>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={String(value)}>
                            {value}/5
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Coach progress note</span>
                    <textarea
                      className="input textarea"
                      onChange={(event) => {
                        setProgressNote(event.target.value);
                        setWeeklyMessage(null);
                        setWeeklyDirty(true);
                      }}
                      placeholder="What moved, what stalled, and what should carry into next week?"
                      value={progressNote}
                    />
                  </label>
                  <div className="inline-actions">
                    <button className="button" disabled={isSavingWeek} type="submit">
                      {isSavingWeek ? 'Saving...' : 'Save weekly update'}
                    </button>
                    {weeklyMessage ? <p className="muted">{weeklyMessage}</p> : null}
                  </div>
                </form>
              </section>

              <section className="card stack">
                <div className="split-row">
                  <h3>Recent development history</h3>
                  <span className="metric metric--neutral">{selectedPlayerHistory.length} weeks logged</span>
                </div>

                {selectedPlayerHistory.length > 0 ? (
                  <div className="development-history">
                    {selectedPlayerHistory.map((entry) => (
                      <article className="development-history__item" key={`${entry.playerId}-${entry.weekStart}`}>
                        <div className="split-row">
                          <strong>{formatDevelopmentWeekLabel(entry.weekStart)}</strong>
                          <span className="muted">
                            {getPlayerDevelopmentProgressStatusLabel(entry.progressStatus)} •{' '}
                            {getPlayerDevelopmentProficiencyLabel(entry.proficiency)}
                          </span>
                        </div>
                        {entry.tasks.length > 0 ? (
                          <div className="development-focus-list">
                            {entry.tasks.map((task) => (
                              <span className="metric metric--neutral" key={`${entry.weekStart}-${task.id}`}>
                                {`P${task.priority} ${task.title} • ${getPlayerDevelopmentProgressStatusLabel(task.progressStatus)}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">No tasks saved for this week.</p>
                        )}
                        {entry.coachingNote ? <p className="muted">{entry.coachingNote}</p> : null}
                        {entry.progressNote ? <p>{entry.progressNote}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No development history has been recorded for this player yet.</p>
                )}
              </section>
            </>
          ) : (
            <section className="card stack">
              <h3>No player selected</h3>
              <p className="muted">Choose a player to set goals, generate a weekly focus, and track progress.</p>
            </section>
          )}
        </div>
      </section>
    </AdminPageShell>
  );
}
