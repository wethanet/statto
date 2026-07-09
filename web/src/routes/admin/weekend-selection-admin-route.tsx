import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getAvailabilityResponseStatusForPlayer, getSortedFixtures, normalizeFixtureSquad } from '@/lib/availability';
import {
  clearMatchLineupAssignmentPosition,
  upsertMatchLineupAssignment,
} from '@/lib/match-lineup';
import { getPlayerSortValue } from '@/lib/team';
import type { Fixture, MatchLineupAssignment, Player, PlayerSquad } from '@/lib/types';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { AdminSection, AdminSupportingPanel } from '@web/components/admin/admin-workflow';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPolicy } from '@web/lib/club-policy-context';

type WeekendColumn = 'cup' | 'both' | 'plate';

type WeekendOption = {
  key: string;
  date: string;
  label: string;
  cupFixture: Fixture | null;
  plateFixture: Fixture | null;
};

type AvailablePlayer = {
  player: Player;
  column: WeekendColumn;
  isAvailableForCup: boolean;
  isAvailableForPlate: boolean;
  isSelectedForCup: boolean;
  isSelectedForPlate: boolean;
};

const WEEKEND_COLUMNS: { key: WeekendColumn; title: string }[] = [
  { key: 'cup', title: 'Cup' },
  { key: 'both', title: 'Both' },
  { key: 'plate', title: 'Plate' },
];

function getDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getWeekendKey(value: string) {
  const date = new Date(value);
  const day = date.getDay();
  const daysFromFriday = day === 0 ? 2 : day >= 5 ? day - 5 : day + 2;

  date.setDate(date.getDate() - daysFromFriday);

  return getDateKey(date.toISOString());
}

function formatWeekendLabel(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

function formatFixtureMeta(fixture: Fixture | null) {
  if (!fixture) {
    return 'No fixture';
  }

  return `${fixture.grade ? `${fixture.grade} vs ` : 'vs '}${fixture.opponent}`;
}

function getFixtureSquad(fixture: Fixture, labels: { cup: string; plate: string }): PlayerSquad | null {
  const normalizedSquad = normalizeFixtureSquad(fixture);

  if (normalizedSquad) {
    return normalizedSquad;
  }

  const normalizedGrade = fixture.grade?.trim().toLowerCase() ?? '';
  const cupLabel = labels.cup.trim().toLowerCase();
  const plateLabel = labels.plate.trim().toLowerCase();

  if (cupLabel && normalizedGrade.includes(cupLabel)) {
    return 'cup';
  }

  if (plateLabel && normalizedGrade.includes(plateLabel)) {
    return 'plate';
  }

  return null;
}

function buildWeekendOptions(
  fixtures: Fixture[],
  labels: { cup: string; plate: string }
): WeekendOption[] {
  const fixtureGroups = new Map<string, { date: string; cupFixture: Fixture | null; plateFixture: Fixture | null }>();

  getSortedFixtures(fixtures).forEach((fixture) => {
    const squad = getFixtureSquad(fixture, labels);

    if (squad !== 'cup' && squad !== 'plate') {
      return;
    }

    const key = getWeekendKey(fixture.date);
    const existing = fixtureGroups.get(key) ?? {
      date: fixture.date,
      cupFixture: null,
      plateFixture: null,
    };

    if (squad === 'cup' && !existing.cupFixture) {
      existing.cupFixture = fixture;
    }

    if (squad === 'plate' && !existing.plateFixture) {
      existing.plateFixture = fixture;
    }

    fixtureGroups.set(key, existing);
  });

  return Array.from(fixtureGroups.entries()).map(([key, group]) => {
    const fixturesForWeekend = [group.cupFixture, group.plateFixture].filter(
      (fixture): fixture is Fixture => fixture !== null
    );
    const firstFixtureDate =
      getSortedFixtures(fixturesForWeekend)[0]?.date ?? group.date;

    return {
      key,
      date: firstFixtureDate,
      label: formatWeekendLabel(firstFixtureDate),
      cupFixture: group.cupFixture,
      plateFixture: group.plateFixture,
    };
  });
}

function isPlayerSelected(fixtureId: string | null, playerId: string, assignments: MatchLineupAssignment[]) {
  if (!fixtureId) {
    return false;
  }

  return assignments.some((assignment) => {
    return assignment.fixtureId === fixtureId && assignment.playerId === playerId && assignment.position !== null;
  });
}

function updateFixtureSelection(
  assignments: MatchLineupAssignment[],
  fixtureId: string | null,
  playerId: string,
  isSelected: boolean
) {
  if (!fixtureId) {
    return assignments;
  }

  if (isSelected) {
    return upsertMatchLineupAssignment(assignments, fixtureId, playerId, 'Int');
  }

  return clearMatchLineupAssignmentPosition(assignments, fixtureId, playerId);
}

export function WeekendSelectionAdminRoute() {
  useEnsureClubCollections(['fixtures', 'matchLineupAssignments', 'players']);

  const { availabilityRecords, fixtures, matchLineupAssignments, players, setMatchLineupAssignments, syncDebug } =
    useClubData();
  const { policySettings } = useClubPolicy();
  const [selectedWeekendKey, setSelectedWeekendKey] = useState<string | null>(null);
  const labels = useMemo(
    () => ({
      cup: policySettings.higherGradeLabel || 'Cup',
      plate: policySettings.lowerGradeLabel || 'Plate',
    }),
    [policySettings.higherGradeLabel, policySettings.lowerGradeLabel]
  );
  const weekendOptions = useMemo(() => buildWeekendOptions(fixtures, labels), [fixtures, labels]);
  const selectedWeekend = useMemo(() => {
    if (weekendOptions.length === 0) {
      return null;
    }

    const explicitlySelected = weekendOptions.find((option) => option.key === selectedWeekendKey);

    if (explicitlySelected) {
      return explicitlySelected;
    }

    return (
      weekendOptions.find((option) => new Date(option.date).getTime() >= Date.now()) ??
      weekendOptions[0]
    );
  }, [selectedWeekendKey, weekendOptions]);
  const cupFixtureId = selectedWeekend?.cupFixture?.id ?? null;
  const plateFixtureId = selectedWeekend?.plateFixture?.id ?? null;
  const availablePlayers = useMemo<AvailablePlayer[]>(() => {
    return players
      .filter((player) => player.active)
      .map((player) => {
        const isAvailableForCup =
          Boolean(cupFixtureId) &&
          getAvailabilityResponseStatusForPlayer(cupFixtureId ?? '', player.id, availabilityRecords) === 'available';
        const isAvailableForPlate =
          Boolean(plateFixtureId) &&
          getAvailabilityResponseStatusForPlayer(plateFixtureId ?? '', player.id, availabilityRecords) === 'available';

        if (!isAvailableForCup && !isAvailableForPlate) {
          return null;
        }

        const column: WeekendColumn =
          isAvailableForCup && isAvailableForPlate ? 'both' : isAvailableForCup ? 'cup' : 'plate';

        return {
          player,
          column,
          isAvailableForCup,
          isAvailableForPlate,
          isSelectedForCup: isPlayerSelected(cupFixtureId, player.id, matchLineupAssignments),
          isSelectedForPlate: isPlayerSelected(plateFixtureId, player.id, matchLineupAssignments),
        };
      })
      .filter((player): player is AvailablePlayer => player !== null)
      .sort((left, right) => {
        return (
          getPlayerSortValue(left.player.number) - getPlayerSortValue(right.player.number) ||
          left.player.name.localeCompare(right.player.name)
        );
      });
  }, [availabilityRecords, cupFixtureId, matchLineupAssignments, plateFixtureId, players]);
  const playersByColumn = useMemo(() => {
    return WEEKEND_COLUMNS.reduce<Record<WeekendColumn, AvailablePlayer[]>>(
      (current, column) => ({
        ...current,
        [column.key]: availablePlayers.filter((player) => player.column === column.key),
      }),
      { cup: [], both: [], plate: [] }
    );
  }, [availablePlayers]);
  const selectedCupCount = availablePlayers.filter((player) => player.isSelectedForCup).length;
  const selectedPlateCount = availablePlayers.filter((player) => player.isSelectedForPlate).length;

  function handleToggleSelection(playerId: string, team: PlayerSquad) {
    const fixtureId = team === 'cup' ? cupFixtureId : plateFixtureId;

    setMatchLineupAssignments((current) => {
      const currentlySelected = isPlayerSelected(fixtureId, playerId, current);

      return updateFixtureSelection(current, fixtureId, playerId, !currentlySelected);
    });
  }

  return (
    <AdminPageShell
      actions={
        <Link className="text-link" to="/matches">
          Open match availability
        </Link>
      }
      description="Pick the weekend Cup and Plate sides from players who have marked themselves available."
      title="Weekend team selection">
      <AdminSection
        eyebrow="Selection board"
        title="Available players"
        description="Players are grouped by the teams they are available for. Players in Both can be selected for Cup, Plate, or both.">
        <section className="card stack">
          <div className="weekend-selection__toolbar">
            <label className="field weekend-selection__weekend-field">
              <span>Weekend</span>
              <select
                className="input"
                onChange={(event) => setSelectedWeekendKey(event.target.value)}
                value={selectedWeekend?.key ?? ''}>
                {weekendOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="weekend-selection__team-totals" aria-label="Selected players">
              <span>{labels.cup}: {selectedCupCount}</span>
              <span>{labels.plate}: {selectedPlateCount}</span>
            </div>
          </div>

          <div className="weekend-selection__fixture-strip">
            <span>{labels.cup}: {formatFixtureMeta(selectedWeekend?.cupFixture ?? null)}</span>
            <span>{labels.plate}: {formatFixtureMeta(selectedWeekend?.plateFixture ?? null)}</span>
          </div>

          {syncDebug.lastSyncError ? <p className="muted">{syncDebug.lastSyncError}</p> : null}

          {selectedWeekend ? (
            <div className="weekend-selection-board">
              {WEEKEND_COLUMNS.map((column) => (
                <section className="weekend-selection-column" key={column.key}>
                  <div className="weekend-selection-column__header">
                    <h3>{column.title}</h3>
                    <span>{playersByColumn[column.key].length}</span>
                  </div>

                  <div className="weekend-selection-column__list">
                    {playersByColumn[column.key].length > 0 ? (
                      playersByColumn[column.key].map((availablePlayer) => (
                        <article className="weekend-selection-player" key={availablePlayer.player.id}>
                          <div className="weekend-selection-player__identity">
                            <strong>{availablePlayer.player.name}</strong>
                            {availablePlayer.player.number != null ? (
                              <span>#{availablePlayer.player.number}</span>
                            ) : null}
                          </div>

                          <div className="inline-actions weekend-selection-player__actions">
                            {availablePlayer.isAvailableForCup ? (
                              <button
                                className={
                                  availablePlayer.isSelectedForCup
                                    ? 'pill-button pill-button--compact pill-button--selected'
                                    : 'pill-button pill-button--compact'
                                }
                                disabled={!cupFixtureId}
                                onClick={() => handleToggleSelection(availablePlayer.player.id, 'cup')}
                                type="button">
                                {labels.cup}
                              </button>
                            ) : null}
                            {availablePlayer.isAvailableForPlate ? (
                              <button
                                className={
                                  availablePlayer.isSelectedForPlate
                                    ? 'pill-button pill-button--compact pill-button--selected'
                                    : 'pill-button pill-button--compact'
                                }
                                disabled={!plateFixtureId}
                                onClick={() => handleToggleSelection(availablePlayer.player.id, 'plate')}
                                type="button">
                                {labels.plate}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="muted">No available players.</p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="muted">Add Cup and Plate fixtures before using weekend selection.</p>
          )}
        </section>
      </AdminSection>

      <AdminSection
        eyebrow="How it saves"
        title="Selection source"
        description="Selections save immediately into the existing match lineup records for each fixture.">
        <AdminSupportingPanel
          title="Shared match data"
          description="Selected players appear in fixture selection, votes, games played, stats, and the team announcement flow because this board uses the same lineup assignment data."
        />
      </AdminSection>
    </AdminPageShell>
  );
}
