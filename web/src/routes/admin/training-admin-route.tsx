import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { normalizeClubPolicySettings } from '@/lib/club-policy';
import {
  addTrainingSession,
  deleteAttendanceRecordsForSession,
  deleteTrainingSession,
  getSortedTrainingSessions,
  updateTrainingSession,
} from '@/lib/attendance';
import { getPlayerSquadLabel, normalizePlayerSquad } from '@/lib/team';
import {
  getTrainingDrillLibraryDrills,
  isDuplicateTrainingDrill,
  normalizeTrainingDrillName,
} from '@/lib/training-drill-library';
import { generateTrainingSessionsFromPolicy } from '@/lib/training-schedule';
import type {
  ClubPolicySettings,
  PlayerSquad,
  TrainingDrillLibraryDrill,
  TrainingDrillLibraryLink,
  TrainingSession,
  TrainingSessionPlanAttachment,
} from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminActionPanel,
  AdminRecordList,
  AdminSection,
  AdminSummaryStrip,
  AdminSupportingPanel,
} from '@web/components/admin/admin-workflow';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';
import { discoverTrainingLibraryDrills, type DiscoveredTrainingLibrary } from '@web/lib/training-library-ai';
import { openTrainingSessionPlan } from '@web/lib/training-session-plan';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const trainingWeekdays = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
] as const;

const maxSessionPlanUploadSize = 10 * 1024 * 1024;
type EventListFilter = 'upcoming' | 'all';

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isSessionPlanImage(plan: TrainingSessionPlanAttachment | null) {
  return plan?.type.startsWith('image/') === true;
}

type SessionFormResult =
  | {
      error: string;
    }
  | {
      input: {
        title: string;
        date: string;
        location: string;
        squad: PlayerSquad | null;
        goal: string | null;
        focus: string | null;
        sessionPlan: TrainingSessionPlanAttachment | null;
        runPlan: TrainingSession['runPlan'];
      };
    };

export function TrainingAdminRoute() {
  const { setAttendanceRecords, setTrainingSessions, trainingSessions } = useClubData();
  const [eventListFilter, setEventListFilter] = useState<EventListFilter>('upcoming');
  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);
  const filteredSessions = useMemo(() => {
    if (eventListFilter === 'all') {
      return sessions;
    }

    return sessions.filter((session) => {
      return new Date(session.date).getTime() >= Date.now();
    });
  }, [eventListFilter, sessions]);

  function handleDeleteSession(sessionId: string) {
    setTrainingSessions((current) => {
      return deleteTrainingSession(current, sessionId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForSession(current, sessionId);
    });
  }

  return (
    <AdminPageShell
      actions={
        <div className="inline-actions">
          <Link className="button" to="/admin/training/new">
            Add session
          </Link>
          <Link className="text-link" to="/training">
            Open training attendance
          </Link>
        </div>
      }
      description="Review scheduled sessions, open attendance, or edit the session plan on a dedicated screen."
      title="Training sessions">
      <AdminSection
        eyebrow="Records"
        title="Session schedule"
        description="Keep this list focused on what is scheduled and what still needs planning.">
        <AdminRecordList
          title="Training sessions"
          description="Upcoming sessions are shown by default so coaches can focus on what needs attendance or planning."
          actions={
            <>
            <button
              className={eventListFilter === 'upcoming' ? 'pill-button pill-button--selected' : 'pill-button'}
              onClick={() => setEventListFilter('upcoming')}
              type="button">
              Upcoming
            </button>
            <button
              className={eventListFilter === 'all' ? 'pill-button pill-button--selected' : 'pill-button'}
              onClick={() => setEventListFilter('all')}
              type="button">
              All
            </button>
            <Link className="button button--secondary" to="/admin/training/new">
              Add training session
            </Link>
            </>
          }>

        {filteredSessions.length > 0 ? (
          <div className="training-session-list">
            {filteredSessions.map((session) => {
              const goalLabel = session.goal ?? 'No goal';
              const planLabel = session.sessionPlan
                ? `${session.sessionPlan.name} • ${formatFileSize(session.sessionPlan.size)}`
                : session.detailsLoaded
                  ? 'No session plan uploaded'
                  : 'Open the session to load plan details';
              const isPastSession = new Date(session.date).getTime() < Date.now();

              return (
                <div key={session.id} className="training-session-row">
                  <div className="training-session-row__main">
                    <div className="training-session-row__primary">
                      <strong>{session.title}</strong>
                      <span>{formatDate(session.date)}</span>
                      <span>{session.location}</span>
                    </div>
                    <div className="training-session-row__meta">
                      <span>{goalLabel}</span>
                      <span>{planLabel}</span>
                      {session.sessionPlan ? (
                        <span className="status-pill status-pill--positive">Plan attached</span>
                      ) : !session.detailsLoaded ? (
                        <span className="status-pill status-pill--neutral">Plan not loaded</span>
                      ) : (
                        <span className="status-pill status-pill--neutral">Plan needed</span>
                      )}
                    </div>
                  </div>

                  <div className="training-session-row__actions">
                    {isPastSession ? (
                      <Link className="button button--secondary" to={`/training/${session.id}`}>
                        Review
                      </Link>
                    ) : (
                      <>
                        <Link className="button button--secondary" to={`/admin/training/${session.id}/edit`}>
                          Edit
                        </Link>
                        <button
                          className="button button--danger"
                          onClick={() => {
                            handleDeleteSession(session.id);
                          }}
                          type="button">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <section className="stack-sm">
            <p className="muted">
              {eventListFilter === 'upcoming' ? 'No upcoming training sessions.' : 'No training sessions yet.'}
            </p>
            <Link className="text-link" to="/admin/training/new">
              Create the first session
            </Link>
          </section>
        )}
        </AdminRecordList>
      </AdminSection>
    </AdminPageShell>
  );
}

export function TrainingSettingsRoute() {
  const { setTrainingSessions, trainingSessions } = useClubData();
  const {
    isLoading: isPolicyLoading,
    isSaving: isPolicySaving,
    lastError: policyError,
    policySettings,
    savePolicySettings,
  } = useClubPolicy();
  const [policyDraft, setPolicyDraft] = useState(policySettings);
  const [locationDraft, setLocationDraft] = useState(policySettings.trainingDefaultLocations.join('\n'));
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);

  useEffect(() => {
    setPolicyDraft(policySettings);
    setLocationDraft(policySettings.trainingDefaultLocations.join('\n'));
  }, [policySettings]);

  function updatePolicyDraft<K extends keyof ClubPolicySettings>(key: K, value: ClubPolicySettings[K]) {
    setPolicyDraft((current) => {
      return normalizeClubPolicySettings({
        ...current,
        [key]: value,
      });
    });
    setTrainingMessage(null);
  }

  function toggleTrainingDay(day: number) {
    const nextDays = policyDraft.trainingDefaultDays.includes(day)
      ? policyDraft.trainingDefaultDays.filter((item) => item !== day)
      : [...policyDraft.trainingDefaultDays, day];

    updatePolicyDraft('trainingDefaultDays', nextDays);
  }

  function getPolicyDraftWithLocations() {
    return normalizeClubPolicySettings({
      ...policyDraft,
      trainingDefaultLocations: locationDraft
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  async function saveTrainingSettings() {
    const nextPolicy = getPolicyDraftWithLocations();

    try {
      await savePolicySettings(nextPolicy);
      setPolicyDraft(nextPolicy);
      setLocationDraft(nextPolicy.trainingDefaultLocations.join('\n'));
      setTrainingMessage('Training settings saved.');
    } catch {
      setTrainingMessage(null);
    }
  }

  async function handleSaveTrainingDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveTrainingSettings();
  }

  function handleGenerateTrainingSessions() {
    const nextPolicy = getPolicyDraftWithLocations();
    const generatedSessions = generateTrainingSessionsFromPolicy(trainingSessions, nextPolicy);

    if (generatedSessions.length === 0) {
      setTrainingMessage('No new sessions were needed for the current defaults.');
      return;
    }

    setTrainingSessions((current) => {
      return [...current, ...generatedSessions];
    });
    setTrainingMessage(
      `${generatedSessions.length} ${generatedSessions.length === 1 ? 'session' : 'sessions'} generated.`
    );
  }

  return (
    <AdminPageShell
      actions={
        <div className="inline-actions">
          <Link className="button" to="/admin/training/new">
            Add session
          </Link>
          <Link className="text-link" to="/admin/training">
            Back to sessions
          </Link>
        </div>
      }
      description="Manage the default pattern used to create regular training sessions."
      title="Training settings">
      <AdminSection
        eyebrow="Primary workflow"
        title="Recurring training pattern"
        description="Save the regular training pattern, then generate upcoming sessions without direct data edits.">
        <form onSubmit={handleSaveTrainingDefaults}>
          <AdminActionPanel
            title="Recurring defaults"
            description="Set the title, days, times, location rotation, and generation window for regular training."
            actions={
              <button className="button" disabled={isPolicyLoading || isPolicySaving} type="submit">
                {isPolicySaving ? 'Saving...' : 'Save defaults'}
              </button>
            }>

        <div className="admin-summary-grid">
          <label className="field">
            <span>Session title</span>
            <input
              className="input"
              onChange={(event) => updatePolicyDraft('trainingDefaultTitle', event.target.value)}
              value={policyDraft.trainingDefaultTitle}
            />
          </label>

          <label className="field">
            <span>Start time</span>
            <input
              className="input"
              onChange={(event) => updatePolicyDraft('trainingDefaultTime', event.target.value)}
              placeholder="18:00"
              value={policyDraft.trainingDefaultTime}
            />
          </label>

          <label className="field">
            <span>Field rotation span</span>
            <input
              className="input"
              min="1"
              onChange={(event) => updatePolicyDraft('trainingLocationRotationSpan', event.target.valueAsNumber)}
              type="number"
              value={policyDraft.trainingLocationRotationSpan}
            />
          </label>

          <label className="field">
            <span>Generate weeks</span>
            <input
              className="input"
              min="1"
              onChange={(event) => updatePolicyDraft('trainingGenerationWeeks', event.target.valueAsNumber)}
              type="number"
              value={policyDraft.trainingGenerationWeeks}
            />
          </label>
        </div>

        <label className="field">
          <span>Training days</span>
          <span className="inline-actions">
            {trainingWeekdays.map((day) => {
              const isSelected = policyDraft.trainingDefaultDays.includes(day.value);

              return (
                <button
                  className={
                    isSelected
                      ? 'pill-button pill-button--compact pill-button--positive pill-button--selected'
                      : 'pill-button pill-button--compact'
                  }
                  key={day.value}
                  onClick={() => toggleTrainingDay(day.value)}
                  type="button">
                  {day.label}
                </button>
              );
            })}
          </span>
        </label>

        <label className="field">
          <span>Location rotation</span>
          <textarea
            className="input textarea"
            onChange={(event) => {
              setLocationDraft(event.target.value);
              setTrainingMessage(null);
            }}
            value={locationDraft}
          />
        </label>

        <div className="inline-actions">
          <button className="button button--secondary" onClick={handleGenerateTrainingSessions} type="button">
            Generate sessions
          </button>
          {trainingMessage ? <p className="muted">{trainingMessage}</p> : null}
          {policyError ? <p className="muted">{policyError}</p> : null}
        </div>
          </AdminActionPanel>
        </form>
      </AdminSection>

    </AdminPageShell>
  );
}

type DiscoveredTrainingDrillRow = Omit<TrainingDrillLibraryDrill, 'id'> & {
  duplicate: boolean;
  image: string;
  localId: string;
  selected: boolean;
};

function getLibraryOutcomes(drills: Array<Pick<TrainingDrillLibraryDrill, 'outcomes'>>) {
  return [
    ...new Set(
      drills
        .flatMap((drill) => drill.outcomes)
        .map((outcome) => outcome.trim())
        .filter(Boolean)
    ),
  ];
}

export function TrainingLibraryRoute() {
  const {
    isLoading: isPolicyLoading,
    isSaving: isPolicySaving,
    lastError: policyError,
    policySettings,
    savePolicySettings,
  } = useClubPolicy();
  const [sourceUrl, setSourceUrl] = useState('');
  const [discovery, setDiscovery] = useState<DiscoveredTrainingLibrary | null>(null);
  const [discoveredDrills, setDiscoveredDrills] = useState<DiscoveredTrainingDrillRow[]>([]);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const existingDrills = useMemo(() => {
    return getTrainingDrillLibraryDrills(policySettings.trainingDrillLibraryLinks);
  }, [policySettings.trainingDrillLibraryLinks]);
  const selectedDiscoveredDrills = discoveredDrills.filter((drill) => drill.selected && !drill.duplicate);
  const duplicateDiscoveredDrills = discoveredDrills.filter((drill) => drill.duplicate);

  async function handleDiscoverLibrary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUrl = sourceUrl.trim();

    if (!normalizedUrl) {
      setLibraryMessage('Paste a drill library URL first.');
      return;
    }

    setIsDiscovering(true);
    setLibraryMessage(null);

    try {
      const result = await discoverTrainingLibraryDrills(normalizedUrl);
      const rows = result.drills.map((drill, index) => {
        const duplicate = isDuplicateTrainingDrill(drill, existingDrills);

        return {
          ...drill,
          duplicate,
          localId: `${normalizeTrainingDrillName(drill.name) || 'drill'}-${index}`,
          selected: !duplicate,
        };
      });

      setDiscovery(result);
      setDiscoveredDrills(rows);
      setLibraryMessage(
        `${rows.length} ${rows.length === 1 ? 'drill was' : 'drills were'} discovered.`
      );
    } catch (error) {
      setDiscovery(null);
      setDiscoveredDrills([]);
      setLibraryMessage(error instanceof Error && error.message ? error.message : 'Could not discover drills.');
    } finally {
      setIsDiscovering(false);
    }
  }

  function toggleDiscoveredDrill(localId: string) {
    setDiscoveredDrills((current) => {
      return current.map((drill) => {
        return drill.localId === localId
          ? {
              ...drill,
              selected: !drill.selected,
            }
          : drill;
      });
    });
  }

  function updateDiscoveredDrillName(localId: string, name: string) {
    setDiscoveredDrills((current) => {
      return current.map((drill) => {
        if (drill.localId !== localId) {
          return drill;
        }

        const nextDrill = {
          ...drill,
          name,
        };

        return {
          ...nextDrill,
          duplicate: isDuplicateTrainingDrill(nextDrill, existingDrills),
        };
      });
    });
  }

  async function handleAddSelectedDrills() {
    if (!discovery || selectedDiscoveredDrills.length <= 0) {
      setLibraryMessage('Select at least one new drill to add.');
      return;
    }

    const newDrills: TrainingDrillLibraryDrill[] = selectedDiscoveredDrills.map((drill) => {
      return {
        id: createId('library-drill'),
        name: drill.name,
        lengthMinutes: drill.lengthMinutes,
        link: drill.link,
        skills: drill.skills,
        outcomes: drill.outcomes,
      };
    });
    const nextSource: TrainingDrillLibraryLink = {
      id: createId('drill-library'),
      title: discovery.sourceTitle || discovery.sourceUrl,
      url: discovery.sourceUrl,
      drills: newDrills,
      outcomes: getLibraryOutcomes(newDrills),
    };
    const matchedExistingSource = policySettings.trainingDrillLibraryLinks.find((libraryLink) => {
      return libraryLink.url === discovery.sourceUrl;
    });
    const nextLibraryLinks = matchedExistingSource
      ? policySettings.trainingDrillLibraryLinks.map((libraryLink) => {
          return libraryLink.id === matchedExistingSource.id
            ? {
                ...libraryLink,
                title: libraryLink.title || nextSource.title,
                drills: [...libraryLink.drills, ...newDrills],
                outcomes: getLibraryOutcomes([...libraryLink.drills, ...newDrills]),
              }
            : libraryLink;
        })
      : [...policySettings.trainingDrillLibraryLinks, nextSource];

    try {
      await savePolicySettings(
        normalizeClubPolicySettings({
          ...policySettings,
          trainingDrillLibraryLinks: nextLibraryLinks,
        })
      );
      setDiscovery(null);
      setDiscoveredDrills([]);
      setSourceUrl('');
      setLibraryMessage(
        `${newDrills.length} ${newDrills.length === 1 ? 'drill was' : 'drills were'} added to the library.`
      );
    } catch {
      setLibraryMessage(null);
    }
  }

  async function handleRemoveLibrarySource(libraryLinkId: string) {
    const nextLibraryLinks = policySettings.trainingDrillLibraryLinks.filter((libraryLink) => {
      return libraryLink.id !== libraryLinkId;
    });

    try {
      await savePolicySettings(
        normalizeClubPolicySettings({
          ...policySettings,
          trainingDrillLibraryLinks: nextLibraryLinks,
        })
      );
      setLibraryMessage('Library source removed.');
    } catch {
      setLibraryMessage(null);
    }
  }

  return (
    <AdminPageShell
      actions={
        <div className="inline-actions">
          <Link className="button" to="/admin/training/new">
            Add session
          </Link>
          <Link className="text-link" to="/admin/training/settings">
            Training settings
          </Link>
        </div>
      }
      description="Build the drill source library that generated session plans can draw from."
      title="Training library">
      <AdminSection
        eyebrow="Primary workflow"
        title="Discover drills"
        description="Paste a public drill library URL and review the discovered drills before adding them.">
        <form onSubmit={handleDiscoverLibrary}>
          <AdminActionPanel
            title="Discover from a link"
            description="Found drills are staged for review before they become available to generated plans."
            actions={
              <button className="button" disabled={isDiscovering || isPolicyLoading} type="submit">
                {isDiscovering ? 'Discovering...' : 'Discover drills'}
              </button>
            }>

        <label className="field">
          <span>Library URL</span>
          <input
            className="input"
            onChange={(event) => {
              setSourceUrl(event.target.value);
              setLibraryMessage(null);
            }}
            placeholder="https://example.com/training-drills"
            value={sourceUrl}
          />
        </label>

        {libraryMessage ? <p className="muted">{libraryMessage}</p> : null}
        {policyError ? <p className="muted">{policyError}</p> : null}
          </AdminActionPanel>
        </form>
      </AdminSection>

      {discovery ? (
        <AdminSection
          eyebrow="Review"
          title="Discovered drills"
          description={discovery.summary || discovery.sourceUrl}>
          <AdminSupportingPanel
            title={discovery.sourceTitle}
            description={
              duplicateDiscoveredDrills.length > 0
                ? `${duplicateDiscoveredDrills.length} duplicates were found and left unselected.`
                : 'Review the staged drills before adding them to the library.'
            }
            actions={
              <button
                className="button"
                disabled={selectedDiscoveredDrills.length <= 0 || isPolicySaving}
                onClick={handleAddSelectedDrills}
                type="button">
                {isPolicySaving ? 'Adding...' : `Add ${selectedDiscoveredDrills.length} selected`}
              </button>
            }>

          <div className="training-planner__list">
            {discoveredDrills.map((drill) => {
              return (
                <article className="training-library-drill-row" key={drill.localId}>
                  <label className="training-library-drill-row__check">
                    <input
                      checked={drill.selected}
                      disabled={drill.duplicate}
                      onChange={() => toggleDiscoveredDrill(drill.localId)}
                      type="checkbox"
                    />
                    <span className="sr-only">Select {drill.name}</span>
                  </label>
                  <div className="stack-sm">
                    {drill.image ? (
                      <img
                        alt=""
                        className="training-library-drill-row__image"
                        loading="lazy"
                        src={drill.image}
                      />
                    ) : null}
                    <label className="field">
                      <span>Drill name</span>
                      <input
                        className="input"
                        onChange={(event) => updateDiscoveredDrillName(drill.localId, event.target.value)}
                        value={drill.name}
                      />
                    </label>
                    <span className="muted">
                      {drill.lengthMinutes} min
                      {drill.skills.length > 0 ? ` • Skills: ${drill.skills.join(', ')}` : ''}
                      {drill.outcomes.length > 0 ? ` • ${drill.outcomes.join(', ')}` : ''}
                    </span>
                    <a className="text-link" href={drill.link} rel="noreferrer" target="_blank">
                      Open source
                    </a>
                  </div>
                  {drill.duplicate ? <span className="status-pill status-pill--neutral">Duplicate</span> : null}
                </article>
              );
            })}
          </div>
          </AdminSupportingPanel>
        </AdminSection>
      ) : null}

      <AdminSection
        eyebrow="Records"
        title="Library sources"
        description={`${existingDrills.length} ${existingDrills.length === 1 ? 'drill is' : 'drills are'} available for generated training plans.`}>
        <AdminRecordList title="Saved drill sources" description="Remove sources that should no longer feed generated plans.">

        {policySettings.trainingDrillLibraryLinks.length > 0 ? (
          <div className="training-planner__list">
            {policySettings.trainingDrillLibraryLinks.map((libraryLink) => {
              return (
                <article className="nested-card stack" key={libraryLink.id}>
                  <div className="split-row">
                    <div className="stack-sm">
                      <h4>{libraryLink.title}</h4>
                      <a className="text-link" href={libraryLink.url} rel="noreferrer" target="_blank">
                        Open library source
                      </a>
                      <p className="muted">
                        {libraryLink.drills.length} {libraryLink.drills.length === 1 ? 'drill' : 'drills'}
                      </p>
                    </div>
                    <button
                      className="button button--ghost-danger"
                      disabled={isPolicySaving}
                      onClick={() => handleRemoveLibrarySource(libraryLink.id)}
                      type="button">
                      Remove
                    </button>
                  </div>

                  <div className="training-library-drill-list">
                    {libraryLink.drills.map((drill) => {
                      return (
                        <div className="training-library-drill-list__item" key={drill.id}>
                          <strong>{drill.name}</strong>
                          <span className="muted">
                            {drill.lengthMinutes} min
                            {drill.skills.length > 0 ? ` • Skills: ${drill.skills.join(', ')}` : ''}
                            {drill.outcomes.length > 0 ? ` • ${drill.outcomes.join(', ')}` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">No library sources yet. Generated plans will use the built-in fallback templates.</p>
        )}
        </AdminRecordList>
      </AdminSection>
    </AdminPageShell>
  );
}

export function TrainingSessionFormRoute() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { loadTrainingSessionDetails, setTrainingSessions, trainingSessions } = useClubData();
  const editingSession = sessionId
    ? trainingSessions.find((session) => {
        return session.id === sessionId;
      }) ?? null
    : null;
  const isEditing = Boolean(sessionId);
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [location, setLocation] = useState('');
  const [squad, setSquad] = useState('');
  const [goal, setGoal] = useState('');
  const [focus, setFocus] = useState('');
  const [sessionPlan, setSessionPlan] = useState<TrainingSessionPlanAttachment | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoadingSessionDetails, setIsLoadingSessionDetails] = useState(false);
  const loadedSessionFormKeyRef = useRef<string | null>(null);
  const sessionPlanInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingSession) {
      return;
    }

    const formKey = `${editingSession.id}:${editingSession.detailsLoaded ? 'details' : 'basic'}`;

    if (loadedSessionFormKeyRef.current === formKey) {
      return;
    }

    loadedSessionFormKeyRef.current = formKey;
    const [datePart = '', timePartWithSeconds = '00:00:00'] = editingSession.date.split('T');
    const timePart = timePartWithSeconds.slice(0, 5);

    setTitle(editingSession.title);
    setSessionDate(datePart);
    setSessionTime(timePart);
    setLocation(editingSession.location);
    setSquad(editingSession.squad ?? '');
    setGoal(editingSession.goal ?? '');
    setFocus(editingSession.focus ?? '');
    setSessionPlan(editingSession.sessionPlan);
  }, [editingSession]);

  useEffect(() => {
    if (!editingSession || editingSession.detailsLoaded) {
      return;
    }

    let isMounted = true;
    setIsLoadingSessionDetails(true);
    setFormMessage('Loading existing session plan...');

    loadTrainingSessionDetails(editingSession.id)
      .then(() => {
        if (isMounted) {
          setFormMessage(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFormMessage('Could not load the existing session plan. Try refreshing before saving.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSessionDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [editingSession, loadTrainingSessionDetails]);

  function getSessionInputFromForm(): SessionFormResult {
    const normalizedTitle = title.trim();
    const normalizedDate = sessionDate.trim();
    const normalizedTime = sessionTime.trim();
    const normalizedLocation = location.trim();
    const normalizedSquad = normalizePlayerSquad(squad);
    const normalizedGoal = goal.trim() || null;
    const normalizedFocus = focus.trim() || null;

    if (!normalizedTitle) {
      return { error: 'Enter a session title.' };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return { error: 'Enter the date as YYYY-MM-DD.' };
    }

    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      return { error: 'Enter the start time as HH:MM.' };
    }

    if (!normalizedLocation) {
      return { error: 'Enter a location.' };
    }

    const sessionTimestamp = `${normalizedDate}T${normalizedTime}:00`;

    if (Number.isNaN(new Date(sessionTimestamp).getTime())) {
      return { error: 'Enter a valid date and time.' };
    }

    return {
      input: {
        title: normalizedTitle,
        date: sessionTimestamp,
        location: normalizedLocation,
        squad: normalizedSquad,
        goal: normalizedGoal,
        focus: normalizedFocus,
        sessionPlan,
        runPlan: editingSession?.runPlan ?? [],
      },
    };
  }

  function handleSaveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEditing && editingSession && !editingSession.detailsLoaded) {
      setFormMessage('Training session details are still loading. Try again in a moment.');
      return;
    }

    const result = getSessionInputFromForm();

    if ('error' in result) {
      setFormMessage(result.error);
      return;
    }

    setTrainingSessions((current) => {
      if (editingSession) {
        return updateTrainingSession(current, editingSession.id, result.input);
      }

      return addTrainingSession(current, result.input);
    });
    navigate('/admin/training');
  }

  function handleSessionPlanUpload(file: File | null) {
    if (!file) {
      return;
    }

    const allowedTypes = ['application/pdf'];
    const isAllowedFile = allowedTypes.includes(file.type) || file.type.startsWith('image/');

    if (!isAllowedFile) {
      setFormMessage('Upload a PDF or image file for the session plan.');
      return;
    }

    if (file.size > maxSessionPlanUploadSize) {
      setFormMessage(`Keep the session plan under ${formatFileSize(maxSessionPlanUploadSize)} for now.`);
      return;
    }

    setFormMessage(`Reading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFormMessage('Could not read that session plan file.');
        return;
      }

      setSessionPlan({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      });
      setFormMessage('Session plan uploaded.');
    };
    reader.onerror = () => {
      setFormMessage('Could not read that session plan file.');
    };
    reader.readAsDataURL(file);
  }

  if (isEditing && !editingSession) {
    return (
      <AdminPageShell
        actions={
          <Link className="text-link" to="/admin/training">
            Back to training sessions
          </Link>
        }
        description="The selected training session could not be found."
        title="Training session not found">
        <AdminRecordList title="Session not found" description="Choose another session from the training list." />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      actions={
        <Link className="text-link" to="/admin/training">
          Back to training sessions
        </Link>
      }
      description="Set the session details and upload the session plan on a dedicated screen."
      title={isEditing ? 'Edit training session' : 'Add training session'}>
      <AdminSection
        eyebrow="Primary workflow"
        title={isEditing ? 'Update session details' : 'Create session details'}
        description="Set the session basics, then attach the plan for the leadership group.">
        <AdminSummaryStrip
          items={[
            {
              label: 'Plan files',
              value: sessionPlan ? '1' : '0',
              note: isLoadingSessionDetails ? 'loading' : sessionPlan ? 'attached' : 'none yet',
            },
            {
              label: 'Upload size',
              value: sessionPlan ? formatFileSize(sessionPlan.size) : '-',
              note: isLoadingSessionDetails ? 'loading plan' : 'current plan',
            },
          ]}
        />
        <form onSubmit={handleSaveSession}>
          <AdminActionPanel title={isEditing ? 'Session details' : 'New session details'}>

        <label className="field">
          <span>Session title</span>
          <input
            className="input"
            onChange={(event) => {
              setTitle(event.target.value);
              setFormMessage(null);
            }}
            placeholder="Main training"
            value={title}
          />
        </label>

        <div className="two-column">
          <label className="field">
            <span>Date</span>
            <input
              className="input"
              onChange={(event) => {
                setSessionDate(event.target.value);
                setFormMessage(null);
              }}
              placeholder="YYYY-MM-DD"
              value={sessionDate}
            />
          </label>

          <label className="field">
            <span>Start time</span>
            <input
              className="input"
              onChange={(event) => {
                setSessionTime(event.target.value);
                setFormMessage(null);
              }}
              placeholder="HH:MM"
              value={sessionTime}
            />
          </label>
        </div>

        <label className="field">
          <span>Location</span>
          <input
            className="input"
            onChange={(event) => {
              setLocation(event.target.value);
              setFormMessage(null);
            }}
            placeholder="Feighan Oval, Warners Bay"
            value={location}
          />
        </label>

        <label className="field">
          <span>Squad access</span>
          <select
            className="input"
            onChange={(event) => {
              setSquad(event.target.value);
              setFormMessage(null);
            }}
            value={squad}>
            <option value="">All squads</option>
            <option value="cup">{getPlayerSquadLabel('cup')}</option>
            <option value="plate">{getPlayerSquadLabel('plate')}</option>
          </select>
        </label>

        <label className="field">
          <span>Session goal</span>
          <input
            className="input"
            onChange={(event) => {
              setGoal(event.target.value);
              setFormMessage(null);
            }}
            placeholder="One short outcome for the night"
            value={goal}
          />
        </label>

        <label className="field">
          <span>Session focus</span>
          <textarea
            className="input textarea"
            onChange={(event) => {
              setFocus(event.target.value);
              setFormMessage(null);
            }}
            placeholder="What do we want the group to leave better at tonight?"
            value={focus}
          />
        </label>

        <section className="training-session-plan-upload stack">
          <div className="split-row training-planner__header">
            <div className="stack-sm">
              <h4>Session plan</h4>
              <p className="muted">Upload the PDF or image that coaches and leaders should use to run the night.</p>
            </div>
          </div>

          <label className="session-plan-dropzone">
            <input
              accept="application/pdf,image/*"
              disabled={isEditing && !editingSession?.detailsLoaded}
              onChange={(event) => {
                handleSessionPlanUpload(event.target.files?.[0] ?? null);
              }}
              ref={sessionPlanInputRef}
              type="file"
            />
            <span className="session-plan-dropzone__title">
              {sessionPlan ? 'Replace session plan' : 'Upload session plan'}
            </span>
            <span className="muted">PDF, PNG, or JPG up to {formatFileSize(maxSessionPlanUploadSize)}</span>
          </label>

          {sessionPlan ? (
            <article className="session-plan-preview">
              {isSessionPlanImage(sessionPlan) ? (
                <img alt="" className="session-plan-preview__image" src={sessionPlan.dataUrl} />
              ) : (
                <div className="session-plan-preview__file">PDF</div>
              )}
              <div className="stack-sm">
                <strong>{sessionPlan.name}</strong>
                <p className="muted">
                  {sessionPlan.type || 'File'} • {formatFileSize(sessionPlan.size)}
                </p>
                <div className="inline-actions">
                  <button
                    className="text-link"
                    onClick={() => {
                      if (!openTrainingSessionPlan(sessionPlan)) {
                        setFormMessage('Could not open the session plan. Try downloading or re-uploading it.');
                      }
                    }}
                    type="button">
                    Open plan
                  </button>
                  <button
                    className="text-link"
                    onClick={() => {
                      setSessionPlan(null);
                      if (sessionPlanInputRef.current) {
                        sessionPlanInputRef.current.value = '';
                      }
                      setFormMessage('Session plan removed.');
                    }}
                    type="button">
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <p className="muted">
              {isLoadingSessionDetails ? 'Loading existing session plan...' : 'No session plan uploaded yet.'}
            </p>
          )}
        </section>

        <div className="inline-actions">
          <button className="button" type="submit">
            {isEditing ? 'Save changes' : 'Save session'}
          </button>
          <Link className="button button--secondary" to="/admin/training">
            Cancel
          </Link>
          {formMessage ? <p className="muted">{formMessage}</p> : null}
        </div>
          </AdminActionPanel>
        </form>
      </AdminSection>
    </AdminPageShell>
  );
}
