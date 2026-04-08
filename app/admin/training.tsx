import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addTrainingSession,
  deleteAttendanceRecordsForSession,
  deleteTrainingSession,
  getSortedTrainingSessions,
} from '@/lib/attendance';
import { useClubData } from '@/lib/club-data-context';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function TrainingAdminScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { setAttendanceRecords, trainingSessions, setTrainingSessions } = useClubData();
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [location, setLocation] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const sessions = useMemo(() => {
    return getSortedTrainingSessions(trainingSessions);
  }, [trainingSessions]);

  function handleAddSession() {
    const normalizedTitle = title.trim();
    const normalizedDate = sessionDate.trim();
    const normalizedTime = sessionTime.trim();
    const normalizedLocation = location.trim();

    if (!normalizedTitle) {
      setFormMessage('Enter a session title.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      setFormMessage('Enter the date as YYYY-MM-DD.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      setFormMessage('Enter the start time as HH:MM.');
      return;
    }

    if (!normalizedLocation) {
      setFormMessage('Enter a location.');
      return;
    }

    const sessionTimestamp = `${normalizedDate}T${normalizedTime}:00`;

    if (Number.isNaN(new Date(sessionTimestamp).getTime())) {
      setFormMessage('Enter a valid date and time.');
      return;
    }

    setTrainingSessions((current) => {
      return addTrainingSession(current, {
        title: normalizedTitle,
        date: sessionTimestamp,
        location: normalizedLocation,
      });
    });
    setTitle('');
    setSessionDate('');
    setSessionTime('');
    setLocation('');
    setFormMessage('Training session added.');
  }

  function handleDeleteSession(sessionId: string) {
    setTrainingSessions((current) => {
      return deleteTrainingSession(current, sessionId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForSession(current, sessionId);
    });
    setFormMessage('Training session deleted.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Training setup</ThemedText>
        <ThemedText>Create new training sessions for the group, then manage attendance from the training tab.</ThemedText>
        <Link href="/training">
          <ThemedText type="link">Open training attendance</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Add training session</ThemedText>
        <ThemedText>Set the title, date, time, and location for the next session.</ThemedText>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setFormMessage(null);
          }}
          placeholder="Session title"
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
          value={sessionDate}
          onChangeText={(value) => {
            setSessionDate(value);
            setFormMessage(null);
          }}
          placeholder="Date (YYYY-MM-DD)"
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
          value={sessionTime}
          onChangeText={(value) => {
            setSessionTime(value);
            setFormMessage(null);
          }}
          placeholder="Start time (HH:MM)"
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
          value={location}
          onChangeText={(value) => {
            setLocation(value);
            setFormMessage(null);
          }}
          placeholder="Location"
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <Pressable onPress={handleAddSession} style={styles.addButton}>
          <ThemedText style={styles.addButtonText}>Save session</ThemedText>
        </Pressable>
        {formMessage ? <ThemedText style={styles.helperText}>{formMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Upcoming sessions</ThemedText>
        {sessions.length > 0 ? (
          sessions.map((session) => {
            return (
              <ThemedView key={session.id} style={styles.sessionRow}>
                <ThemedText type="defaultSemiBold">{session.title}</ThemedText>
                <ThemedText>{formatDate(session.date)}</ThemedText>
                <ThemedText>{session.location}</ThemedText>
                <Pressable
                  onPress={() => {
                    handleDeleteSession(session.id);
                  }}
                  style={styles.deleteButton}>
                  <ThemedText style={styles.deleteButtonText}>Delete session</ThemedText>
                </Pressable>
              </ThemedView>
            );
          })
        ) : (
          <ThemedText>No training sessions yet.</ThemedText>
        )}
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
  formCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  sessionRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF1F0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E56A54',
  },
  deleteButtonText: {
    color: '#A43D2A',
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
  helperText: {
    color: '#6B7280',
  },
});
