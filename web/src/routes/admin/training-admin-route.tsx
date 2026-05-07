import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  addTrainingSession,
  deleteAttendanceRecordsForSession,
  deleteTrainingSession,
  getSortedTrainingSessions,
  getTrainingRunPlanDuration,
  getTrainingSessionMediaCoverage,
  hasTrainingDrillMedia,
  updateTrainingSession,
} from '@/lib/attendance';
import { getPlayerSquadLabel, normalizePlayerSquad } from '@/lib/team';
import { resolveTrainingSessionStructure } from '@/lib/training-session-suggestions';
import type {
  PlayerSquad,
  TrainingSession,
  TrainingSessionDrill,
  TrainingSessionDrillMedia,
} from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { TrainingDrillEditor } from '@web/components/training/training-drill-editor';
import { useClubData } from '@web/lib/club-data-context';

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

function createEmptyMedia(type: TrainingSessionDrillMedia['type']): TrainingSessionDrillMedia {
  return {
    id: createId(`training-media-${type}`),
    type,
    url: '',
    caption: null,
  };
}

function createEmptyDrill(): TrainingSessionDrill {
  return {
    id: createId('training-drill'),
    title: '',
    durationMinutes: null,
    description: null,
    coachingPoints: null,
    media: [],
  };
}

function cloneRunPlan(runPlan: TrainingSessionDrill[]) {
  return runPlan.map((drill) => {
    return {
      ...drill,
      media: drill.media.map((media) => {
        return { ...media };
      }),
    };
  });
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
        focus: string | null;
        runPlan: TrainingSessionDrill[];
      };
    };

export function TrainingAdminRoute() {
  const { setAttendanceRecords, setTrainingSessions, trainingSessions } = useClubData();
  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);

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
      <section className="card stack">
        <div className="split-row">
          <div className="stack-sm">
            <h3>Session list</h3>
            <p className="muted">Keep this list focused on what is scheduled and what still needs planning.</p>
          </div>
          <Link className="button button--secondary" to="/admin/training/new">
            Add training session
          </Link>
        </div>

        {sessions.length > 0 ? (
          sessions.map((session) => {
            const resolvedStructure = resolveTrainingSessionStructure(session, sessions);
            const displaySession = {
              ...session,
              focus: resolvedStructure.focus,
              runPlan: resolvedStructure.runPlan,
            };
            const plannedMinutes = getTrainingRunPlanDuration(displaySession);
            const mediaCoverage = getTrainingSessionMediaCoverage(displaySession);

            return (
              <div key={session.id} className="row-card">
                <div className="stack-sm">
                  <strong>{session.title}</strong>
                  <span className="muted">{formatDate(session.date)}</span>
                  <span className="muted">{session.location}</span>
                  <span className="muted">{displaySession.focus}</span>
                  <span className="muted">
                    {displaySession.runPlan.length}{' '}
                    {displaySession.runPlan.length === 1 ? 'drill' : 'drills'}
                    {plannedMinutes > 0 ? ` • ${plannedMinutes} min planned` : ''}
                    {displaySession.runPlan.length > 0
                      ? ` • ${mediaCoverage.drillsWithMedia}/${mediaCoverage.totalDrills} with visuals`
                      : ''}
                  </span>
                  {mediaCoverage.missingMedia > 0 ? (
                    <span className="status-pill status-pill--negative">
                      {mediaCoverage.missingMedia} {mediaCoverage.missingMedia === 1 ? 'drill needs' : 'drills need'} media
                    </span>
                  ) : displaySession.runPlan.length > 0 ? (
                    <span className="status-pill status-pill--positive">Leadership ready</span>
                  ) : null}
                </div>

                <div className="inline-actions">
                  <Link className="button button--secondary" to={`/admin/training/${session.id}/edit`}>
                    Edit session
                  </Link>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      handleDeleteSession(session.id);
                    }}
                    type="button">
                    Delete session
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <section className="stack-sm">
            <p className="muted">No training sessions yet.</p>
            <Link className="text-link" to="/admin/training/new">
              Create the first session
            </Link>
          </section>
        )}
      </section>
    </AdminPageShell>
  );
}

export function TrainingSessionFormRoute() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { setTrainingSessions, trainingSessions } = useClubData();
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
  const [focus, setFocus] = useState('');
  const [runPlan, setRunPlan] = useState<TrainingSessionDrill[]>([]);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingSession) {
      return;
    }

    const resolvedStructure = resolveTrainingSessionStructure(editingSession, trainingSessions);
    const [datePart = '', timePartWithSeconds = '00:00:00'] = editingSession.date.split('T');
    const timePart = timePartWithSeconds.slice(0, 5);

    setTitle(editingSession.title);
    setSessionDate(datePart);
    setSessionTime(timePart);
    setLocation(editingSession.location);
    setSquad(editingSession.squad ?? '');
    setFocus(resolvedStructure.focus === 'No session focus has been added yet.' ? '' : resolvedStructure.focus);
    setRunPlan(cloneRunPlan(resolvedStructure.runPlan));
  }, [editingSession, trainingSessions]);

  function getSessionInputFromForm(): SessionFormResult {
    const normalizedTitle = title.trim();
    const normalizedDate = sessionDate.trim();
    const normalizedTime = sessionTime.trim();
    const normalizedLocation = location.trim();
    const normalizedSquad = normalizePlayerSquad(squad);
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

    const drillMissingMediaIndex = runPlan.findIndex((drill) => {
      return !hasTrainingDrillMedia(drill);
    });

    if (drillMissingMediaIndex >= 0) {
      return {
        error: `Add at least one image or video URL to Drill ${drillMissingMediaIndex + 1} before saving.`,
      };
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
        focus: normalizedFocus,
        runPlan,
      },
    };
  }

  function handleSaveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  function updateRunPlanDrill(drillId: string, nextDrill: TrainingSessionDrill) {
    setRunPlan((current) => {
      return current.map((drill) => {
        return drill.id === drillId ? nextDrill : drill;
      });
    });
  }

  function updateRunPlanMedia(
    drillId: string,
    mediaId: string,
    patch: Partial<Pick<TrainingSessionDrillMedia, 'caption' | 'type' | 'url'>>
  ) {
    setRunPlan((current) => {
      return current.map((drill) => {
        if (drill.id !== drillId) {
          return drill;
        }

        return {
          ...drill,
          media: drill.media.map((media) => {
            return media.id === mediaId
              ? {
                  ...media,
                  ...patch,
                }
              : media;
          }),
        };
      });
    });
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
        <section className="card stack">
          <h3>Session not found</h3>
          <p className="muted">Choose another session from the training list.</p>
        </section>
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
      description="Set the session details and plan drills on a dedicated screen."
      title={isEditing ? 'Edit training session' : 'Add training session'}>
      <form className="card stack" onSubmit={handleSaveSession}>
        <div className="training-form-hero">
          <div className="stack-sm">
            <h3>{isEditing ? 'Session details' : 'New session details'}</h3>
            <p className="muted">
              Set the session basics, then add drills with visual references when the plan is ready.
            </p>
          </div>

          <div className="training-form-hero__metrics">
            <span>
              <strong>{runPlan.length}</strong>
              {runPlan.length === 1 ? ' drill' : ' drills'}
            </span>
            <span>
              <strong>
                {
                  runPlan.filter((drill) => {
                    return hasTrainingDrillMedia(drill);
                  }).length
                }
              </strong>
              with visuals
            </span>
          </div>
        </div>

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

        <section className="training-planner stack">
          <div className="split-row training-planner__header">
            <div className="stack-sm">
              <h4>Run plan</h4>
              <p className="muted">Add drills once the session is planned comprehensively.</p>
            </div>

            <button
              className="button button--secondary"
              onClick={() => {
                setRunPlan((current) => {
                  return [...current, createEmptyDrill()];
                });
                setFormMessage(null);
              }}
              type="button">
              Add drill
            </button>
          </div>

          {runPlan.length > 0 ? (
            <div className="training-planner__list">
              {runPlan.map((drill, index) => {
                return (
                  <TrainingDrillEditor
                    drill={drill}
                    index={index}
                    key={drill.id}
                    onAddMedia={(type) => {
                      updateRunPlanDrill(drill.id, {
                        ...drill,
                        media: [...drill.media, createEmptyMedia(type)],
                      });
                    }}
                    onChange={(nextDrill) => {
                      updateRunPlanDrill(drill.id, nextDrill);
                    }}
                    onRemove={() => {
                      setRunPlan((current) => {
                        return current.filter((item) => {
                          return item.id !== drill.id;
                        });
                      });
                    }}
                    onRemoveMedia={(mediaId) => {
                      updateRunPlanDrill(drill.id, {
                        ...drill,
                        media: drill.media.filter((media) => {
                          return media.id !== mediaId;
                        }),
                      });
                    }}
                    onUpdateMedia={(mediaId, patch) => {
                      updateRunPlanMedia(drill.id, mediaId, patch);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p className="muted">No drills added yet.</p>
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
      </form>
    </AdminPageShell>
  );
}
