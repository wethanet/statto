import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getFixtureById } from '@/lib/availability';
import type { MatchStatMetric, MatchStatTeam } from '@/lib/types';
import {
  adjustMatchStatEntry,
  getFixtureScoreSummary,
  getMatchStatValue,
  matchStatLabels,
} from '@/lib/match-stats';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { MatchStatRow } from '@web/components/stats/match-stat-row';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubData } from '@web/lib/club-data-context';

type StatAction = {
  id: string;
  metric: MatchStatMetric;
  team: MatchStatTeam;
  delta: number;
  label: string;
  createdAt: string;
};

const STAT_GROUPS: { title: string; metrics: MatchStatMetric[] }[] = [
  { title: 'Scoring', metrics: ['goals', 'points'] },
  { title: 'Clearances', metrics: ['clearances'] },
  { title: 'Pressure & Contest', metrics: ['tackles', 'hit-outs', 'free-kicks'] },
  { title: 'Territory', metrics: ['inside-50s', 'marks-i50'] },
  { title: 'Marking / Intercept', metrics: ['uncontested-marks', 'intercept-marks'] },
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
  const { fixtureId = '' } = useParams();
  const { activeClub } = useClubAccess();
  const { fixtures, isHydrated, matchStats, setMatchStats } = useClubData();
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

  const scoreSummary = getFixtureScoreSummary(fixture.id, matchStats);
  const fixtureKey = fixture.id;
  const trackedTeamName = activeClub?.name ?? 'Our Club';
  const opponentTeamName = fixture.opponent;
  const homeTeamName = fixture.isHome ? trackedTeamName : opponentTeamName;
  const awayTeamName = fixture.isHome ? opponentTeamName : trackedTeamName;
  const homeTeamShort = getLastWord(homeTeamName) || 'Home';
  const awayTeamShort = getLastWord(awayTeamName) || 'Away';
  const homeTeamKey: MatchStatTeam = fixture.isHome ? 'ours' : 'theirs';
  const awayTeamKey: MatchStatTeam = fixture.isHome ? 'theirs' : 'ours';
  const homeScore = homeTeamKey === 'ours' ? scoreSummary.ours : scoreSummary.theirs;
  const awayScore = awayTeamKey === 'ours' ? scoreSummary.ours : scoreSummary.theirs;
  const totalHome = homeScore.score;
  const totalAway = awayScore.score;
  const latestAction = recentActions[0] ?? null;

  function recordStatChange(metric: MatchStatMetric, side: 'home' | 'away', delta: number) {
    const team = side === 'home' ? homeTeamKey : awayTeamKey;
    const teamLabel = side === 'home' ? homeTeamShort : awayTeamShort;
    const actionLabel = `${teamLabel} ${matchStatLabels[metric]} ${
      delta > 0 ? `+${delta}` : delta
    }`;

    setMatchStats((current) => {
      return adjustMatchStatEntry(current, fixtureKey, metric, team, delta);
    });
    setRecentActions((current) => {
      const nextAction: StatAction = {
        id: `${metric}-${team}-${Date.now()}`,
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
      return adjustMatchStatEntry(current, fixtureKey, action.metric, action.team, -action.delta);
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
              Live entry
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
          <button
            className="activity-rail__undo"
            disabled={!latestAction}
            onClick={undoLastAction}
            type="button">
            Undo Last Action
          </button>
          <div className="activity-rail__chips">
            {latestAction ? (
              <span className="activity-chip activity-chip--primary">{latestAction.label}</span>
            ) : (
              <span className="activity-chip">No actions yet</span>
            )}
            <span className="activity-chip">
              {isHydrated ? 'Stats save as you tap.' : 'Loading saved match stats...'}
            </span>
            <span className="activity-chip">
              Score {homeScore.goals}.{homeScore.points} - {awayScore.goals}.{awayScore.points}
            </span>
          </div>
        </section>

        <div className="live-stats-grid">
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
                        leftValue={getMatchStatValue(fixtureKey, metric, homeTeamKey, matchStats)}
                        rightLabel={awayTeamShort}
                        rightValue={getMatchStatValue(fixtureKey, metric, awayTeamKey, matchStats)}
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

          <section className="live-stat-card">
            <h3 className="live-stat-card__title">Score Snapshot</h3>
            <div className="score-snapshot">
              <div>
                <span className="score-snapshot__label">{homeTeamShort}</span>
                <strong>
                  {homeScore.goals}.{homeScore.points}
                </strong>
                <span className="muted">{homeScore.score} pts</span>
              </div>
              <div>
                <span className="score-snapshot__label">{awayTeamShort}</span>
                <strong>
                  {awayScore.goals}.{awayScore.points}
                </strong>
                <span className="muted">{awayScore.score} pts</span>
              </div>
            </div>
            <p className="muted">
              Use this board for rapid live entry. Detailed quarter breakdowns are still a future data
              model upgrade.
            </p>
          </section>
        </div>
      </section>
    </section>
  );
}
