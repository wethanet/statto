import { getTrainingRunPlanDuration } from '@/lib/attendance';
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
        <img alt={media.caption ?? `${drillTitle} diagram`} className="training-media-card__image" src={media.url} />
        {media.caption ? <figcaption className="muted">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  if (isDirectVideoSource(media.url)) {
    return (
      <figure key={media.id} className="training-media-card">
        <video className="training-media-card__video" controls preload="metadata">
          <source src={media.url} />
        </video>
        {media.caption ? <figcaption className="muted">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <div key={media.id} className="training-media-card training-media-card--link stack-sm">
      <a className="text-link" href={media.url} rel="noreferrer" target="_blank">
        Open video reference
      </a>
      {media.caption ? <p className="muted">{media.caption}</p> : null}
    </div>
  );
}

export function TrainingSessionStructureCard({
  isSuggested = false,
  session,
}: TrainingSessionStructureCardProps) {
  const totalMinutes = getTrainingRunPlanDuration(session);

  return (
    <section className="card stack">
      <div className="split-row training-structure__header">
        <div className="stack-sm">
          <h3>Session structure</h3>
          <p className="muted">
            {isSuggested
              ? 'Suggested from the AFL Youth Coaching Curriculum and Prep-to-Play guidance so the session has a usable structure straight away.'
              : 'Share the intent for the night and the exact drill flow so coaches and players stay aligned.'}
          </p>
        </div>

        <div className="training-structure__summary">
          <strong>{session.runPlan.length}</strong>
          <span>{session.runPlan.length === 1 ? 'planned drill' : 'planned drills'}</span>
          {totalMinutes > 0 ? <span>{totalMinutes} min planned</span> : null}
        </div>
      </div>

      <div className="training-focus-card stack-sm">
        <span className="eyebrow">Session focus</span>
        <p>{session.focus ?? 'No session focus has been added yet.'}</p>
      </div>

      {session.runPlan.length > 0 ? (
        <div className="training-run-plan-list">
          {session.runPlan.map((drill, index) => {
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

                {drill.media.length > 0 ? (
                  <div className="training-media-grid">
                    {drill.media.map((media) => {
                      return renderMedia(drill.title, media);
                    })}
                  </div>
                ) : null}
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
