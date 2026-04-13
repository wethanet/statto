type MatchStatRowProps = {
  label: string;
  leftValue: number;
  rightValue: number;
  onAdjust: (side: 'left' | 'right', delta: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  readOnly?: boolean;
};

type StatSideProps = {
  teamLabel: string;
  value: number;
  onAdjust: (delta: number) => void;
  align?: 'left' | 'right';
  readOnly?: boolean;
};

function StatSide({ teamLabel, value, onAdjust, align = 'left', readOnly = false }: StatSideProps) {
  return (
    <div className={align === 'right' ? 'stats-entry-row__side stats-entry-row__side--right' : 'stats-entry-row__side'}>
      <span className="stats-entry-row__team-label">{teamLabel}</span>
      <div className="stats-entry-row__controls">
        <button
          className="stats-entry-row__button stats-entry-row__button--ghost"
          disabled={readOnly}
          onClick={() => onAdjust(-1)}
          type="button">
          -
        </button>
        <div className="stats-entry-row__value">{value}</div>
        <button
          className="stats-entry-row__button stats-entry-row__button--primary"
          disabled={readOnly}
          onClick={() => onAdjust(1)}
          type="button">
          +
        </button>
      </div>
    </div>
  );
}

export function MatchStatRow({
  label,
  leftValue,
  rightValue,
  onAdjust,
  leftLabel = 'Home',
  rightLabel = 'Away',
  readOnly = false,
}: MatchStatRowProps) {
  return (
    <div className="stats-entry-row">
      <StatSide
        teamLabel={leftLabel}
        onAdjust={(delta) => onAdjust('left', delta)}
        readOnly={readOnly}
        value={leftValue}
      />
      <div className="stats-entry-row__metric">
        <span>{label}</span>
      </div>
      <StatSide
        align="right"
        teamLabel={rightLabel}
        onAdjust={(delta) => onAdjust('right', delta)}
        readOnly={readOnly}
        value={rightValue}
      />
    </div>
  );
}
