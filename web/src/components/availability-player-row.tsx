import type { AvailabilityStatus, Player } from '@/lib/types';

type AvailabilityPlayerRowProps = {
  player: Player;
  status: AvailabilityStatus;
  onChange: (status: AvailabilityStatus) => void;
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

      <div className="selection-row__actions">
        <div className="inline-actions selection-row__pills">
          {AVAILABILITY_OPTIONS.map((option) => {
            const isSelected = option === status;
            const tone = getAvailabilityTone(option);

            return (
              <button
                key={option}
                className={
                  isSelected
                    ? `pill-button pill-button--selected pill-button--${tone}`
                    : 'pill-button'
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
