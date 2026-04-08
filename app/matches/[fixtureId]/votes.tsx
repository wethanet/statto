import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import { VotePlayerRow } from '../../../components/votes/vote-player-row';
import { useClubData } from '@/lib/club-data-context';
import { getFixtureById } from '@/lib/availability';
import { getFixtureVoteTotal, getPlayersForFixtureVotes, upsertVoteEntry } from '@/lib/votes';

export default function MatchVotesScreen() {
  const { fixtureId } = useLocalSearchParams<{ fixtureId: string }>();
  const { fixtures, players, voteEntries, setVoteEntries, isHydrated } = useClubData();
  const fixture = getFixtureById(fixtureId, fixtures);

  const playersForFixture = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return getPlayersForFixtureVotes(fixture.id, players, voteEntries);
  }, [fixture, players, voteEntries]);

  if (!fixture) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="title">Fixture not found</ThemedText>
        <ThemedText>Check the selected match and try again.</ThemedText>
      </ThemedView>
    );
  }

  const totalVotes = getFixtureVoteTotal(fixture.id, voteEntries);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">
          Votes {fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}
        </ThemedText>
        <ThemedText>Record post-match votes and keep the season leaderboard moving.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Match summary</ThemedText>
        <ThemedText>{totalVotes} total vote points allocated</ThemedText>
        <ThemedText style={styles.helperText}>
          {isHydrated ? 'Changes are saved on this device.' : 'Loading saved votes...'}
        </ThemedText>
      </ThemedView>

      {playersForFixture.map((player) => {
        return (
          <VotePlayerRow
            key={player.id}
            player={player}
            points={player.points}
            onChange={(points) => {
              setVoteEntries((current) => upsertVoteEntry(current, fixture.id, player.id, points));
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
  helperText: {
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});
