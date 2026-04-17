import {
  getPlayerDisplayName,
  getPlayerPositionLabel,
  getPlayerRoleLabel,
  getPlayerRotationGroupLabel,
  getPlayerRunningProfileLabel,
  getPlayerSquadLabel,
} from '@/lib/team';
import { type FormEvent, useState } from 'react';
import type { Player, PlayerPositionProfile, PlayerRotationGroup, PlayerRunningProfile } from '@/lib/types';

const playerPositionOptions: Array<PlayerPositionProfile | ''> = ['', 'B', 'HB', 'W', 'C', 'HF', 'F', 'Fol'];
const runningProfileOptions: Array<PlayerRunningProfile | ''> = ['', 'high', 'balanced', 'managed'];
const rotationGroupOptions: PlayerRotationGroup[] = [
  'inside-mids',
  'running-players',
  'key-position-players',
  'utility-players',
];

type TeamPlayerSaveInput = {
  name: string;
  nickname: string;
  number: string;
  squad: string;
  primaryPosition: string;
  secondaryPosition: string;
  runningProfile: string;
  rotationGroupOverrides: PlayerRotationGroup[] | null;
};

type TeamPlayerRowProps = {
  player: Player;
  onToggleActive: () => void;
  onCycleRole: () => void;
  onDelete: () => void;
  onSaveDetails: (input: TeamPlayerSaveInput) => Promise<string | null>;
  rotationSummary: string;
  rotationSource: 'generated' | 'manual';
};

export function TeamPlayerRow({
  player,
  onToggleActive,
  onCycleRole,
  onDelete,
  onSaveDetails,
  rotationSummary,
  rotationSource,
}: TeamPlayerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [nickname, setNickname] = useState(player.nickname ?? '');
  const [number, setNumber] = useState(player.number?.toString() ?? '');
  const [squad, setSquad] = useState(player.squad ?? '');
  const [primaryPosition, setPrimaryPosition] = useState(player.primaryPosition ?? '');
  const [secondaryPosition, setSecondaryPosition] = useState(player.secondaryPosition ?? '');
  const [runningProfile, setRunningProfile] = useState(player.runningProfile ?? '');
  const [useGeneratedGroups, setUseGeneratedGroups] = useState(player.rotationGroupOverrides == null);
  const [manualGroups, setManualGroups] = useState<PlayerRotationGroup[]>(player.rotationGroupOverrides ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const nextMessage = await onSaveDetails({
      name,
      nickname,
      number,
      squad,
      primaryPosition,
      secondaryPosition,
      runningProfile,
      rotationGroupOverrides: useGeneratedGroups ? null : manualGroups,
    });

    setIsSaving(false);

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
          {player.nickname ? <p className="muted">Nickname: {player.nickname}</p> : null}
          <p className="muted">{getPlayerRoleLabel(player.role)} • {getPlayerSquadLabel(player.squad)}</p>
          <p className="muted">
            {getPlayerPositionLabel(player.primaryPosition)} primary
            {player.secondaryPosition ? ` • ${getPlayerPositionLabel(player.secondaryPosition)} secondary` : ''}
            {player.runningProfile ? ` • ${getPlayerRunningProfileLabel(player.runningProfile)}` : ''}
          </p>
          <p className="muted">
            Rotation groups: {rotationSummary}
            {rotationSource === 'manual' ? ' • Manual' : ' • Generated'}
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
              <span>Player name</span>
              <input
                className="input"
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage(null);
                }}
                value={name}
              />
            </label>
            <label className="field">
              <span>Nickname</span>
              <input
                className="input"
                onChange={(event) => {
                  setNickname(event.target.value);
                  setMessage(null);
                }}
                value={nickname}
              />
            </label>
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
              <span>Squad</span>
              <select
                className="input"
                onChange={(event) => {
                  setSquad(event.target.value);
                  setMessage(null);
                }}
                value={squad}>
                <option value="">Unassigned</option>
                <option value="cup">Cup</option>
                <option value="plate">Plate</option>
              </select>
            </label>
            <label className="field">
              <span>Primary position</span>
              <select
                className="input"
                onChange={(event) => {
                  setPrimaryPosition(event.target.value);
                  setMessage(null);
                }}
                value={primaryPosition}>
                {playerPositionOptions.map((position) => (
                  <option key={position || 'none-primary'} value={position}>
                    {getPlayerPositionLabel(position || null)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Secondary position</span>
              <select
                className="input"
                onChange={(event) => {
                  setSecondaryPosition(event.target.value);
                  setMessage(null);
                }}
                value={secondaryPosition}>
                {playerPositionOptions.map((position) => (
                  <option key={position || 'none-secondary'} value={position}>
                    {getPlayerPositionLabel(position || null)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Running profile</span>
              <select
                className="input"
                onChange={(event) => {
                  setRunningProfile(event.target.value);
                  setMessage(null);
                }}
                value={runningProfile}>
                {runningProfileOptions.map((profile) => (
                  <option key={profile || 'none-profile'} value={profile}>
                    {getPlayerRunningProfileLabel(profile || null)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="stack-sm">
            <div className="split-row">
              <span className="field-label">Rotation groups</span>
              <button
                className={useGeneratedGroups ? 'pill-button pill-button--compact pill-button--selected' : 'pill-button pill-button--compact'}
                onClick={() => {
                  setUseGeneratedGroups(true);
                  setMessage(null);
                }}
                type="button">
                Use generated groups
              </button>
            </div>
            <div className="inline-actions">
              {rotationGroupOptions.map((group) => {
                const isSelected = manualGroups.includes(group);

                return (
                  <button
                    key={group}
                    className={
                      !useGeneratedGroups && isSelected
                        ? 'pill-button pill-button--compact pill-button--selected'
                        : 'pill-button pill-button--compact'
                    }
                    onClick={() => {
                      setUseGeneratedGroups(false);
                      setManualGroups((current) => {
                        return current.includes(group)
                          ? current.filter((entry) => entry !== group)
                          : [...current, group];
                      });
                      setMessage(null);
                    }}
                    type="button">
                    {getPlayerRotationGroupLabel(group)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inline-actions">
            <button className="button" disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : 'Save details'}
            </button>
            <button
              className="button button--ghost"
              disabled={isSaving}
              onClick={() => {
                setName(player.name);
                setNickname(player.nickname ?? '');
                setNumber(player.number?.toString() ?? '');
                setSquad(player.squad ?? '');
                setPrimaryPosition(player.primaryPosition ?? '');
                setSecondaryPosition(player.secondaryPosition ?? '');
                setRunningProfile(player.runningProfile ?? '');
                setUseGeneratedGroups(player.rotationGroupOverrides == null);
                setManualGroups(player.rotationGroupOverrides ?? []);
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
          disabled={isSaving}
          onClick={() => {
            setName(player.name);
            setNumber(player.number?.toString() ?? '');
            setSquad(player.squad ?? '');
            setPrimaryPosition(player.primaryPosition ?? '');
            setSecondaryPosition(player.secondaryPosition ?? '');
            setRunningProfile(player.runningProfile ?? '');
            setUseGeneratedGroups(player.rotationGroupOverrides == null);
            setManualGroups(player.rotationGroupOverrides ?? []);
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
