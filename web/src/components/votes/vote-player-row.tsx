import { getPlayerDisplayName } from '@/lib/team';
import type { Player } from '@/lib/types';

type VotePlayerRowProps = {
  player: Player;
  points: number;
  onChange: (points: number) => void;
};

export function VotePlayerRow({ player, points, onChange }: VotePlayerRowProps) {
  return (
    <section className="card vote-row">
      <div className="stack-sm">
        <h3>{getPlayerDisplayName(player)}</h3>
      </div>

      <div className="vote-row__controls">
        <button className="pill-button" onClick={() => onChange(Math.max(0, points - 1))} type="button">
          -
        </button>
        <span className="vote-row__points">{points} pts</span>
        <button
          className="pill-button pill-button--selected"
          onClick={() => onChange(Math.min(5, points + 1))}
          type="button">
          +
        </button>
      </div>
    </section>
  );
}
