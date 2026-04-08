import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getNextTrainingSession, getAttendanceSummary } from '@/lib/attendance';
import { getNextFixture, getAvailabilitySummary } from '@/lib/availability';
import { attendanceRecords, availabilityRecords, fixtures, players, trainingSessions } from '@/lib/mock-data';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function HomeScreen() {
  const nextTraining = getNextTrainingSession(trainingSessions);
  const nextMatch = getNextFixture(fixtures);
  const trainingSummary = getAttendanceSummary(nextTraining.id, players, attendanceRecords);
  const matchSummary = getAvailabilitySummary(nextMatch.id, players, availabilityRecords);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedView style={styles.heroText}>
          <ThemedText type="title">Statto</ThemedText>
          <ThemedText>
            Keep training attendance, player availability, and weekly club admin in one place.
          </ThemedText>
        </ThemedView>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Next training</ThemedText>
        <ThemedText>{nextTraining.title}</ThemedText>
        <ThemedText>{formatDate(nextTraining.date)}</ThemedText>
        <ThemedText>{nextTraining.location}</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText style={styles.positive}>{trainingSummary.present} present</ThemedText>
          <ThemedText style={styles.negative}>{trainingSummary.absent} absent</ThemedText>
          <ThemedText style={styles.neutral}>{trainingSummary.unknown} to confirm</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Next match</ThemedText>
        <ThemedText>vs {nextMatch.opponent}</ThemedText>
        <ThemedText>{formatDate(nextMatch.date)}</ThemedText>
        <ThemedText>{nextMatch.venue}</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText style={styles.positive}>{matchSummary.available} available</ThemedText>
          <ThemedText style={styles.negative}>{matchSummary.unavailable} unavailable</ThemedText>
          <ThemedText style={styles.neutral}>{matchSummary.uncertain} uncertain</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Quick links</ThemedText>
        <Link href="/training">
          <ThemedText type="link">Open training attendance</ThemedText>
        </Link>
        <Link href="/matches">
          <ThemedText type="link">Open match availability</ThemedText>
        </Link>
        <Link href="/admin">
          <ThemedText type="link">Open admin workflows</ThemedText>
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
  hero: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#E6F4FE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroText: {
    flex: 1,
    gap: 8,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 72,
    height: 72,
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
