import { getPlayerDisplayName, getPlayerRoleLabel } from '@/lib/team';
import { type FormEvent, useState } from 'react';
import type { Player } from '@/lib/types';

type TeamPlayerRowProps = {
  player: Player;
  onToggleActive: () => void;
  onCycleRole: () => void;
  onDelete: () => void;
  onSaveDetails: (input: { number: string; position: string }) => string | null;
};

export function TeamPlayerRow({
  player,
  onToggleActive,
  onCycleRole,
  onDelete,
  onSaveDetails,
}: TeamPlayerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [number, setNumber] = useState(player.number?.toString() ?? '');
  const [position, setPosition] = useState(player.position ?? '');
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextMessage = onSaveDetails({ number, position });

    if (nextMessage) {
      setMessage(nextMessage);
      return;
    }

    setMessage('Player details updated.');
    setIsEditing(false);
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div className="stack-sm">
          <h3>{getPlayerDisplayName(player)}</h3>
          <p className="muted">
            {player.position ? `${player.position} • ` : ''}
            {getPlayerRoleLabel(player.role)}
          </p>
        </div>
        <span className={player.active ? 'metric metric--positive' : 'metric metric--negative'}>
          {player.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {isEditing ? (
        <form className="stack-sm" onSubmit={handleSubmit}>
          <div className="two-column">
            <label className="field">
              <span>Guernsey number</span>
              <input
                className="input"
                inputMode="numeric"
                onChange={(event) => {
                  setNumber(event.target.value);
                  setMessage(null);
                }}
                value={number}
              />
            </label>
            <label className="field">
              <span>Position</span>
              <input
                className="input"
                onChange={(event) => {
                  setPosition(event.target.value);
                  setMessage(null);
                }}
                value={position}
              />
            </label>
          </div>

          <div className="inline-actions">
            <button className="button" type="submit">
              Save details
            </button>
            <button
              className="button button--ghost"
              onClick={() => {
                setNumber(player.number?.toString() ?? '');
                setPosition(player.position ?? '');
                setMessage(null);
                setIsEditing(false);
              }}
              type="button">
              Cancel
            </button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : null}

      <div className="inline-actions">
        <button
          className={player.active ? 'button button--secondary' : 'button'}
          onClick={onToggleActive}
          type="button">
          {player.active ? 'Set inactive' : 'Set active'}
        </button>
        <button className="button button--secondary" onClick={onCycleRole} type="button">
          Cycle role
        </button>
        <button
          className="button button--secondary"
          onClick={() => {
            setNumber(player.number?.toString() ?? '');
            setPosition(player.position ?? '');
            setMessage(null);
            setIsEditing((current) => !current);
          }}
          type="button">
          {isEditing ? 'Close edit' : 'Edit details'}
        </button>
        <button className="button button--danger" onClick={onDelete} type="button">
          Delete player
        </button>
      </div>
    </section>
  );
}
