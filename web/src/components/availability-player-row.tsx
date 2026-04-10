import { matchLinePositions } from '@/lib/match-lineup';
import type { AvailabilityStatus, MatchLinePosition, Player } from '@/lib/types';

type AvailabilityPlayerRowProps = {
  player: Player;
  status: AvailabilityStatus;
  onChange: (status: AvailabilityStatus) => void;
  selectedPosition: MatchLinePosition | null;
  onSelectPosition: (position: MatchLinePosition) => void;
};

const AVAILABILITY_OPTIONS: AvailabilityStatus[] = ['available', 'unavailable', 'uncertain'];

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
  onChange,
  onSelectPosition,
  selectedPosition,
}: AvailabilityPlayerRowProps) {
  const metaParts = [
    player.number != null ? `#${player.number}` : null,
    player.position,
  ].filter(Boolean);

  return (
    <section className="selection-row">
      <div className="selection-row__identity">
        <div className="selection-row__name-group">
          <h3 className="selection-row__name">{player.name}</h3>
          {metaParts.length > 0 ? (
            <span className="selection-row__meta">{metaParts.join(' • ')}</span>
          ) : null}
        </div>
      </div>

      {status === 'available' ? (
        <div className="inline-actions selection-row__pills selection-row__pills--compact selection-row__positions">
          {matchLinePositions.map((position) => {
            const isSelected = selectedPosition === position;

            return (
              <button
                key={position}
                className={isSelected ? 'pill-button pill-button--compact pill-button--selected' : 'pill-button pill-button--compact'}
                onClick={() => onSelectPosition(position)}
                type="button">
                {position}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="selection-row__positions" />
      )}

      <div className="selection-row__actions">
        <div className="inline-actions selection-row__pills selection-row__pills--compact">
          {AVAILABILITY_OPTIONS.map((option) => {
            const isSelected = option === status;
            const tone = getAvailabilityTone(option);

            return (
              <button
                key={option}
                className={
                  isSelected
                    ? `pill-button pill-button--compact pill-button--selected pill-button--${tone}`
                    : 'pill-button pill-button--compact'
                }
                onClick={() => onChange(option)}
                type="button">
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
