import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useClubData } from '@/lib/club-data-context';
import {
  addFine,
  deleteFine,
  getFinePlayerName,
  getFineSummary,
  getSortedFines,
  toggleFinePaidStatus,
} from '@/lib/fines';
import { getPlayerDisplayName, getPlayerSortValue } from '@/lib/team';
import { FineRow } from '../../components/fines/fine-row';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';

export default function FinesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { fines, isHydrated, players, setFines } = useClubData();
  const activePlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.active)
      .sort((left, right) => getPlayerSortValue(left.number) - getPlayerSortValue(right.number));
  }, [players]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const summary = getFineSummary(fines);
  const sortedFines = getSortedFines(fines);
  const filteredPlayers = useMemo(() => {
    const normalizedQuery = playerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return activePlayers.filter((player) => {
      const searchableText = getPlayerDisplayName(player).toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [activePlayers, playerQuery]);
  const selectedPlayer = activePlayers.find((player) => player.id === selectedPlayerId);

  function selectPlayer(playerId: string) {
    const player = activePlayers.find((candidate) => candidate.id === playerId);

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
  }

  function handleAddFine() {
    const normalizedReason = reason.trim();
    const normalizedAmount = Number(amount);

    if (!selectedPlayerId) {
      setFormMessage('Choose a player before adding a fine.');
      return;
    }

    if (!normalizedReason) {
      setFormMessage('Enter a reason for the fine.');
      return;
    }

    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setFormMessage('Enter a valid fine amount greater than zero.');
      return;
    }

    setFines((current) =>
      addFine(current, {
        playerId: selectedPlayerId,
        reason: normalizedReason,
        amount: normalizedAmount,
      })
    );
    setReason('');
    setAmount('');
    setFormMessage('Fine added.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Player fines</ThemedText>
        <ThemedText>
          Track fines, what they were for, and whether the cash has actually been collected.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Summary</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText style={styles.neutral}>${summary.totalAmount} total</ThemedText>
          <ThemedText style={styles.negative}>${summary.outstandingAmount} outstanding</ThemedText>
          <ThemedText style={styles.positive}>${summary.paidAmount} paid</ThemedText>
        </ThemedView>
        <ThemedText style={styles.helperText}>
          {isHydrated
            ? `${summary.outstandingCount} fines still need collecting.`
            : 'Loading saved fines...'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Add fine</ThemedText>
        <ThemedText>Choose a player, enter the reason, and set the amount.</ThemedText>
        <TextInput
          value={playerQuery}
          onChangeText={(value) => {
            setPlayerQuery(value);
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
        {selectedPlayer ? (
          <ThemedText style={styles.helperText}>Selected: {getPlayerDisplayName(selectedPlayer)}</ThemedText>
        ) : (
          <ThemedText style={styles.helperText}>Type a player name or number, then choose a match.</ThemedText>
        )}
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason"
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
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
        <Pressable onPress={handleAddFine} style={styles.addButton}>
          <ThemedText style={styles.addButtonText}>Save fine</ThemedText>
        </Pressable>
        {formMessage ? <ThemedText style={styles.helperText}>{formMessage}</ThemedText> : null}
      </ThemedView>

      {sortedFines.map((fine) => {
        return (
          <FineRow
            key={fine.id}
            playerName={getFinePlayerName(fine.playerId, players)}
            reason={fine.reason}
            amount={fine.amount}
            issuedAt={fine.issuedAt}
            paid={fine.paid}
            onTogglePaid={() => {
              setFines((current) => toggleFinePaidStatus(current, fine.id));
            }}
            onDelete={() => {
              setFines((current) => deleteFine(current, fine.id));
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
    backgroundColor: '#F3F4F6',
  },
  playerButtonSelected: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  playerButtonSelectedText: {
    color: '#FFFFFF',
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  clearButton: {
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#0A7EA4',
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
