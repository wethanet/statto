import type { AttendanceStatus, Player } from '@/lib/types';

type AttendancePlayerRowProps = {
  player: Player;
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
};

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'unknown'];

function getAttendanceTone(status: AttendanceStatus) {
  if (status === 'present') {
    return 'positive';
  }

  if (status === 'absent') {
    return 'negative';
  }

  return 'neutral';
}

export function AttendancePlayerRow({ player, status, onChange }: AttendancePlayerRowProps) {
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
          {ATTENDANCE_OPTIONS.map((option) => {
            const isSelected = option === status;
            const tone = getAttendanceTone(option);

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
