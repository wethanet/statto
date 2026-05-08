import { isTrainingWarmUpBlock } from '@/lib/attendance';
import type { TrainingSessionDrill } from '@/lib/types';

type TrainingDrillEditorProps = {
  drill: TrainingSessionDrill;
  index: number;
  onChange: (drill: TrainingSessionDrill) => void;
  onRemove: () => void;
};

function isExtendedGameDrill(name: string) {
  const normalizedName = name.toLowerCase();

  return normalizedName.includes('small sided game') || normalizedName.includes('match sim');
}

export function TrainingDrillEditor({
  drill,
  index,
  onChange,
  onRemove,
}: TrainingDrillEditorProps) {
  const isWarmUpBlock = isTrainingWarmUpBlock(drill);
  const maxLength = isExtendedGameDrill(drill.name) || isWarmUpBlock ? undefined : 12;

  return (
    <article className="training-drill-editor stack">
      <div className="split-row">
        <div className="stack-sm">
          <span className="eyebrow">Drill {index + 1}</span>
          <h4>{drill.name || 'Untitled drill'}</h4>
          <span className="status-pill status-pill--positive">
            {isWarmUpBlock ? '20 min warm-up block' : drill.link ? 'Library link attached' : 'Link needed'}
          </span>
        </div>
        {isWarmUpBlock ? null : (
          <button className="button button--ghost-danger" onClick={onRemove} type="button">
            Remove drill
          </button>
        )}
      </div>

      <div className="two-column">
        <label className="field">
          <span>Drill name</span>
          <input
            className="input"
            onChange={(event) => {
              onChange({
                ...drill,
                name: event.target.value,
                lengthMinutes:
                  isExtendedGameDrill(event.target.value) || isWarmUpBlock
                    ? drill.lengthMinutes
                    : Math.min(12, drill.lengthMinutes),
              });
            }}
            placeholder="Ground ball pressure"
            value={drill.name}
          />
        </label>

        <label className="field">
          <span>Length (minutes)</span>
          <input
            className="input"
            max={maxLength}
            min="1"
            onChange={(event) => {
              const parsedValue = Number(event.target.value);
              const nextLength = Number.isFinite(parsedValue) ? Math.max(1, Math.round(parsedValue)) : 1;

              onChange({
                ...drill,
                lengthMinutes: maxLength ? Math.min(maxLength, nextLength) : nextLength,
              });
            }}
            placeholder="12"
            type="number"
            value={drill.lengthMinutes}
          />
        </label>
      </div>

      <label className="field">
        <span>Drill link</span>
        <input
          className="input"
          disabled={isWarmUpBlock}
          onChange={(event) => {
            onChange({
              ...drill,
              link: event.target.value,
            });
          }}
          placeholder="https://example.com/drill"
          value={drill.link ?? ''}
        />
      </label>

      <label className="field">
        <span>Skills improved</span>
        <textarea
          className="input textarea"
          disabled={isWarmUpBlock}
          onChange={(event) => {
            onChange({
              ...drill,
              skills: event.target.value
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean),
            });
          }}
          placeholder={'Clean hands\nKicking accuracy\nDecision making'}
          value={drill.skills.join('\n')}
        />
      </label>

      {isWarmUpBlock ? (
        <p className="muted">This block is automatically included at the start of every training session.</p>
      ) : maxLength ? (
        <p className="muted">Standard drills are capped at 12 minutes. Use “small sided game” or “match sim” in the drill name for longer blocks.</p>
      ) : (
        <p className="muted">Small sided games and match sim blocks can run longer than 12 minutes.</p>
      )}
    </article>
  );
}
