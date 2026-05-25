import { useEffect, useMemo, useState } from 'react';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminActionPanel,
  AdminRecordList,
  AdminSection,
  AdminSummaryStrip,
} from '@web/components/admin/admin-workflow';
import { useClubData } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';

import {
  deleteFitnessResult,
  fitnessMetrics,
  fitnessPhases,
  formatFitnessValue,
  getFitnessMetricLabel,
  getFitnessMetricPlaceholder,
  getFitnessPhaseLabel,
  getFitnessResultForPlayer,
  getFitnessResultsForSelection,
  getFitnessSummary,
  upsertFitnessResult,
} from '@/lib/fitness';
import { getPlayerDisplayName, getSortedTeam } from '@/lib/team';
import type { FitnessMetric, FitnessPhase } from '@/lib/types';

function formatRecordedAt(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function FitnessAdminRoute() {
  const { fitnessResults, isHydrated, players, setFitnessResults } = useClubData();
  const { canManagePlayer } = useClubPermissions();
  const [selectedPhase, setSelectedPhase] = useState<FitnessPhase>('start-of-season');
  const [selectedMetric, setSelectedMetric] = useState<FitnessMetric>('time-trial-1.2km');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [value, setValue] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const sortedPlayers = useMemo(() => {
    return getSortedTeam(players.filter((player) => canManagePlayer(player)));
  }, [canManagePlayer, players]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = playerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return sortedPlayers.slice(0, 8);
    }

    return sortedPlayers.filter((player) => {
      return getPlayerDisplayName(player).toLowerCase().includes(normalizedQuery);
    });
  }, [playerQuery, sortedPlayers]);

  const selectedPlayer = sortedPlayers.find((player) => player.id === selectedPlayerId);
  const selectedPlayerResult = selectedPlayer
    ? getFitnessResultForPlayer(fitnessResults, selectedPlayer.id, selectedMetric, selectedPhase)
    : undefined;
  const selectedResults = useMemo(() => {
    return getFitnessResultsForSelection(sortedPlayers, fitnessResults, selectedMetric, selectedPhase);
  }, [fitnessResults, selectedMetric, selectedPhase, sortedPlayers]);
  const selectedPhaseSummary = getFitnessSummary(sortedPlayers, fitnessResults, selectedPhase);

  useEffect(() => {
    if (!selectedPlayerId) {
      setValue('');
      return;
    }

    if (selectedPlayerResult) {
      setValue(formatFitnessValue(selectedPlayerResult.value));
      return;
    }

    setValue('');
  }, [selectedPlayerId, selectedPlayerResult]);

  function selectPlayer(playerId: string) {
    const player = sortedPlayers.find((candidate) => candidate.id === playerId);

    if (!player) {
      return;
    }

    setSelectedPlayerId(player.id);
    setPlayerQuery(getPlayerDisplayName(player));
    setFormMessage(null);
  }

  function clearSelectedPlayer() {
    setSelectedPlayerId('');
    setPlayerQuery('');
    setValue('');
    setFormMessage(null);
  }

  function handleSaveResult() {
    const normalizedValue = Number(value.trim());

    if (!selectedPlayerId) {
      setFormMessage('Choose a player before saving a fitness result.');
      return;
    }

    if (Number.isNaN(normalizedValue) || normalizedValue <= 0) {
      setFormMessage('Enter a valid result greater than zero.');
      return;
    }

    setFitnessResults((current) => {
      return upsertFitnessResult(current, {
        playerId: selectedPlayerId,
        metric: selectedMetric,
        phase: selectedPhase,
        value: normalizedValue,
      });
    });
    setFormMessage(
      `${getFitnessMetricLabel(selectedMetric)} saved for ${selectedPlayer?.name ?? 'the selected player'}.`
    );
  }

  return (
    <AdminPageShell
      description="Track the 1.2km time trial, agility, and speed across the start, middle, and end of the season."
      title="Fitness tracking">
      <AdminSection
        eyebrow="Context"
        title="Checkpoint coverage"
        description={
          isHydrated
            ? 'Results are saved for the current club and can be updated at any time.'
            : 'Loading saved fitness results...'
        }>
        <AdminSummaryStrip
          items={fitnessPhases.map((phase) => {
            const summary = getFitnessSummary(players, fitnessResults, phase.id);

            return {
              label: phase.label,
              value: `${summary.completed}/${summary.totalSlots}`,
              note: 'results recorded',
            };
          })}
        />
      </AdminSection>

      <AdminSection
        eyebrow="Primary workflow"
        title="Record a result"
        description="Choose the checkpoint and metric first, then select a player and save the numeric result.">
        <AdminActionPanel title="Fitness result entry" description="Enter times in seconds so comparisons stay consistent.">
          <div className="inline-actions">
            {fitnessPhases.map((phase) => {
              const isSelected = phase.id === selectedPhase;

              return (
                <button
                  key={phase.id}
                  className={isSelected ? 'pill-button pill-button--selected' : 'pill-button'}
                  onClick={() => {
                    setSelectedPhase(phase.id);
                    setFormMessage(null);
                  }}
                  type="button">
                  {phase.label}
                </button>
              );
            })}
          </div>

          <div className="inline-actions">
            {fitnessMetrics.map((metric) => {
              const isSelected = metric.id === selectedMetric;

              return (
                <button
                  key={metric.id}
                  className={isSelected ? 'pill-button pill-button--selected' : 'pill-button'}
                  onClick={() => {
                    setSelectedMetric(metric.id);
                    setFormMessage(null);
                  }}
                  type="button">
                  {metric.label}
                </button>
              );
            })}
          </div>

          <label className="field">
            <span>Player search</span>
            <input
              className="input"
              onChange={(event) => {
                setPlayerQuery(event.target.value);
                setSelectedPlayerId('');
                setFormMessage(null);
              }}
              placeholder="Search player by name or number"
              value={playerQuery}
            />
          </label>

          {selectedPlayer ? (
            <button className="button button--warning" onClick={clearSelectedPlayer} type="button">
              Clear selection
            </button>
          ) : null}

          <div className="inline-actions">
            {filteredPlayers.map((player) => {
              const isSelected = player.id === selectedPlayerId;

              return (
                <button
                  key={player.id}
                  className={isSelected ? 'pill-button pill-button--selected' : 'pill-button'}
                  onClick={() => selectPlayer(player.id)}
                  type="button">
                  {getPlayerDisplayName(player)}
                </button>
              );
            })}
          </div>

          <p className="muted">
            {selectedPlayer
              ? `Selected: ${getPlayerDisplayName(selectedPlayer)}`
              : `Tap a suggested player or type a name/number to filter for ${getFitnessMetricLabel(selectedMetric)}.`}
          </p>

          <label className="field">
            <span>Result</span>
            <input
              className="input"
              inputMode="decimal"
              onChange={(event) => {
                setValue(event.target.value);
                setFormMessage(null);
              }}
              placeholder={getFitnessMetricPlaceholder(selectedMetric)}
              value={value}
            />
          </label>

          <div className="inline-actions">
            <button className="button" onClick={handleSaveResult} type="button">
              {selectedPlayerResult ? 'Update result' : 'Save result'}
            </button>
            {formMessage ? <p className="muted">{formMessage}</p> : null}
          </div>
        </AdminActionPanel>
      </AdminSection>

      <AdminSection
        eyebrow="Records"
        title="Saved results"
        description="The list follows the selected checkpoint and metric so coaches can check coverage immediately.">
        <AdminRecordList
          title={`${getFitnessPhaseLabel(selectedPhase)} · ${getFitnessMetricLabel(selectedMetric)}`}
          description={`${selectedPhaseSummary.completed}/${selectedPhaseSummary.totalSlots} results recorded for this checkpoint.`}>
          {selectedResults.length > 0 ? (
            selectedResults.map((result) => {
              const playerLabel = result.player ? getPlayerDisplayName(result.player) : 'Unknown player';

              return (
                <div key={`${result.playerId}-${result.metric}-${result.phase}`} className="row-card">
                  <div className="stack-sm">
                    <strong>{playerLabel}</strong>
                    <span className="muted">
                      {formatFitnessValue(result.value)} sec · Updated {formatRecordedAt(result.recordedAt)}
                    </span>
                  </div>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      setFitnessResults((current) =>
                        deleteFitnessResult(current, result.playerId, result.metric, result.phase)
                      );
                    }}
                    type="button">
                    Delete
                  </button>
                </div>
              );
            })
          ) : (
            <p className="muted">No results yet for this checkpoint.</p>
          )}
        </AdminRecordList>
      </AdminSection>
    </AdminPageShell>
  );
}
