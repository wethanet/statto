import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useClubData } from '@/lib/club-data-context';
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

export default function FitnessScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { fitnessResults, isHydrated, players, setFitnessResults } = useClubData();
  const [selectedPhase, setSelectedPhase] = useState<FitnessPhase>('start-of-season');
  const [selectedMetric, setSelectedMetric] = useState<FitnessMetric>('time-trial-1.2km');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [value, setValue] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const sortedPlayers = useMemo(() => {
    return getSortedTeam(players);
  }, [players]);

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
    return getFitnessResultsForSelection(players, fitnessResults, selectedMetric, selectedPhase);
  }, [fitnessResults, players, selectedMetric, selectedPhase]);
  const selectedPhaseSummary = getFitnessSummary(players, fitnessResults, selectedPhase);

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
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Fitness tracking</ThemedText>
        <ThemedText>
          Track the 1.2km time trial, agility, and speed across the start, middle, and end of the
          season.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Checkpoint coverage</ThemedText>
        <ThemedView style={styles.summaryRow}>
          {fitnessPhases.map((phase) => {
            const summary = getFitnessSummary(players, fitnessResults, phase.id);

            return (
              <ThemedView key={phase.id} style={styles.summaryPill}>
                <ThemedText type="defaultSemiBold">{phase.label}</ThemedText>
                <ThemedText>
                  {summary.completed}/{summary.totalSlots}
                </ThemedText>
              </ThemedView>
            );
          })}
        </ThemedView>
        <ThemedText style={styles.helperText}>
          {isHydrated
            ? 'Results are saved for the current club and can be updated at any time.'
            : 'Loading saved fitness results...'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Record result</ThemedText>
        <ThemedText>Results are stored as numeric scores. Enter times in seconds for consistency.</ThemedText>

        <ThemedView style={styles.segmentRow}>
          {fitnessPhases.map((phase) => {
            const isSelected = phase.id === selectedPhase;

            return (
              <Pressable
                key={phase.id}
                onPress={() => {
                  setSelectedPhase(phase.id);
                  setFormMessage(null);
                }}
                style={[styles.segmentButton, isSelected ? styles.segmentButtonSelected : undefined]}>
                <ThemedText style={isSelected ? styles.segmentButtonSelectedText : undefined}>
                  {phase.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.segmentRow}>
          {fitnessMetrics.map((metric) => {
            const isSelected = metric.id === selectedMetric;

            return (
              <Pressable
                key={metric.id}
                onPress={() => {
                  setSelectedMetric(metric.id);
                  setFormMessage(null);
                }}
                style={[styles.segmentButton, isSelected ? styles.segmentButtonSelected : undefined]}>
                <ThemedText style={isSelected ? styles.segmentButtonSelectedText : undefined}>
                  {metric.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <TextInput
          value={playerQuery}
          onChangeText={(nextValue) => {
            setPlayerQuery(nextValue);
            setSelectedPlayerId('');
            setFormMessage(null);
          }}
          placeholder="Search player by name or number"
          placeholderTextColor="#6B7280"
          autoCapitalize="words"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />

        {selectedPlayer ? (
          <Pressable onPress={clearSelectedPlayer} style={styles.clearButton}>
            <ThemedText style={styles.clearButtonText}>Clear selection</ThemedText>
          </Pressable>
        ) : null}

        <ThemedView style={styles.playerPicker}>
          {filteredPlayers.map((player) => {
            const isSelected = player.id === selectedPlayerId;

            return (
              <Pressable
                key={player.id}
                onPress={() => selectPlayer(player.id)}
                style={[styles.playerButton, isSelected ? styles.playerButtonSelected : undefined]}>
                <ThemedText style={isSelected ? styles.playerButtonSelectedText : undefined}>
                  {getPlayerDisplayName(player)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedText style={styles.helperText}>
          {selectedPlayer
            ? `Selected: ${getPlayerDisplayName(selectedPlayer)}`
            : `Tap a suggested player or type a name/number to filter for ${getFitnessMetricLabel(selectedMetric)}.`}
        </ThemedText>

        <TextInput
          value={value}
          onChangeText={(nextValue) => {
            setValue(nextValue);
            setFormMessage(null);
          }}
          placeholder={getFitnessMetricPlaceholder(selectedMetric)}
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />

        <Pressable onPress={handleSaveResult} style={styles.addButton}>
          <ThemedText style={styles.addButtonText}>
            {selectedPlayerResult ? 'Update result' : 'Save result'}
          </ThemedText>
        </Pressable>
        {formMessage ? <ThemedText style={styles.helperText}>{formMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.resultsCard}>
        <ThemedText type="subtitle">
          {getFitnessPhaseLabel(selectedPhase)} · {getFitnessMetricLabel(selectedMetric)}
        </ThemedText>
        <ThemedText style={styles.helperText}>
          {selectedPhaseSummary.completed}/{selectedPhaseSummary.totalSlots} results recorded for
          this checkpoint.
        </ThemedText>

        {selectedResults.length > 0 ? (
          selectedResults.map((result) => {
            const playerLabel = result.player ? getPlayerDisplayName(result.player) : 'Unknown player';

            return (
              <ThemedView key={`${result.playerId}-${result.metric}-${result.phase}`} style={styles.resultRow}>
                <ThemedView style={styles.resultMeta}>
                  <ThemedText type="defaultSemiBold">{playerLabel}</ThemedText>
                  <ThemedText>
                    {formatFitnessValue(result.value)} sec · Updated {formatRecordedAt(result.recordedAt)}
                  </ThemedText>
                </ThemedView>
                <Pressable
                  onPress={() => {
                    setFitnessResults((current) =>
                      deleteFitnessResult(current, result.playerId, result.metric, result.phase)
                    );
                  }}
                  style={styles.deleteButton}>
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </Pressable>
              </ThemedView>
            );
          })
        ) : (
          <ThemedText>No results yet for this checkpoint.</ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  summaryCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  summaryRow: {
    gap: 8,
  },
  summaryPill: {
    gap: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  formCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  resultsCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    backgroundColor: '#F3F4F6',
  },
  segmentButtonSelected: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  segmentButtonSelectedText: {
    color: '#FFFFFF',
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF6D6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0C15A',
  },
  clearButtonText: {
    color: '#8A6A00',
  },
  playerPicker: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  playerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  playerButtonSelected: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  playerButtonSelectedText: {
    color: '#FFFFFF',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0A7EA4',
  },
  addButtonText: {
    color: '#FFFFFF',
  },
  helperText: {
    color: '#6B7280',
  },
  resultRow: {
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  resultMeta: {
    gap: 4,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF1F0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E56A54',
  },
  deleteButtonText: {
    color: '#A43D2A',
  },
});
