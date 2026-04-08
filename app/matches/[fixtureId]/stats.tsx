import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { MatchFieldIllustration } from '../../../components/stats/match-field-illustration';
import { MatchStatRow } from '../../../components/stats/match-stat-row';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import { useClubData } from '@/lib/club-data-context';
import { getFixtureById } from '@/lib/availability';
import {
  adjustMatchStatEntry,
  getFixtureScoreSummary,
  getMatchStatValue,
  matchStatLabels,
  matchStatMetrics,
} from '@/lib/match-stats';

export default function MatchStatsScreen() {
  const { fixtureId } = useLocalSearchParams<{ fixtureId: string }>();
  const { fixtures, isHydrated, matchStats, setMatchStats } = useClubData();
  const { height, width } = useWindowDimensions();
  const fixture = getFixtureById(fixtureId, fixtures);
  const isTabletBoard = width >= 900 && width > height;

  if (!fixture) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="title">Fixture not found</ThemedText>
        <ThemedText>Check the selected match and try again.</ThemedText>
      </ThemedView>
    );
  }

  const scoreSummary = getFixtureScoreSummary(fixture.id, matchStats);

  const statsBoard = (
    <View style={[styles.statsGrid, isTabletBoard ? styles.statsGridTablet : null]}>
      {matchStatMetrics.map((metric) => {
        return (
          <MatchStatRow
            key={metric}
            label={matchStatLabels[metric]}
            compact={isTabletBoard}
            style={isTabletBoard ? styles.statsCardTablet : null}
            oursValue={getMatchStatValue(fixture.id, metric, 'ours', matchStats)}
            theirsValue={getMatchStatValue(fixture.id, metric, 'theirs', matchStats)}
            onAdjust={(team, delta) => {
              setMatchStats((current) => {
                return adjustMatchStatEntry(current, fixture.id, metric, team, delta);
              });
            }}
          />
        );
      })}
    </View>
  );

  const content = (
    <View style={styles.boardShell}>
      <MatchFieldIllustration compact={isTabletBoard} background />

      <ThemedView style={styles.header}>
        <ThemedText type="title">
          Stats {fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}
        </ThemedText>
        <ThemedText>Capture the live flow of the game for both sides from one shared board.</ThemedText>
      </ThemedView>

      <View style={[styles.topSection, isTabletBoard ? styles.topSectionTablet : null]}>
        <ThemedView
          style={[
            styles.summaryCard,
            isTabletBoard ? styles.summaryCardTablet : null,
            isTabletBoard ? styles.summaryCardTabletWide : null,
          ]}>
          <ThemedText type="subtitle">Live score</ThemedText>
          <ThemedView style={[styles.summaryRow, isTabletBoard ? styles.summaryRowTablet : null]}>
            <ThemedText style={styles.oursText}>
              Ours {scoreSummary.ours.goals}.{scoreSummary.ours.points} ({scoreSummary.ours.score})
            </ThemedText>
            <ThemedText style={styles.theirsText}>
              Theirs {scoreSummary.theirs.goals}.{scoreSummary.theirs.points} ({scoreSummary.theirs.score})
            </ThemedText>
          </ThemedView>
          <ThemedText style={styles.helperText}>
            {isHydrated
              ? 'Goals count for 6 and points count for 1. Stats save as you tap.'
              : 'Loading saved match stats...'}
          </ThemedText>
        </ThemedView>
      </View>

      {statsBoard}
    </View>
  );

  if (isTabletBoard) {
    return <ThemedView style={styles.tabletScreen}>{content}</ThemedView>;
  }

  return <ScrollView contentContainerStyle={styles.content}>{content}</ScrollView>;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
  tabletScreen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  boardShell: {
    position: 'relative',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1F5B33',
  },
  topSection: {
    gap: 14,
  },
  topSectionTablet: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,205,211,0.85)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  summaryCardTablet: {
    padding: 14,
    justifyContent: 'center',
  },
  summaryCardTabletWide: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryRowTablet: {
    gap: 8,
  },
  statsGrid: {
    gap: 16,
  },
  statsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsCardTablet: {
    width: '48.8%',
  },
  oursText: {
    color: '#0B7A42',
  },
  theirsText: {
    color: '#A43D2A',
  },
  helperText: {
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
