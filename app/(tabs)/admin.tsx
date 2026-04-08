import { Href, Link } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getNextTrainingSession } from '@/lib/attendance';
import { useClubData } from '@/lib/club-data-context';
import { getFineSummary } from '@/lib/fines';
import { fitnessPhases, getFitnessSummary } from '@/lib/fitness';
import { useSettings } from '@/lib/settings-context';
import { getTeamSummary } from '@/lib/team';
import { getVoteLeaderboard } from '@/lib/votes';

export default function AdminScreen() {
  const { fines, fitnessResults, players, trainingSessions, voteEntries } = useClubData();
  const { themePreference } = useSettings();
  const fineSummary = getFineSummary(fines);
  const leaderboard = getVoteLeaderboard(players, voteEntries);
  const teamSummary = getTeamSummary(players);
  const voteLeader = leaderboard[0];
  const nextTraining = getNextTrainingSession(trainingSessions);
  const fitnessSummary = fitnessPhases.reduce((total, phase) => {
    return total + getFitnessSummary(players, fitnessResults, phase.id).completed;
  }, 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Admin</ThemedText>
        <ThemedText>
          This area will hold the volunteer and coach workflows that support the rest of the app.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Player fines</ThemedText>
        <ThemedText>
          {fineSummary.outstandingCount} outstanding fines worth ${fineSummary.outstandingAmount}.
        </ThemedText>
        <Link href="/admin/fines">
          <ThemedText type="link">Open fines workflow</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Player votes</ThemedText>
        <ThemedText>
          {voteLeader ? `${voteLeader.name} leads on ${voteLeader.totalPoints} votes.` : 'No votes yet.'}
        </ThemedText>
        <Link href={'/admin/votes' as Href}>
          <ThemedText type="link">Open votes leaderboard</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Team management</ThemedText>
        <ThemedText>
          {teamSummary.active} active players, {teamSummary.inactive} inactive, {teamSummary.leaders} in the leadership group.
        </ThemedText>
        <Link href={'/admin/team' as Href}>
          <ThemedText type="link">Open team management</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Training setup</ThemedText>
        <ThemedText>
          {nextTraining
            ? `Next session is ${nextTraining.title}.`
            : 'No training sessions have been added yet.'}
        </ThemedText>
        <Link href={'/admin/training' as Href}>
          <ThemedText type="link">Add training session</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Match setup</ThemedText>
        <ThemedText>Set up new fixtures before collecting player availability.</ThemedText>
        <Link href={'/admin/matches' as Href}>
          <ThemedText type="link">Add match</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Fitness tracking</ThemedText>
        <ThemedText>
          {fitnessSummary > 0
            ? `${fitnessSummary} fitness results recorded across the season checkpoints.`
            : 'No fitness results recorded yet.'}
        </ThemedText>
        <Link href={'/admin/fitness' as Href}>
          <ThemedText type="link">Open fitness tracking</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Settings</ThemedText>
        <ThemedText>Theme is currently set to {themePreference}.</ThemedText>
        <Link href={'/admin/settings' as Href}>
          <ThemedText type="link">Open settings</ThemedText>
        </Link>
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
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
});
