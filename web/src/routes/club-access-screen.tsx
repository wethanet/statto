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
      <section className="panel stack-lg">
        <div>
          <span className="eyebrow">Club access</span>
          <h1>Choose your club workspace</h1>
          <p className="muted">
            Create a club for your team or join an existing club so managers can work from the same
            synced data.
          </p>
        </div>

        <div className="two-column">
          <form className="card stack" onSubmit={handleCreateClub}>
            <h2>Create a club</h2>
            <label className="field">
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

          <form className="card stack" onSubmit={handleJoinClub}>
            <h2>Join a club</h2>
            <label className="field">
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

        <section className="card stack">
          <h2>Your clubs</h2>
          {clubs.length > 0 ? (
            clubs.map((club) => {
              const isActive = club.id === activeClubId;
              const isEditing = club.id === editingClubId;

              return (
                <section
                  key={club.id}
                  className={isActive ? 'club-row club-row--active' : 'club-row'}>
                  {isEditing ? (
                    <form className="stack-sm" onSubmit={handleRenameClub}>
                      <label className="field">
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
                      <strong>{club.name}</strong>
                      <span>
                        {club.role} • Invite code {club.inviteCode}
                      </span>
                      <span className="muted">{isActive ? 'Active club' : 'Click to switch'}</span>
                      <div className="inline-actions">
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
            })
          ) : (
            <p className="muted">No clubs yet. Create one or join with an invite code.</p>
          )}
        </section>

        {message ? <p className="muted">{message}</p> : null}
      </section>
    </main>
  );
}
