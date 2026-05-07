import {
  getTrainingRunPlanDuration,
  getTrainingSessionMediaCoverage,
  hasTrainingDrillMedia,
} from '@/lib/attendance';
import type { TrainingSession, TrainingSessionDrillMedia } from '@/lib/types';

type TrainingSessionStructureCardProps = {
  isSuggested?: boolean;
  session: TrainingSession;
};

function isDirectVideoSource(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function renderMedia(drillTitle: string, media: TrainingSessionDrillMedia) {
  if (!media.url) {
    return null;
  }

  if (media.type === 'image') {
    return (
      <figure key={media.id} className="training-media-card">
        <span className="eyebrow">Image reference</span>
        <img alt={media.caption ?? `${drillTitle} diagram`} className="training-media-card__image" src={media.url} />
        {media.caption ? <figcaption className="muted">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  if (isDirectVideoSource(media.url)) {
    return (
      <figure key={media.id} className="training-media-card">
        <span className="eyebrow">Video reference</span>
        <video className="training-media-card__video" controls preload="metadata">
          <source src={media.url} />
        </video>
        {media.caption ? <figcaption className="muted">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <div key={media.id} className="training-media-card training-media-card--link stack-sm">
      <span className="eyebrow">Video reference</span>
      <a className="text-link" href={media.url} rel="noreferrer" target="_blank">
        Open video reference
      </a>
      {media.caption ? <p className="muted">{media.caption}</p> : null}
    </div>
  );
}

export function TrainingSessionStructureCard({
  isSuggested: _isSuggested = false,
  session,
}: TrainingSessionStructureCardProps) {
  const totalMinutes = getTrainingRunPlanDuration(session);
  const mediaCoverage = getTrainingSessionMediaCoverage(session);

  return (
    <section className="card stack">
      <div className="split-row training-structure__header">
        <div className="stack-sm">
          <h3>Session structure</h3>
          <p className="muted">
            Share the intent, visual references, and exact drill flow so coaches and the leadership group can run the session consistently.
          </p>
        </div>

        <div className="training-structure__summary">
          <strong>{session.runPlan.length}</strong>
          <span>{session.runPlan.length === 1 ? 'planned drill' : 'planned drills'}</span>
          {totalMinutes > 0 ? <span>{totalMinutes} min planned</span> : null}
          {session.runPlan.length > 0 ? (
            <span>
              {mediaCoverage.drillsWithMedia}/{mediaCoverage.totalDrills} with visuals
            </span>
          ) : null}
        </div>
      </div>

      <div className="training-focus-card stack-sm">
        <span className="eyebrow">Session focus</span>
        <p>{session.focus ?? 'No session focus has been added yet.'}</p>
      </div>

      {session.runPlan.length > 0 ? (
        <div className="training-run-plan-list">
          {session.runPlan.map((drill, index) => {
            const drillHasMedia = hasTrainingDrillMedia(drill);

            return (
              <article key={drill.id} className="training-run-plan-card stack">
                <div className="split-row">
                  <div className="stack-sm">
                    <span className="eyebrow">Drill {index + 1}</span>
                    <h4>{drill.title || 'Untitled drill'}</h4>
                  </div>

                  {drill.durationMinutes ? (
                    <span className="training-run-plan-card__duration">{drill.durationMinutes} min</span>
                  ) : null}
                </div>

                {drill.description ? <p>{drill.description}</p> : null}

                {drill.coachingPoints ? (
                  <div className="stack-sm">
                    <span className="field-label">Coaching points</span>
                    <p className="muted">{drill.coachingPoints}</p>
                  </div>
                ) : null}

                {drillHasMedia ? (
                  <div className="training-media-grid">
                    {drill.media.map((media) => {
                      return renderMedia(drill.title, media);
                    })}
                  </div>
                ) : (
                  <div className="training-media-missing stack-sm">
                    <strong>No visual reference attached</strong>
                    <p className="muted">
                      Add an image or video so the leadership group can help demonstrate and manage this drill.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted">No drills have been planned for this session yet.</p>
      )}
    </section>
  );
}
