import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  addTrainingSession,
  deleteAttendanceRecordsForSession,
  deleteTrainingSession,
  getSortedTrainingSessions,
} from '@/lib/attendance';

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

export function TrainingAdminRoute() {
  const { setAttendanceRecords, setTrainingSessions, trainingSessions } = useClubData();
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [location, setLocation] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);

  function handleAddSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDate = sessionDate.trim();
    const normalizedTime = sessionTime.trim();
    const normalizedLocation = location.trim();

    if (!normalizedTitle) {
      setFormMessage('Enter a session title.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      setFormMessage('Enter the date as YYYY-MM-DD.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      setFormMessage('Enter the start time as HH:MM.');
      return;
    }

    if (!normalizedLocation) {
      setFormMessage('Enter a location.');
      return;
    }

    const sessionTimestamp = `${normalizedDate}T${normalizedTime}:00`;

    if (Number.isNaN(new Date(sessionTimestamp).getTime())) {
      setFormMessage('Enter a valid date and time.');
      return;
    }

    setTrainingSessions((current) => {
      return addTrainingSession(current, {
        title: normalizedTitle,
        date: sessionTimestamp,
        location: normalizedLocation,
      });
    });
    setTitle('');
    setSessionDate('');
    setSessionTime('');
    setLocation('');
    setFormMessage('Training session added.');
  }

  function handleDeleteSession(sessionId: string) {
    setTrainingSessions((current) => {
      return deleteTrainingSession(current, sessionId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForSession(current, sessionId);
    });
    setFormMessage('Training session deleted.');
  }

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Admin</span>
        <h2>Training setup</h2>
        <p className="muted">
          Create new training sessions for the group, then manage attendance from the training tab.
        </p>
        <Link className="text-link" to="/training">
          Open training attendance
        </Link>
      </section>

      <form className="card stack" onSubmit={handleAddSession}>
        <h3>Add training session</h3>
        <p className="muted">Set the title, date, time, and location for the next session.</p>

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
            placeholder="Club oval"
            value={location}
          />
        </label>

        <div className="inline-actions">
          <button className="button" type="submit">
            Save session
          </button>
          {formMessage ? <p className="muted">{formMessage}</p> : null}
        </div>
      </form>

      <section className="card stack">
        <h3>Upcoming sessions</h3>
        {sessions.length > 0 ? (
          sessions.map((session) => {
            return (
              <div key={session.id} className="row-card">
                <div className="stack-sm">
                  <strong>{session.title}</strong>
                  <span className="muted">{formatDate(session.date)}</span>
                  <span className="muted">{session.location}</span>
                </div>
                <button
                  className="button button--danger"
                  onClick={() => {
                    handleDeleteSession(session.id);
                  }}
                  type="button">
                  Delete session
                </button>
              </div>
            );
          })
        ) : (
          <p className="muted">No training sessions yet.</p>
        )}
      </section>
    </section>
  );
}
