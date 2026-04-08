import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addFixture,
  deleteAvailabilityRecordsForFixture,
  deleteFixture,
  getSortedFixtures,
  updateFixture,
} from '@/lib/availability';
import { useClubData } from '@/lib/club-data-context';
import { importFixturesFromCalendarUrl, normalizeWebcalUrl } from '@/lib/fixture-calendar';
import { deleteVoteEntriesForFixture } from '@/lib/votes';

type FixtureFormResult =
  | {
      error: string;
    }
  | {
      input: {
        opponent: string;
        grade: string | null;
        date: string;
        venue: string;
        isHome: boolean;
      };
    };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MatchSetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { fixtures, setAvailabilityRecords, setFixtures, setVoteEntries } = useClubData();
  const [opponent, setOpponent] = useState('');
  const [grade, setGrade] = useState('');
  const [fixtureDate, setFixtureDate] = useState('');
  const [fixtureTime, setFixtureTime] = useState('');
  const [venue, setVenue] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const sortedFixtures = useMemo(() => {
    return getSortedFixtures(fixtures);
  }, [fixtures]);

  function resetFixtureForm() {
    setOpponent('');
    setGrade('');
    setFixtureDate('');
    setFixtureTime('');
    setVenue('');
    setIsHome(true);
    setEditingFixtureId(null);
  }

  function getFixtureInputFromForm(): FixtureFormResult {
    const normalizedOpponent = opponent.trim();
    const normalizedGrade = grade.trim() || null;
    const normalizedDate = fixtureDate.trim();
    const normalizedTime = fixtureTime.trim();
    const normalizedVenue = venue.trim();

    if (!normalizedOpponent) {
      return { error: 'Enter the opposition club.' };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return { error: 'Enter the date as YYYY-MM-DD.' };
    }

    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      return { error: 'Enter the start time as HH:MM.' };
    }

    if (!normalizedVenue) {
      return { error: 'Enter a venue.' };
    }

    const fixtureTimestamp = `${normalizedDate}T${normalizedTime}:00`;

    if (Number.isNaN(new Date(fixtureTimestamp).getTime())) {
      return { error: 'Enter a valid date and time.' };
    }

    return {
      input: {
        opponent: normalizedOpponent,
        grade: normalizedGrade,
        date: fixtureTimestamp,
        venue: normalizedVenue,
        isHome,
      },
    };
  }

  function handleSaveFixture() {
    const result = getFixtureInputFromForm();

    if ('error' in result) {
      setFormMessage(result.error);
      return;
    }

    setFixtures((current) => {
      if (editingFixtureId) {
        return updateFixture(current, editingFixtureId, result.input);
      }

      return addFixture(current, result.input);
    });

    resetFixtureForm();
    setFormMessage(editingFixtureId ? 'Match updated.' : 'Match added.');
  }

  function handleEditFixture(fixtureId: string) {
    const fixture = fixtures.find((currentFixture) => currentFixture.id === fixtureId);

    if (!fixture) {
      setFormMessage('Match not found.');
      return;
    }

    const [datePart, timePartWithSeconds = '00:00:00'] = fixture.date.split('T');
    const timePart = timePartWithSeconds.slice(0, 5);

    setEditingFixtureId(fixture.id);
    setOpponent(fixture.opponent);
    setGrade(fixture.grade ?? '');
    setFixtureDate(datePart ?? '');
    setFixtureTime(timePart);
    setVenue(fixture.venue);
    setIsHome(fixture.isHome);
    setFormMessage(`Editing ${fixture.opponent}.`);
  }

  async function handleImportCalendar() {
    const normalizedUrl = normalizeWebcalUrl(calendarUrl);

    if (!normalizedUrl) {
      setCalendarMessage('Enter a webcal link before importing.');
      return;
    }

    setIsImportingCalendar(true);
    setCalendarMessage(null);

    try {
      const result = await importFixturesFromCalendarUrl(normalizedUrl, fixtures);

      setFixtures(result.fixtures);
      setCalendarUrl('');

      if (result.importedCount === 0) {
        setCalendarMessage(`No new matches were imported. ${result.skippedCount} duplicates were skipped.`);
        return;
      }

      if (result.skippedCount > 0) {
        setCalendarMessage(
          `Imported ${result.importedCount} matches. ${result.skippedCount} duplicates were skipped.`
        );
        return;
      }

      setCalendarMessage(`Imported ${result.importedCount} matches from the calendar feed.`);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setCalendarMessage(error.message);
      } else {
        setCalendarMessage('Could not import matches from that calendar feed.');
      }
    } finally {
      setIsImportingCalendar(false);
    }
  }

  function handleDeleteFixture(fixtureId: string) {
    setFixtures((current) => {
      return deleteFixture(current, fixtureId);
    });
    setAvailabilityRecords((current) => {
      return deleteAvailabilityRecordsForFixture(current, fixtureId);
    });
    setVoteEntries((current) => {
      return deleteVoteEntriesForFixture(current, fixtureId);
    });
    setFormMessage('Match deleted.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Match setup</ThemedText>
        <ThemedText>Create fixtures for the season, then manage availability from the matches tab.</ThemedText>
        <Link href="/matches">
          <ThemedText type="link">Open match availability</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Add fixture</ThemedText>
        <ThemedText>
          {editingFixtureId
            ? 'Update the imported or saved match details, then save the correction.'
            : 'Set the opposition, date, time, venue, and whether it is home or away.'}
        </ThemedText>
        <TextInput
          value={opponent}
          onChangeText={(value) => {
            setOpponent(value);
            setFormMessage(null);
          }}
          placeholder="Opponent"
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
          value={grade}
          onChangeText={(value) => {
            setGrade(value);
            setFormMessage(null);
          }}
          placeholder="Grade (optional)"
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
          value={fixtureDate}
          onChangeText={(value) => {
            setFixtureDate(value);
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
          value={fixtureTime}
          onChangeText={(value) => {
            setFixtureTime(value);
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
          value={venue}
          onChangeText={(value) => {
            setVenue(value);
            setFormMessage(null);
          }}
          placeholder="Venue"
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <ThemedView style={styles.toggleRow}>
          <Pressable
            onPress={() => {
              setIsHome(true);
              setFormMessage(null);
            }}
            style={[styles.toggleButton, isHome ? styles.toggleButtonSelected : undefined]}>
            <ThemedText style={isHome ? styles.toggleButtonSelectedText : undefined}>Home</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setIsHome(false);
              setFormMessage(null);
            }}
            style={[styles.toggleButton, !isHome ? styles.toggleButtonSelected : undefined]}>
            <ThemedText style={!isHome ? styles.toggleButtonSelectedText : undefined}>Away</ThemedText>
          </Pressable>
        </ThemedView>
        <ThemedView style={styles.actionRow}>
          <Pressable onPress={handleSaveFixture} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>
              {editingFixtureId ? 'Update match' : 'Save match'}
            </ThemedText>
          </Pressable>
          {editingFixtureId ? (
            <Pressable
              onPress={() => {
                resetFixtureForm();
                setFormMessage('Edit cancelled.');
              }}
              style={styles.secondaryButton}>
              <ThemedText>Cancel edit</ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
        {formMessage ? <ThemedText style={styles.helperText}>{formMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Import from webcal</ThemedText>
        <ThemedText>
          Paste a `webcal://` or `https://` calendar feed and import fixtures from the event summaries,
          start times, and locations.
        </ThemedText>
        <TextInput
          value={calendarUrl}
          onChangeText={(value) => {
            setCalendarUrl(value);
            setCalendarMessage(null);
          }}
          placeholder="webcal://example.com/fixtures.ics"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <Pressable
          onPress={handleImportCalendar}
          disabled={isImportingCalendar}
          style={[styles.addButton, isImportingCalendar ? styles.buttonDisabled : undefined]}>
          <ThemedText style={styles.addButtonText}>
            {isImportingCalendar ? 'Importing matches...' : 'Import calendar'}
          </ThemedText>
        </Pressable>
        <ThemedText style={styles.helperText}>
          Existing matches are kept, and duplicates by opponent, date, venue, and home/away are skipped.
        </ThemedText>
        {calendarMessage ? <ThemedText style={styles.helperText}>{calendarMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Upcoming fixtures</ThemedText>
        {sortedFixtures.length > 0 ? (
          sortedFixtures.map((fixture) => {
            return (
              <ThemedView key={fixture.id} style={styles.fixtureRow}>
                <ThemedText type="defaultSemiBold">
                  {fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}
                </ThemedText>
                <ThemedText>
                  {fixture.isHome ? 'Home' : 'Away'} • {formatDate(fixture.date)}
                </ThemedText>
                <ThemedText>{fixture.venue}</ThemedText>
                <ThemedView style={styles.fixtureActionRow}>
                  <Pressable
                    onPress={() => {
                      handleEditFixture(fixture.id);
                    }}
                    style={styles.editButton}>
                    <ThemedText>Edit match</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      handleDeleteFixture(fixture.id);
                    }}
                    style={styles.deleteButton}>
                    <ThemedText style={styles.deleteButtonText}>Delete match</ThemedText>
                  </Pressable>
                </ThemedView>
              </ThemedView>
            );
          })
        ) : (
          <ThemedText>No fixtures yet.</ThemedText>
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
  fixtureRow: {
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  fixtureActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    backgroundColor: '#F3F4F6',
  },
  toggleButtonSelected: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  toggleButtonSelectedText: {
    color: '#FFFFFF',
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
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    backgroundColor: '#F3F4F6',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  helperText: {
    color: '#6B7280',
  },
});
