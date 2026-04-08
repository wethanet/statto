import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Href, Link, useLocalSearchParams } from 'expo-router';

import { AvailabilityPlayerRow } from '../../components/availability/availability-player-row';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useClubData } from '@/lib/club-data-context';
import {
  getAvailabilitySummary,
  getFixtureById,
  getPlayersForFixture,
  upsertAvailabilityRecord,
} from '@/lib/availability';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MatchFixtureScreen() {
  const { fixtureId } = useLocalSearchParams<{ fixtureId: string }>();
  const { availabilityRecords, fixtures, isHydrated, players, setAvailabilityRecords } =
    useClubData();
  const fixture = getFixtureById(fixtureId, fixtures);

  const playersForFixture = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return getPlayersForFixture(fixture.id, players, availabilityRecords);
  }, [availabilityRecords, fixture, players]);

  if (!fixture) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="title">Fixture not found</ThemedText>
        <ThemedText>Check the selected match and try again.</ThemedText>
      </ThemedView>
    );
  }

  const summary = getAvailabilitySummary(fixture.id, players, availabilityRecords);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">
          {fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}
        </ThemedText>
        <ThemedText>{formatDate(fixture.date)}</ThemedText>
        <ThemedText>{fixture.venue}</ThemedText>
        <ThemedText>{fixture.isHome ? 'Home game' : 'Away game'}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.summaryCard}>
        <ThemedText type="subtitle">Availability summary</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText style={styles.positive}>{summary.available} available</ThemedText>
          <ThemedText style={styles.negative}>{summary.unavailable} unavailable</ThemedText>
          <ThemedText style={styles.neutral}>{summary.uncertain} uncertain</ThemedText>
        </ThemedView>
        <ThemedText style={styles.helperText}>
          {isHydrated ? 'Changes are saved on this device.' : 'Loading saved availability...'}
        </ThemedText>
        <Link href={`/matches/${fixture.id}/votes` as Href}>
          <ThemedText type="link">Open player votes</ThemedText>
        </Link>
      </ThemedView>

      {playersForFixture.map((player) => {
        return (
          <AvailabilityPlayerRow
            key={player.id}
            player={player}
            status={player.availabilityStatus}
            onChange={(status) => {
              setAvailabilityRecords((current) => {
                return upsertAvailabilityRecord(current, fixture.id, player.id, status);
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
