import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AttendancePlayerRow } from '../../components/attendance/attendance-player-row';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useClubData } from '@/lib/club-data-context';
import {
  getAttendanceSummary,
  getPlayersForSession,
  getTrainingSessionById,
  upsertAttendanceRecord,
} from '@/lib/attendance';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function TrainingSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { attendanceRecords, isHydrated, players, setAttendanceRecords, trainingSessions } =
    useClubData();
  const session = getTrainingSessionById(sessionId, trainingSessions);

  const playersForSession = useMemo(() => {
    if (!session) {
      return [];
    }

    return getPlayersForSession(session.id, players, attendanceRecords);
  }, [attendanceRecords, players, session]);

  if (!session) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="title">Training session not found</ThemedText>
        <ThemedText>Check the selected session and try again.</ThemedText>
      </ThemedView>
    );
  }

  const summary = getAttendanceSummary(session.id, players, attendanceRecords);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{session.title}</ThemedText>
        <ThemedText>{formatDate(session.date)}</ThemedText>
        <ThemedText>{session.location}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Session summary</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText style={styles.positive}>{summary.present} present</ThemedText>
          <ThemedText style={styles.negative}>{summary.absent} absent</ThemedText>
          <ThemedText style={styles.neutral}>{summary.unknown} to confirm</ThemedText>
        </ThemedView>
        <ThemedText style={styles.helperText}>
          {isHydrated ? 'Changes are saved on this device.' : 'Loading saved attendance...'}
        </ThemedText>
      </ThemedView>

      {playersForSession.map((player) => {
        return (
          <AttendancePlayerRow
            key={player.id}
            player={player}
            status={player.attendanceStatus}
            onChange={(status) => {
              setAttendanceRecords((current) => {
                return upsertAttendanceRecord(current, session.id, player.id, status);
              });
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
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});
