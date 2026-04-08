import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useClubData } from '@/lib/club-data-context';
import { getPlayerDisplayName } from '@/lib/team';
import { getVoteLeaderboard } from '@/lib/votes';

export default function VotesLeaderboardScreen() {
  const { players, voteEntries, isHydrated } = useClubData();
  const leaderboard = getVoteLeaderboard(players, voteEntries);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Votes leaderboard</ThemedText>
        <ThemedText>Keep a running season tally of the players polling best each week.</ThemedText>
      </ThemedView>

      <ThemedText style={styles.helperText}>
        {isHydrated ? 'Leaderboard is using saved local data.' : 'Loading saved votes...'}
      </ThemedText>

      {leaderboard.map((player, index) => {
        return (
          <ThemedView key={player.id} style={styles.card}>
            <ThemedText type="defaultSemiBold">{index + 1}. {getPlayerDisplayName(player)}</ThemedText>
            <ThemedText>
              {player.totalPoints} pts
              {player.position ? ` • ${player.position}` : ''}
            </ThemedText>
          </ThemedView>
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
  helperText: {
    color: '#6B7280',
  },
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
});
