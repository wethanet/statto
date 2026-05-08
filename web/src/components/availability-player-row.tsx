import { useEffect, useRef, useState } from 'react';

import { matchLinePositions } from '@/lib/match-lineup';
import { matchRotationGroups } from '@/lib/match-rotations';
import { getPlayerRotationGroupLabel } from '@/lib/team';
import type { AvailabilityStatus, MatchLinePosition, Player, PlayerRotationGroup } from '@/lib/types';

type AvailabilityPlayerRowProps = {
  player: Player;
  status: AvailabilityStatus;
  hasSameDaySelectionConflict?: boolean;
  eligibilityWarnings?: string[];
  selectionBlockReason?: string | null;
  onChange: (status: AvailabilityStatus) => void;
  selectedPosition: MatchLinePosition | null;
  onSelectPosition: (position: MatchLinePosition) => void;
  rotationGroup: PlayerRotationGroup | null;
  rotationGroupSource: 'generated' | 'manual' | null;
  onSelectRotationGroup: (group: PlayerRotationGroup) => void;
  onResetRotationGroup: () => void;
};

const AVAILABILITY_OPTIONS: AvailabilityStatus[] = ['available', 'unavailable', 'uncertain'];

function getAvailabilityLabel(status: AvailabilityStatus) {
  if (status === 'available') {
    return 'selected';
  }

  if (status === 'uncertain') {
    return 'available';
  }

  return 'unavailable';
}

function getAvailabilityTone(status: AvailabilityStatus) {
  if (status === 'available') {
    return 'positive';
  }

  if (status === 'unavailable') {
    return 'negative';
  }

  return 'neutral';
}

export function AvailabilityPlayerRow({
  player,
  status,
  hasSameDaySelectionConflict = false,
  eligibilityWarnings = [],
  selectionBlockReason = null,
  onChange,
  onSelectPosition,
  selectedPosition,
  rotationGroup,
  rotationGroupSource,
  onSelectRotationGroup,
  onResetRotationGroup,
}: AvailabilityPlayerRowProps) {
  const [isRotationMenuOpen, setIsRotationMenuOpen] = useState(false);
  const rotationMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isRotationMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rotationMenuRef.current?.contains(event.target as Node)) {
        setIsRotationMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRotationMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isRotationMenuOpen]);

  return (
    <section className="selection-row">
      <div className="selection-row__identity">
        <div className="selection-row__name-group">
          <h3 className="selection-row__name">{player.name}</h3>
          {rotationGroup ? (
            <div className="selection-row__rotation-menu" ref={rotationMenuRef}>
              <button
                aria-expanded={status === 'available' ? isRotationMenuOpen : undefined}
                aria-haspopup={status === 'available' ? 'menu' : undefined}
                className="selection-row__rotation-trigger"
                disabled={status !== 'available'}
                onClick={() => {
                  if (status === 'available') {
                    setIsRotationMenuOpen((current) => !current);
                  }
                }}
                title={`${getPlayerRotationGroupLabel(rotationGroup)}${rotationGroupSource === 'manual' ? ' (manual)' : ' (auto)'}`}
                type="button">
                <span
                  aria-label={getPlayerRotationGroupLabel(rotationGroup)}
                  className={`selection-row__rotation-dot selection-row__rotation-dot--${rotationGroup}`}
                />
              </button>

              {status === 'available' && isRotationMenuOpen ? (
                <div className="selection-row__rotation-popover" role="menu">
                  {matchRotationGroups.map((group) => (
                    <button
                      className={
                        rotationGroup === group
                          ? 'selection-row__rotation-option selection-row__rotation-option--selected'
                          : 'selection-row__rotation-option'
                      }
                      key={group}
                      onClick={() => {
                        onSelectRotationGroup(group);
                        setIsRotationMenuOpen(false);
                      }}
                      role="menuitem"
                      type="button">
                      <span className={`selection-row__rotation-dot selection-row__rotation-dot--${group}`} />
                      <span>{getPlayerRotationGroupLabel(group)}</span>
                    </button>
                  ))}

                  {rotationGroupSource === 'manual' ? (
                    <button
                      className="selection-row__rotation-option"
                      onClick={() => {
                        onResetRotationGroup();
                        setIsRotationMenuOpen(false);
                      }}
                      role="menuitem"
                      type="button">
                      <span className="selection-row__rotation-auto-label">Auto</span>
                      <span>Use generated group</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {player.number != null ? (
            <span
              className={
                hasSameDaySelectionConflict
                  ? 'selection-row__meta selection-row__meta--conflict'
                  : 'selection-row__meta'
              }>
              #{player.number}
            </span>
          ) : null}
        </div>
        {selectionBlockReason || eligibilityWarnings.length > 0 ? (
          <div className="selection-row__warnings" aria-label="Eligibility warnings">
            {selectionBlockReason ? (
              <span className="selection-row__warning selection-row__warning--blocked">
                {selectionBlockReason}
              </span>
            ) : null}
            {eligibilityWarnings.map((warning) => (
              <span className="selection-row__warning" key={warning}>
                {warning}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {status === 'available' ? (
        <div className="selection-row__controls">
          <div className="inline-actions selection-row__pills selection-row__pills--compact selection-row__positions">
            {matchLinePositions.map((position) => {
              const isSelected = selectedPosition === position;

              return (
                <button
                  key={position}
                  className={isSelected ? 'pill-button pill-button--compact pill-button--selected' : 'pill-button pill-button--compact'}
                  disabled={Boolean(selectionBlockReason)}
                  onClick={() => onSelectPosition(position)}
                  type="button">
                  {position}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="selection-row__controls" />
      )}

      <div className="selection-row__actions">
        <label className="selection-row__status-field">
          <span className="hidden-input">Selection status</span>
          <select
            className={`input selection-row__status-select selection-row__status-select--${getAvailabilityTone(status)}`}
            onChange={(event) => onChange(event.target.value as AvailabilityStatus)}
            value={status}>
            {AVAILABILITY_OPTIONS.map((option) => (
              <option
                disabled={option === 'available' && status !== 'available' && Boolean(selectionBlockReason)}
                key={option}
                value={option}>
                {getAvailabilityLabel(option)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
