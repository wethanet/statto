import { File } from 'expo-file-system';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { TeamPlayerRow } from '../../components/team/team-player-row';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useClubData } from '@/lib/club-data-context';
import { deleteAttendanceRecordsForPlayer } from '@/lib/attendance';
import { deleteAvailabilityRecordsForPlayer } from '@/lib/availability';
import { deleteFinesForPlayer } from '@/lib/fines';
import { deleteFitnessResultsForPlayer } from '@/lib/fitness';
import { parsePlayersCsv } from '@/lib/team-csv';
import {
  addPlayer,
  cyclePlayerRole,
  deletePlayer,
  getSortedTeam,
  getTeamSummary,
  togglePlayerActive,
} from '@/lib/team';
import { deleteVoteEntriesForPlayer } from '@/lib/votes';

export default function TeamScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const {
    isHydrated,
    players,
    setAttendanceRecords,
    setAvailabilityRecords,
    setFitnessResults,
    setFines,
    setPlayers,
    setVoteEntries,
  } = useClubData();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [playerFormMessage, setPlayerFormMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('');
  const [pastedCsv, setPastedCsv] = useState('');
  const summary = getTeamSummary(players);
  const roster = getSortedTeam(players);

  async function handleImportCsv() {
    try {
      const pickedFile = await File.pickFileAsync(undefined, 'text/csv');
      const selectedFile = Array.isArray(pickedFile) ? pickedFile[0] : pickedFile;

      if (!selectedFile) {
        return;
      }

      const csvContent = await selectedFile.text();
      const importedPlayers = parsePlayersCsv(csvContent);
      const fileLabel = selectedFile.uri.split('/').pop() ?? 'selected CSV';

      setPlayers(importedPlayers);
      setImportMessage(`Imported ${importedPlayers.length} players from ${fileLabel}.`);
      setPlayerFormMessage(null);
    } catch (error) {
      if (error instanceof Error && error.message) {
        if (error.message.toLowerCase().includes('cancel')) {
          return;
        }

        setImportMessage(error.message);
        return;
      }

      setImportMessage('Could not import that CSV file.');
    }
  }

  function handleAddPlayer() {
    const normalizedName = name.trim();
    const normalizedNumberInput = number.trim();
    const normalizedNumber = normalizedNumberInput ? Number(normalizedNumberInput) : null;
    const normalizedPosition = position.trim() || null;

    if (!normalizedName) {
      setPlayerFormMessage('Enter a player name.');
      return;
    }

    if (
      normalizedNumberInput &&
      (!Number.isInteger(normalizedNumber) || normalizedNumber == null || normalizedNumber <= 0)
    ) {
      setPlayerFormMessage('Enter a valid guernsey number greater than zero.');
      return;
    }

    const duplicateNumber =
      normalizedNumber != null &&
      players.some((player) => {
        return player.number === normalizedNumber;
      });

    if (duplicateNumber) {
      setPlayerFormMessage(`Player number ${normalizedNumber} is already in use.`);
      return;
    }

    setPlayers((current) => {
      return addPlayer(current, {
        name: normalizedName,
        number: normalizedNumber,
        position: normalizedPosition,
      });
    });
    setName('');
    setNumber('');
    setPosition('');
    setPlayerFormMessage(`${normalizedName} was added to the roster.`);
  }

  function handleBulkCreatePlayers() {
    const normalizedCsv = pastedCsv.trim();

    if (!normalizedCsv) {
      setImportMessage('Paste CSV content before creating players.');
      return;
    }

    try {
      const importedPlayers = parsePlayersCsv(normalizedCsv);
      const seenNumbers = new Set<number>();

      for (const player of importedPlayers) {
        if (player.number == null) {
          continue;
        }

        if (seenNumbers.has(player.number)) {
          setImportMessage(`Pasted CSV includes duplicate player number ${player.number}.`);
          return;
        }

        seenNumbers.add(player.number);

        const existingPlayer = players.find((candidate) => candidate.number === player.number);

        if (existingPlayer) {
          setImportMessage(`Player number ${player.number} is already in use.`);
          return;
        }
      }

      const createdAt = Date.now();
      const playersToAdd = importedPlayers.map((player, index) => {
        return {
          ...player,
          id: `${player.id}-${createdAt}-${index}`,
        };
      });

      setPlayers((current) => [...current, ...playersToAdd]);
      setPastedCsv('');
      setPlayerFormMessage(null);
      setImportMessage(`Added ${playersToAdd.length} players from pasted CSV.`);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setImportMessage(error.message);
        return;
      }

      setImportMessage('Could not create players from the pasted CSV.');
    }
  }

  function handleDeletePlayer(playerId: string, playerName: string) {
    setPlayers((current) => {
      return deletePlayer(current, playerId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForPlayer(current, playerId);
    });
    setAvailabilityRecords((current) => {
      return deleteAvailabilityRecordsForPlayer(current, playerId);
    });
    setFitnessResults((current) => {
      return deleteFitnessResultsForPlayer(current, playerId);
    });
    setFines((current) => {
      return deleteFinesForPlayer(current, playerId);
    });
    setVoteEntries((current) => {
      return deleteVoteEntriesForPlayer(current, playerId);
    });
    setImportMessage(`${playerName} was removed from the roster.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Team management</ThemedText>
        <ThemedText>
          Keep the playing list current, adjust leadership roles, and mark who is in the active squad.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Roster summary</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText style={styles.neutral}>{summary.total} total</ThemedText>
          <ThemedText style={styles.positive}>{summary.active} active</ThemedText>
          <ThemedText style={styles.negative}>{summary.inactive} inactive</ThemedText>
          <ThemedText style={styles.neutral}>{summary.leaders} leaders</ThemedText>
        </ThemedView>
        <ThemedText style={styles.helperText}>
          {isHydrated ? 'Roster changes are saved on this device.' : 'Loading saved roster...'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Add player manually</ThemedText>
        <ThemedText>Enter a player directly if you do not want to upload a full CSV.</ThemedText>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setPlayerFormMessage(null);
          }}
          placeholder="Player name"
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
        <TextInput
          value={number}
          onChangeText={(value) => {
            setNumber(value);
            setPlayerFormMessage(null);
          }}
          placeholder="Guernsey number (optional)"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <TextInput
          value={position}
          onChangeText={(value) => {
            setPosition(value);
            setPlayerFormMessage(null);
          }}
          placeholder="Position (optional)"
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
        <Pressable onPress={handleAddPlayer} style={styles.importButton}>
          <ThemedText style={styles.importButtonText}>Add player</ThemedText>
        </Pressable>
        {playerFormMessage ? <ThemedText style={styles.helperText}>{playerFormMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.importCard}>
        <ThemedText type="subtitle">CSV upload</ThemedText>
        <ThemedText>
          Upload or paste CSV with a `name` column. Optional columns: `number`, `position`, `role`,
          `active`.
        </ThemedText>
        <ThemedText style={styles.helperText}>
          Importing replaces the current roster on this device.
        </ThemedText>
        <Pressable onPress={handleImportCsv} style={styles.importButton}>
          <ThemedText style={styles.importButtonText}>Upload player CSV</ThemedText>
        </Pressable>
        <TextInput
          value={pastedCsv}
          onChangeText={(value) => {
            setPastedCsv(value);
            setImportMessage(null);
          }}
          placeholder={'name,number,position\nJane Smith,12,Rover\nAlex Green,,Wing'}
          placeholderTextColor="#6B7280"
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            styles.csvInput,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <Pressable onPress={handleBulkCreatePlayers} style={styles.secondaryButton}>
          <ThemedText>Create players from pasted CSV</ThemedText>
        </Pressable>
        {importMessage ? <ThemedText style={styles.helperText}>{importMessage}</ThemedText> : null}
      </ThemedView>

      {roster.map((player) => {
        return (
          <TeamPlayerRow
            key={player.id}
            player={player}
            onToggleActive={() => {
              setPlayers((current) => togglePlayerActive(current, player.id));
            }}
            onCycleRole={() => {
              setPlayers((current) => cyclePlayerRole(current, player.id));
            }}
            onDelete={() => {
              handleDeletePlayer(player.id, player.name);
            }}
          />
        );
      })}
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
  importCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
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
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  importButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0A7EA4',
  },
  importButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    backgroundColor: '#F3F4F6',
  },
  csvInput: {
    minHeight: 120,
  },
  helperText: {
    color: '#6B7280',
  },
  positive: {
    color: '#0B7A42',
  },
  negative: {
    color: '#A43D2A',
  },
  neutral: {
    color: '#6B7280',
  },
});
