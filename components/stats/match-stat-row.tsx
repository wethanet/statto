import { Pressable, StyleProp, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type MatchStatRowProps = {
  label: string;
  oursValue: number;
  theirsValue: number;
  onAdjust: (team: 'ours' | 'theirs', delta: number) => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function StatCounter({
  label,
  value,
  onAdjust,
  compact,
}: {
  label: string;
  value: number;
  onAdjust: (delta: number) => void;
  compact: boolean;
}) {
  return (
    <ThemedView style={[styles.counterColumn, compact ? styles.counterColumnCompact : null]}>
      <ThemedText style={[styles.counterLabel, compact ? styles.counterLabelCompact : null]}>{label}</ThemedText>
      <ThemedView style={[styles.counterRow, compact ? styles.counterRowCompact : null]}>
        <Pressable onPress={() => onAdjust(-1)} style={[styles.adjustButton, compact ? styles.adjustButtonCompact : null]}>
          <ThemedText style={[styles.adjustButtonText, compact ? styles.adjustButtonTextCompact : null]}>-</ThemedText>
        </Pressable>
        <ThemedView style={[styles.valuePill, compact ? styles.valuePillCompact : null]}>
          <ThemedText type="defaultSemiBold">{value}</ThemedText>
        </ThemedView>
        <Pressable onPress={() => onAdjust(1)} style={[styles.adjustButton, compact ? styles.adjustButtonCompact : null]}>
          <ThemedText style={[styles.adjustButtonText, compact ? styles.adjustButtonTextCompact : null]}>+</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

export function MatchStatRow({ label, oursValue, theirsValue, onAdjust, compact = false, style }: MatchStatRowProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 430;
  const useCompactLayout = compact || isNarrow;

  return (
    <ThemedView style={[styles.card, useCompactLayout ? styles.cardCompact : null, style]}>
      <ThemedText type="subtitle">{label}</ThemedText>
      <ThemedView
        style={[
          styles.columns,
          useCompactLayout ? styles.columnsCompact : null,
          isNarrow ? styles.columnsStacked : null,
        ]}>
        <StatCounter
          label="Ours"
          value={oursValue}
          compact={useCompactLayout}
          onAdjust={(delta) => onAdjust('ours', delta)}
        />
        <StatCounter
          label="Theirs"
          value={theirsValue}
          compact={useCompactLayout}
          onAdjust={(delta) => onAdjust('theirs', delta)}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,205,211,0.85)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  cardCompact: {
    gap: 8,
    padding: 12,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  columnsCompact: {
    gap: 8,
  },
  columnsStacked: {
    flexDirection: 'column',
  },
  counterColumn: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  counterColumnCompact: {
    gap: 6,
  },
  counterLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6B7280',
  },
  counterLabelCompact: {
    fontSize: 11,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterRowCompact: {
    gap: 6,
  },
  adjustButton: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0A7EA4',
  },
  adjustButtonCompact: {
    minWidth: 36,
    paddingVertical: 8,
  },
  adjustButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
  adjustButtonTextCompact: {
    fontSize: 18,
    lineHeight: 18,
  },
  valuePill: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  valuePillCompact: {
    paddingVertical: 8,
  },
});
