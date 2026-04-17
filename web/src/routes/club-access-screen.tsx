import { type FormEvent, useState } from 'react';

import { useClubAccess } from '@web/lib/club-access-context';

export function ClubAccessScreen() {
  const { activeClubId, clubs, createClub, joinClub, renameClub, setActiveClubId } =
    useClubAccess();
  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [editingClubName, setEditingClubName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const nextMessage = await createClub(clubName);
      setMessage(nextMessage ?? null);

      if (!nextMessage) {
        setClubName('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRenameClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClubId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const nextMessage = await renameClub(editingClubId, editingClubName);

      if (nextMessage) {
        setMessage(nextMessage);
        return;
      }

      setEditingClubId(null);
      setEditingClubName('');
      setMessage('Club name updated.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const nextMessage = await joinClub(inviteCode);
      setMessage(nextMessage ?? null);

      if (!nextMessage) {
        setInviteCode('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="gate-shell">
      <section className="panel stack-lg club-access-shell">
        <div className="club-access-shell__intro">
          <span className="eyebrow">Club access</span>
          <h1>Choose your club workspace</h1>
          <p className="club-access-shell__lede">
            Create a club for your team or join an existing club so managers can work from the same
            synced data. If an admin has already assigned your email to a player or coach role,
            join with the club code and that access will be applied automatically.
          </p>
        </div>

        <div className="two-column club-access-shell__actions">
          <form className="card stack club-access-card" onSubmit={handleCreateClub}>
            <div className="club-access-card__header">
              <span className="club-access-card__eyebrow">Start fresh</span>
              <h2>Create a club</h2>
              <p className="club-access-card__description">
                Set up a new workspace for your team and invite coaches and players after it is created.
              </p>
            </div>
            <label className="field club-access-card__field">
              <span>Club name</span>
              <input
                className="input"
                onChange={(event) => {
                  setClubName(event.target.value);
                  setMessage(null);
                }}
                placeholder="Northside Seniors"
                value={clubName}
              />
            </label>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Working...' : 'Create club'}
            </button>
          </form>

          <form className="card stack club-access-card" onSubmit={handleJoinClub}>
            <div className="club-access-card__header">
              <span className="club-access-card__eyebrow">Use an invite</span>
              <h2>Join a club</h2>
              <p className="club-access-card__description">
                Enter the club code. If your email already has an invite, your role and linked player profile
                will be applied automatically.
              </p>
            </div>
            <label className="field club-access-card__field">
              <span>Invite code</span>
              <input
                className="input"
                onChange={(event) => {
                  setInviteCode(event.target.value.toUpperCase());
                  setMessage(null);
                }}
                placeholder="ABC123"
                value={inviteCode}
              />
            </label>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Working...' : 'Join club'}
            </button>
          </form>
        </div>

        <section className="card stack club-access-list">
          <div className="club-access-list__header">
            <div className="stack-sm">
              <span className="club-access-card__eyebrow">Workspace list</span>
              <h2>Your clubs</h2>
            </div>
            <p className="club-access-list__description">
              Switch between clubs, confirm which one is active, or tidy up the club name.
            </p>
          </div>
          {clubs.length > 0 ? (
            <div className="club-access-list__rows">
              {clubs.map((club) => {
                const isActive = club.id === activeClubId;
                const isEditing = club.id === editingClubId;

                return (
                  <section
                    key={club.id}
                    className={
                      isActive ? 'club-row club-row--active club-access-list__row' : 'club-row club-access-list__row'
                    }>
                    {isEditing ? (
                      <form className="stack-sm" onSubmit={handleRenameClub}>
                        <label className="field club-access-card__field">
                          <span>Club name</span>
                          <input
                            className="input"
                            onChange={(event) => {
                              setEditingClubName(event.target.value);
                              setMessage(null);
                            }}
                            value={editingClubName}
                          />
                        </label>
                        <div className="inline-actions">
                          <button className="button" disabled={isSubmitting} type="submit">
                            {isSubmitting ? 'Saving...' : 'Save name'}
                          </button>
                          <button
                            className="button button--ghost"
                            disabled={isSubmitting}
                            onClick={() => {
                              setEditingClubId(null);
                              setEditingClubName('');
                              setMessage(null);
                            }}
                            type="button">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="club-access-list__row-main">
                          <div className="club-access-list__identity">
                            <strong className="club-access-list__name">{club.name}</strong>
                            <span className="club-access-list__meta">
                              {club.role} • Invite code {club.inviteCode}
                            </span>
                          </div>
                          <span className={isActive ? 'status-pill status-pill--positive' : 'club-access-list__status'}>
                            {isActive ? 'Active club' : 'Available to switch'}
                          </span>
                        </div>
                        <div className="inline-actions club-access-list__actions">
                          <button
                            className="button button--ghost"
                            onClick={() => {
                              setActiveClubId(club.id).catch((error: unknown) => {
                                console.warn('Failed to switch clubs', error);
                              });
                            }}
                            type="button">
                            {isActive ? 'Active' : 'Switch club'}
                          </button>
                          <button
                            className="button button--ghost"
                            onClick={() => {
                              setEditingClubId(club.id);
                              setEditingClubName(club.name);
                              setMessage(null);
                            }}
                            type="button">
                            Edit name
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="club-access-list__empty">No clubs yet. Create one or join with an invite code.</p>
          )}
        </section>

        {message ? <p className="club-access-shell__message">{message}</p> : null}
      </section>
    </main>
  );
}
