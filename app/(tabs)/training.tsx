import { useMemo } from 'react';
import { Href, Link } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useClubData } from '@/lib/club-data-context';
import { getAttendanceSummary, getSortedTrainingSessions } from '@/lib/attendance';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function TrainingScreen() {
  const { attendanceRecords, players, trainingSessions } = useClubData();
  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Training</ThemedText>
        <ThemedText>
          Track attendance across the week and keep coaches aligned on who is turning up.
        </ThemedText>
      </ThemedView>

      {sessions.length === 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">No sessions yet</ThemedText>
          <ThemedText>Add your first training session from the admin area to start tracking attendance.</ThemedText>
          <Link href={'/admin/training' as Href}>
            <ThemedText type="link">Open training setup</ThemedText>
          </Link>
        </ThemedView>
      ) : null}

      {sessions.map((session) => {
        const summary = getAttendanceSummary(session.id, players, attendanceRecords);

        return (
          <ThemedView key={session.id} style={styles.card}>
            <ThemedText type="subtitle">{session.title}</ThemedText>
            <ThemedText>{formatDate(session.date)}</ThemedText>
            <ThemedText>{session.location}</ThemedText>
            <ThemedView style={styles.row}>
              <ThemedText style={styles.positive}>{summary.present} present</ThemedText>
              <ThemedText style={styles.negative}>{summary.absent} absent</ThemedText>
              <ThemedText style={styles.neutral}>{summary.unknown} to confirm</ThemedText>
            </ThemedView>
            <Link href={`/training/${session.id}` as Href}>
              <ThemedText type="link">Open session</ThemedText>
            </Link>
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
