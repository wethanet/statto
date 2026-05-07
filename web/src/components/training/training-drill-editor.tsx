import { hasTrainingDrillMedia } from '@/lib/attendance';
import type { TrainingSessionDrill, TrainingSessionDrillMedia } from '@/lib/types';

type TrainingDrillEditorProps = {
  drill: TrainingSessionDrill;
  index: number;
  onAddMedia: (type: TrainingSessionDrillMedia['type']) => void;
  onChange: (drill: TrainingSessionDrill) => void;
  onRemove: () => void;
  onRemoveMedia: (mediaId: string) => void;
  onUpdateMedia: (
    mediaId: string,
    patch: Partial<Pick<TrainingSessionDrillMedia, 'caption' | 'type' | 'url'>>
  ) => void;
};

export function TrainingDrillEditor({
  drill,
  index,
  onAddMedia,
  onChange,
  onRemove,
  onRemoveMedia,
  onUpdateMedia,
}: TrainingDrillEditorProps) {
  const hasMedia = hasTrainingDrillMedia(drill);
  const mediaCount = drill.media.filter((media) => media.url.trim().length > 0).length;

  return (
    <article className="training-drill-editor stack">
      <div className="split-row">
        <div className="stack-sm">
          <span className="eyebrow">Drill {index + 1}</span>
          <h4>{drill.title || 'Untitled drill'}</h4>
          <span className={hasMedia ? 'status-pill status-pill--positive' : 'status-pill status-pill--negative'}>
            {hasMedia ? `${mediaCount} visual ${mediaCount === 1 ? 'reference' : 'references'}` : 'Visual required'}
          </span>
        </div>
        <button className="button button--ghost-danger" onClick={onRemove} type="button">
          Remove drill
        </button>
      </div>

      <div className="two-column">
        <label className="field">
          <span>Drill name</span>
          <input
            className="input"
            onChange={(event) => {
              onChange({
                ...drill,
                title: event.target.value,
              });
            }}
            placeholder="Ground ball pressure"
            value={drill.title}
          />
        </label>

        <label className="field">
          <span>Duration (minutes)</span>
          <input
            className="input"
            min="0"
            onChange={(event) => {
              const nextValue = event.target.value.trim();
              onChange({
                ...drill,
                durationMinutes: nextValue ? Number(nextValue) : null,
              });
            }}
            placeholder="12"
            type="number"
            value={drill.durationMinutes ?? ''}
          />
        </label>
      </div>

      <label className="field">
        <span>What the drill is</span>
        <textarea
          className="input textarea"
          onChange={(event) => {
            onChange({
              ...drill,
              description: event.target.value,
            });
          }}
          placeholder="Set-up, flow, and what the group needs to do."
          value={drill.description ?? ''}
        />
      </label>

      <label className="field">
        <span>Coaching points</span>
        <textarea
          className="input textarea"
          onChange={(event) => {
            onChange({
              ...drill,
              coachingPoints: event.target.value,
            });
          }}
          placeholder="Key behaviours, cues, and what success looks like."
          value={drill.coachingPoints ?? ''}
        />
      </label>

      <div className="stack-sm">
        <div className="split-row">
          <div className="stack-sm">
            <span className="field-label">Drill media</span>
            <p className="muted">
              Add at least one image or video reference so the leadership group can help set up and run the drill.
            </p>
          </div>

          <div className="inline-actions">
            <button
              className="button button--secondary"
              onClick={() => {
                onAddMedia('image');
              }}
              type="button">
              Add image
            </button>
            <button
              className="button button--secondary"
              onClick={() => {
                onAddMedia('video');
              }}
              type="button">
              Add video
            </button>
          </div>
        </div>

        {drill.media.length > 0 ? (
          <div className="training-media-editor-list">
            {drill.media.map((media) => {
              return (
                <div key={media.id} className="training-media-editor-card stack-sm">
                  <div className="two-column">
                    <label className="field">
                      <span>Type</span>
                      <select
                        className="input"
                        onChange={(event) => {
                          onUpdateMedia(media.id, {
                            type: event.target.value as TrainingSessionDrillMedia['type'],
                          });
                        }}
                        value={media.type}>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Caption</span>
                      <input
                        className="input"
                        onChange={(event) => {
                          onUpdateMedia(media.id, {
                            caption: event.target.value,
                          });
                        }}
                        placeholder="What should players notice?"
                        value={media.caption ?? ''}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>{media.type === 'image' ? 'Image URL' : 'Video URL'}</span>
                    <input
                      className="input"
                      onChange={(event) => {
                        onUpdateMedia(media.id, {
                          url: event.target.value,
                        });
                      }}
                      placeholder={
                        media.type === 'image'
                          ? 'https://example.com/drill.png'
                          : 'https://example.com/drill.mp4'
                      }
                      value={media.url}
                    />
                  </label>

                  <div className="inline-actions">
                    <button
                      className="button button--ghost-danger"
                      onClick={() => {
                        onRemoveMedia(media.id);
                      }}
                      type="button">
                      Remove media
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="training-media-empty stack-sm">
            <strong>Visual reference required</strong>
            <p className="muted">Add a diagram, photo, or video before saving this drill to a session.</p>
          </div>
        )}
      </div>
    </article>
  );
}
