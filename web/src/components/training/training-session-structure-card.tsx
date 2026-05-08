import {
  getTrainingRunPlanDuration,
  getTrainingSessionLinkCoverage,
  hasTrainingDrillLink,
  isTrainingWarmUpBlock,
} from '@/lib/attendance';
import type { TrainingSession } from '@/lib/types';

type TrainingSessionStructureCardProps = {
  isSuggested?: boolean;
  session: TrainingSession;
};

export function TrainingSessionStructureCard({
  isSuggested: _isSuggested = false,
  session,
}: TrainingSessionStructureCardProps) {
  const totalMinutes = getTrainingRunPlanDuration(session);
  const linkCoverage = getTrainingSessionLinkCoverage(session);

  return (
    <section className="card stack">
      <div className="split-row training-structure__header">
        <div className="stack-sm">
          <h3>Session structure</h3>
          <p className="muted">
            Share the intent, drill links, and exact flow so coaches and the leadership group can run the session consistently.
          </p>
        </div>

        <div className="training-structure__summary">
          <strong>{session.runPlan.length}</strong>
          <span>{session.runPlan.length === 1 ? 'planned block' : 'planned blocks'}</span>
          {totalMinutes > 0 ? <span>{totalMinutes} min planned</span> : null}
          {linkCoverage.totalDrills > 0 ? (
            <span>
              {linkCoverage.drillsWithLinks}/{linkCoverage.totalDrills} with links
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
            const drillHasLink = hasTrainingDrillLink(drill);
            const isWarmUpBlock = isTrainingWarmUpBlock(drill);

            return (
              <article key={drill.id} className="training-run-plan-card stack">
                <div className="split-row">
                  <div className="stack-sm">
                    <span className="eyebrow">Block {index + 1}</span>
                    <h4>{drill.name || 'Untitled drill'}</h4>
                    {drill.skills.length > 0 ? (
                      <p className="muted">Skills: {drill.skills.join(', ')}</p>
                    ) : null}
                  </div>

                  <span className="training-run-plan-card__duration">{drill.lengthMinutes} min</span>
                </div>

                {drill.link ? (
                  <a className="text-link" href={drill.link} rel="noreferrer" target="_blank">
                    Open drill link
                  </a>
                ) : isWarmUpBlock ? (
                  <p className="muted">Standard warm-up block included at the start of every session.</p>
                ) : (
                  <div className="training-media-missing stack-sm">
                    <strong>No drill link attached</strong>
                    <p className="muted">Add a drill library link so the leadership group can review the setup.</p>
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
