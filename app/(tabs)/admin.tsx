import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const adminAreas = [
  {
    title: 'Player Votes',
    description: 'Set up the post-match voting workflow and season leaderboard.',
  },
  {
    title: 'Player Fines',
    description: 'Track fines, reasons, and payment status in one place.',
  },
  {
    title: 'Club Setup',
    description: 'Keep the team list, fixtures, and roles organised as the season evolves.',
  },
];

export default function AdminScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Admin</ThemedText>
        <ThemedText>
          This area will hold the volunteer and coach workflows that support the rest of the app.
        </ThemedText>
      </ThemedView>

      {adminAreas.map((area) => {
        return (
          <ThemedView key={area.title} style={styles.card}>
            <ThemedText type="subtitle">{area.title}</ThemedText>
            <ThemedText>{area.description}</ThemedText>
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
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
});
