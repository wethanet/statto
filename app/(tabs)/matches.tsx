import { ScrollView, StyleSheet } from 'react-native';

import { getAvailabilitySummary, getSortedFixtures } from '@/lib/availability';
import { availabilityRecords, fixtures, players } from '@/lib/mock-data';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MatchesScreen() {
  const upcomingFixtures = getSortedFixtures(fixtures);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Matches</ThemedText>
        <ThemedText>
          See upcoming fixtures and get a quick read on team availability before selection night.
        </ThemedText>
      </ThemedView>

      {upcomingFixtures.map((fixture) => {
        const summary = getAvailabilitySummary(fixture.id, players, availabilityRecords);
        const label = fixture.isHome ? 'Home' : 'Away';

        return (
          <ThemedView key={fixture.id} style={styles.card}>
            <ThemedText type="subtitle">vs {fixture.opponent}</ThemedText>
            <ThemedText>
              {label} • {formatDate(fixture.date)}
            </ThemedText>
            <ThemedText>{fixture.venue}</ThemedText>
            <ThemedView style={styles.row}>
              <ThemedText style={styles.positive}>{summary.available} available</ThemedText>
              <ThemedText style={styles.negative}>{summary.unavailable} unavailable</ThemedText>
              <ThemedText style={styles.neutral}>{summary.uncertain} uncertain</ThemedText>
            </ThemedView>
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
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
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
