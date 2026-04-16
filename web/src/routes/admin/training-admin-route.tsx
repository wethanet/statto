import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  addTrainingSession,
  deleteAttendanceRecordsForSession,
  deleteTrainingSession,
  getSortedTrainingSessions,
  getTrainingRunPlanDuration,
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
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [location, setLocation] = useState('');
  const [squad, setSquad] = useState('');
  const [focus, setFocus] = useState('');
  const [runPlan, setRunPlan] = useState<TrainingSessionDrill[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);

  function resetSessionForm() {
    setTitle('');
    setSessionDate('');
    setSessionTime('');
    setLocation('');
    setSquad('');
    setFocus('');
    setRunPlan([]);
    setEditingSessionId(null);
  }

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
      if (editingSessionId) {
        return updateTrainingSession(current, editingSessionId, result.input);
      }

      return addTrainingSession(current, result.input);
    });

    const wasEditing = Boolean(editingSessionId);
    resetSessionForm();
    setFormMessage(wasEditing ? 'Training session updated.' : 'Training session added.');
  }

  function handleEditSession(session: TrainingSession) {
    const resolvedStructure = resolveTrainingSessionStructure(session, trainingSessions);
    const [datePart = '', timePartWithSeconds = '00:00:00'] = session.date.split('T');
    const timePart = timePartWithSeconds.slice(0, 5);

    setEditingSessionId(session.id);
    setTitle(session.title);
    setSessionDate(datePart);
    setSessionTime(timePart);
    setLocation(session.location);
    setSquad(session.squad ?? '');
    setFocus(resolvedStructure.focus);
    setRunPlan(cloneRunPlan(resolvedStructure.runPlan));
    setFormMessage(
      resolvedStructure.isSuggested
        ? `Loaded the suggested session plan for ${session.title}.`
        : `Editing ${session.title}.`
    );
  }

  function handleDeleteSession(sessionId: string) {
    setTrainingSessions((current) => {
      return deleteTrainingSession(current, sessionId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForSession(current, sessionId);
    });
    if (editingSessionId === sessionId) {
      resetSessionForm();
    }
    setFormMessage('Training session deleted.');
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

  return (
    <AdminPageShell
      actions={
        <Link className="text-link" to="/training">
          Open training attendance
        </Link>
      }
      description="Create sessions, add the focus for the night, and build a drill-by-drill run plan with images or videos."
      title="Training setup">
      <form className="card stack" onSubmit={handleSaveSession}>
        <h3>{editingSessionId ? 'Edit training session' : 'Add training session'}</h3>
        <p className="muted">
          {editingSessionId
            ? 'Update the training details and session structure, then save the changes.'
            : 'Set the title, date, time, location, and the drill flow for the session.'}
        </p>

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
              <p className="muted">Capture the drill order, timing, and support media for coaches and players.</p>
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
            <p className="muted">No drills added yet. Add a drill to build the run plan for the session.</p>
          )}
        </section>

        <div className="inline-actions">
          <button className="button" type="submit">
            {editingSessionId ? 'Save changes' : 'Save session'}
          </button>
          {editingSessionId ? (
            <button
              className="button button--secondary"
              onClick={() => {
                resetSessionForm();
                setFormMessage('Edit cancelled.');
              }}
              type="button">
              Cancel edit
            </button>
          ) : null}
          {formMessage ? <p className="muted">{formMessage}</p> : null}
        </div>
      </form>

      <section className="card stack">
        <h3>Upcoming sessions</h3>
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const resolvedStructure = resolveTrainingSessionStructure(session, sessions);
            const displaySession = {
              ...session,
              focus: resolvedStructure.focus,
              runPlan: resolvedStructure.runPlan,
            };
            const plannedMinutes = getTrainingRunPlanDuration(displaySession);

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
                    {resolvedStructure.isSuggested ? ' • suggested from coaching guidance' : ''}
                  </span>
                </div>

                <div className="inline-actions">
                  <button
                    className="button button--secondary"
                    onClick={() => {
                      handleEditSession(session);
                    }}
                    type="button">
                    Edit session
                  </button>
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
          <p className="muted">No training sessions yet.</p>
        )}
      </section>
    </AdminPageShell>
  );
}
