import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getFixtureById } from '@/lib/availability';
import type { MatchStatMetric, MatchStatQuarter, MatchStatTeam } from '@/lib/types';
import {
  adjustMatchStatEntry,
  getFixtureScoreSummary,
  getMatchStatQuarterValue,
  getMatchStatValue,
  matchStatLabels,
  matchStatQuarterLabels,
  matchStatCaptureQuarterOrder,
} from '@/lib/match-stats';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { MatchStatRow } from '@web/components/stats/match-stat-row';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';

type StatAction = {
  id: string;
  quarter: MatchStatQuarter;
  metric: MatchStatMetric;
  team: MatchStatTeam;
  delta: number;
  label: string;
  createdAt: string;
};

type StatsViewMode = 'capture' | 'report';

const STAT_GROUPS: { title: string; metrics: MatchStatMetric[] }[] = [
  { title: 'Scoring', metrics: ['goals', 'points'] },
  { title: 'Marking / Intercept', metrics: ['uncontested-marks', 'intercept-marks'] },
  { title: 'Possession', metrics: ['kicks', 'handballs', 'effective-disposals'] },
  { title: 'Pressure & Contest', metrics: ['tackles', 'hit-outs', 'free-kicks'] },
  { title: 'Territory', metrics: ['clearances', 'inside-50s', 'marks-i50'] },
];

function getLastWord(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const parts = trimmedValue.split(/\s+/);
  return parts[parts.length - 1] ?? trimmedValue;
}

export function MatchStatsRoute() {
  useEnsureClubCollections(['fixtures', 'matchStats']);

  const { fixtureId = '' } = useParams();
  const { activeClub } = useClubAccess();
  const { canAccessAdmin } = useClubPermissions();
  const { fixtures, isHydrated, matchStats, setMatchStats } = useClubData();
  const [selectedQuarter, setSelectedQuarter] = useState<MatchStatQuarter>('q1');
  const [viewMode, setViewMode] = useState<StatsViewMode>(canAccessAdmin ? 'capture' : 'report');
  const [recentActions, setRecentActions] = useState<StatAction[]>([]);
  const fixture = getFixtureById(fixtureId, fixtures);

  if (!fixture) {
    return (
      <section className="page-grid">
        <section className="panel stack">
          <span className="eyebrow">Match stats</span>
          <h2>Fixture not found</h2>
          <p className="muted">Check the selected match and try again.</p>
          <Link className="text-link" to="/matches">
            Back to matches
          </Link>
        </section>
      </section>
    );
  }

  const fixtureKey = fixture.id;
  const trackedTeamName = activeClub?.name ?? 'Our Club';
  const opponentTeamName = fixture.opponent;
  const homeTeamName = fixture.isHome ? trackedTeamName : opponentTeamName;
  const awayTeamName = fixture.isHome ? opponentTeamName : trackedTeamName;
  const homeTeamShort = getLastWord(homeTeamName) || 'Home';
  const awayTeamShort = getLastWord(awayTeamName) || 'Away';
  const homeTeamKey: MatchStatTeam = fixture.isHome ? 'ours' : 'theirs';
  const awayTeamKey: MatchStatTeam = fixture.isHome ? 'theirs' : 'ours';
  const gameScoreSummary = getFixtureScoreSummary(fixture.id, matchStats, 'game');
  const selectedQuarterScoreSummary = getFixtureScoreSummary(fixture.id, matchStats, selectedQuarter);
  const gameHomeScore = homeTeamKey === 'ours' ? gameScoreSummary.ours : gameScoreSummary.theirs;
  const gameAwayScore = awayTeamKey === 'ours' ? gameScoreSummary.ours : gameScoreSummary.theirs;
  const selectedHomeScore =
    homeTeamKey === 'ours' ? selectedQuarterScoreSummary.ours : selectedQuarterScoreSummary.theirs;
  const selectedAwayScore =
    awayTeamKey === 'ours' ? selectedQuarterScoreSummary.ours : selectedQuarterScoreSummary.theirs;
  const totalHome = viewMode === 'report' ? gameHomeScore.score : selectedHomeScore.score;
  const totalAway = viewMode === 'report' ? gameAwayScore.score : selectedAwayScore.score;
  const latestAction = recentActions[0] ?? null;

  function recordStatChange(metric: MatchStatMetric, side: 'home' | 'away', delta: number) {
    const team = side === 'home' ? homeTeamKey : awayTeamKey;
    const teamLabel = side === 'home' ? homeTeamShort : awayTeamShort;
    const actionLabel = `${matchStatQuarterLabels[selectedQuarter]} ${teamLabel} ${matchStatLabels[metric]} ${
      delta > 0 ? `+${delta}` : delta
    }`;

    setMatchStats((current) => {
      return adjustMatchStatEntry(current, fixtureKey, selectedQuarter, metric, team, delta);
    });
    setRecentActions((current) => {
      const nextAction: StatAction = {
        id: `${selectedQuarter}-${metric}-${team}-${Date.now()}`,
        quarter: selectedQuarter,
        metric,
        team,
        delta,
        label: actionLabel,
        createdAt: new Date().toISOString(),
      };

      return [nextAction, ...current].slice(0, 6);
    });
  }

  function undoLastAction() {
    const action = recentActions[0];

    if (!action) {
      return;
    }

    setMatchStats((current) => {
      return adjustMatchStatEntry(
        current,
        fixtureKey,
        action.quarter,
        action.metric,
        action.team,
        -action.delta
      );
    });
    setRecentActions((current) => current.slice(1));
  }

  function renderTeamCrest(teamName: string, teamKey: MatchStatTeam) {
    if (teamKey === 'ours') {
      return (
        <div className="score-strip__crest score-strip__crest--logo">
          <img alt="Warners Bay Bulldogs logo" src={bulldogsLogo} />
        </div>
      );
    }

    return <div className="score-strip__crest">{teamName.slice(0, 3).toUpperCase()}</div>;
  }

  function getQuarterScoreLine(quarter: MatchStatQuarter) {
    if (quarter === 'game') {
      const score = getFixtureScoreSummary(fixtureKey, matchStats, 'game');

      return {
        left: homeTeamKey === 'ours' ? score.ours : score.theirs,
        right: awayTeamKey === 'ours' ? score.ours : score.theirs,
      };
    }

    const homeGoals = getMatchStatQuarterValue(fixtureKey, 'goals', homeTeamKey, matchStats, quarter);
    const homePoints = getMatchStatQuarterValue(fixtureKey, 'points', homeTeamKey, matchStats, quarter);
    const awayGoals = getMatchStatQuarterValue(fixtureKey, 'goals', awayTeamKey, matchStats, quarter);
    const awayPoints = getMatchStatQuarterValue(fixtureKey, 'points', awayTeamKey, matchStats, quarter);

    return {
      left: {
        goals: homeGoals,
        points: homePoints,
        score: homeGoals * 6 + homePoints,
      },
      right: {
        goals: awayGoals,
        points: awayPoints,
        score: awayGoals * 6 + awayPoints,
      },
    };
  }

  return (
    <section className="page-grid">
      <section className="live-stats-shell">
        <section className="score-strip">
          <div className="score-strip__team">
            {renderTeamCrest(homeTeamName, homeTeamKey)}
            <div className="stack-sm">
              <strong>{homeTeamName}</strong>
              <span className="muted">Home</span>
            </div>
          </div>

          <div className="score-strip__middle">
            <div className="score-strip__total">
              <span>{totalHome}</span>
              <span className="score-strip__divider">-</span>
              <span>{totalAway}</span>
            </div>
            <span className="muted">
              {fixture.grade ? `${fixture.grade} • ` : ''}
              {canAccessAdmin ? 'Live entry' : 'Stats report'}
            </span>
          </div>

          <div className="score-strip__team score-strip__team--right">
            <div className="stack-sm score-strip__team-copy">
              <strong>{awayTeamName}</strong>
              <span className="muted">Away</span>
            </div>
            {renderTeamCrest(awayTeamName, awayTeamKey)}
          </div>
        </section>

        <section className="activity-rail">
          {canAccessAdmin ? (
            <button
              className="activity-rail__undo"
              disabled={!latestAction}
              onClick={undoLastAction}
              type="button">
              Undo Last Action
            </button>
          ) : null}
          <div className="activity-rail__chips">
            {canAccessAdmin && latestAction ? (
              <span className="activity-chip activity-chip--primary">{latestAction.label}</span>
            ) : canAccessAdmin ? (
              <span className="activity-chip">No actions yet</span>
            ) : (
              <span className="activity-chip activity-chip--primary">Read-only report</span>
            )}
            <span className="activity-chip">
              {viewMode === 'report'
                ? `Report view • Game ${gameHomeScore.goals}.${gameHomeScore.points} - ${gameAwayScore.goals}.${gameAwayScore.points}`
                : `Editing cumulative ${matchStatQuarterLabels[selectedQuarter]}`}
            </span>
            <span className="activity-chip">
              {isHydrated
                ? canAccessAdmin
                  ? 'Stats save as you tap.'
                  : 'Showing the saved match report.'
                : 'Loading saved match stats...'}
            </span>
            {canAccessAdmin && viewMode === 'capture' ? (
              <span className="activity-chip">
                Through {matchStatQuarterLabels[selectedQuarter]} {selectedHomeScore.goals}.{selectedHomeScore.points} -{' '}
                {selectedAwayScore.goals}.{selectedAwayScore.points}
              </span>
            ) : null}
          </div>
        </section>

        <section className="stats-toolbar">
          {canAccessAdmin ? (
            <>
              <div className="stats-toolbar__group">
                <span className="stats-toolbar__label">View</span>
                <div className="stats-toolbar__buttons">
                  {(['capture', 'report'] as StatsViewMode[]).map((mode) => {
                    const isSelected = mode === viewMode;

                    return (
                      <button
                        key={mode}
                        className={isSelected ? 'pill-button pill-button--compact pill-button--selected' : 'pill-button pill-button--compact'}
                        onClick={() => setViewMode(mode)}
                        type="button">
                        {mode === 'capture' ? 'Capture' : 'Report'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="stats-toolbar__group">
                <span className="stats-toolbar__label">Period</span>
                <div className="stats-toolbar__buttons">
                {matchStatCaptureQuarterOrder.map((quarter) => {
                  const isSelected = quarter === selectedQuarter;

                  return (
                    <button
                      key={quarter}
                      className={
                        isSelected
                          ? 'pill-button pill-button--selected stats-toolbar__period-button'
                          : 'pill-button stats-toolbar__period-button'
                      }
                      onClick={() => setSelectedQuarter(quarter)}
                      type="button">
                      {matchStatQuarterLabels[quarter]}
                    </button>
                  );
                })}
                </div>
              </div>
            </>
          ) : null}
        </section>

        {viewMode === 'capture' ? <div className="live-stats-grid">
          {STAT_GROUPS.map((group) => {
            return (
              <section key={group.title} className="live-stat-card">
                <h3 className="live-stat-card__title">{group.title}</h3>
                <div className="live-stat-card__rows">
                  {group.metrics.map((metric) => {
                    return (
                      <MatchStatRow
                        key={metric}
                        leftLabel={homeTeamShort}
                        label={matchStatLabels[metric]}
                        onAdjust={(side, delta) => {
                          recordStatChange(metric, side === 'left' ? 'home' : 'away', delta);
                        }}
                        leftValue={getMatchStatValue(
                          fixtureKey,
                          metric,
                          homeTeamKey,
                          matchStats,
                          selectedQuarter
                        )}
                        rightLabel={awayTeamShort}
                        rightValue={getMatchStatValue(
                          fixtureKey,
                          metric,
                          awayTeamKey,
                          matchStats,
                          selectedQuarter
                        )}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="live-stat-card">
            <h3 className="live-stat-card__title">Recent Activity</h3>
            {recentActions.length > 0 ? (
              <div className="activity-log">
                {recentActions.map((action) => {
                  return (
                    <div key={action.id} className="activity-log__row">
                      <span>{action.label}</span>
                      <span className="muted">
                        {new Intl.DateTimeFormat('en-AU', {
                          hour: 'numeric',
                          minute: '2-digit',
                        }).format(new Date(action.createdAt))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">
                Start tapping the stat controls and the latest match actions will stack here.
              </p>
            )}
          </section>
        </div> : (
          <div className="report-stats-grid">
            <section className="live-stat-card">
              <h3 className="live-stat-card__title">Match Report</h3>
              <div className="score-snapshot">
                <div>
                  <span className="score-snapshot__label">{homeTeamShort}</span>
                  <strong>
                    {gameHomeScore.goals}.{gameHomeScore.points}
                  </strong>
                  <span className="muted">{gameHomeScore.score} pts</span>
                </div>
                <div>
                  <span className="score-snapshot__label">{awayTeamShort}</span>
                  <strong>
                    {gameAwayScore.goals}.{gameAwayScore.points}
                  </strong>
                  <span className="muted">{gameAwayScore.score} pts</span>
                </div>
              </div>
              <p className="muted">Quarter columns show isolated inputs. Total shows the full game result.</p>
              {STAT_GROUPS.map((group) => {
                return (
                  <section key={`${group.title}-report`} className="stats-report-group">
                    <h4 className="stats-report-group__title">{group.title}</h4>
                  <div className="stats-report-sides">
                    {[
                      { key: homeTeamKey, label: homeTeamShort },
                      { key: awayTeamKey, label: awayTeamShort },
                    ].map((team) => {
                      return (
                        <div key={`${group.title}-${team.key}`} className="stats-report-panel">
                          <div className="stats-report-panel__title">{team.label}</div>
                          <div className="stats-report">
                            <div className="stats-report__header">
                              <span className="stats-report__metric-title">Metric</span>
                              {matchStatCaptureQuarterOrder.map((quarter) => {
                                return (
                                  <span key={`${group.title}-${team.key}-${quarter}`} className="stats-report__period-title">
                                    {matchStatQuarterLabels[quarter]}
                                  </span>
                                );
                              })}
                              <span className="stats-report__period-title">Total</span>
                            </div>
                            {group.metrics.map((metric) => {
                              return (
                                <div key={`${group.title}-${team.key}-${metric}`} className="stats-report__row">
                                  <span className="stats-report__metric">{matchStatLabels[metric]}</span>
                                  {matchStatCaptureQuarterOrder.map((quarter) => {
                                    return (
                                      <span key={`${team.key}-${metric}-${quarter}`} className="stats-report__value">
                                        {getMatchStatQuarterValue(fixtureKey, metric, team.key, matchStats, quarter)}
                                      </span>
                                    );
                                  })}
                                  <span className="stats-report__value">
                                    {getMatchStatQuarterValue(fixtureKey, metric, team.key, matchStats, 'game')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </section>
                );
              })}

              <section className="stats-report-group">
                <h4 className="stats-report-group__title">Score Report</h4>
              <div className="stats-report stats-report--score">
                <div className="stats-report__header stats-report__header--score">
                  <span className="stats-report__metric-title">Period</span>
                  <span className="stats-report__period-title">{homeTeamShort}</span>
                  <span className="stats-report__period-title">{awayTeamShort}</span>
                </div>
                {[...matchStatCaptureQuarterOrder, 'game' as MatchStatQuarter].map((quarter) => {
                  const scoreLine = getQuarterScoreLine(quarter);
                  const left = scoreLine.left;
                  const right = scoreLine.right;

                  return (
                    <div key={`score-${quarter}`} className="stats-report__row stats-report__row--score">
                      <span className="stats-report__metric">{matchStatQuarterLabels[quarter]}</span>
                      <span className="stats-report__value">
                        {left.goals}.{left.points} ({left.score})
                      </span>
                      <span className="stats-report__value">
                        {right.goals}.{right.points} ({right.score})
                      </span>
                    </div>
                  );
                })}
              </div>
              </section>
            </section>
          </div>
        )}
      </section>
    </section>
  );
}
