import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function MatchFieldIllustration({
  compact = false,
  background = false,
}: {
  compact?: boolean;
  background?: boolean;
}) {
  if (background) {
    return (
      <View style={[styles.backgroundField, compact ? styles.backgroundFieldCompact : null]} pointerEvents="none">
        <View style={styles.centerLine} />
        <View style={styles.centerSquare} />
        <View style={styles.centerCircle} />
        <View style={[styles.arc, styles.arcLeft]} />
        <View style={[styles.arc, styles.arcRight]} />
        <View style={[styles.goalSquare, styles.goalSquareLeft]} />
        <View style={[styles.goalSquare, styles.goalSquareRight]} />
        <View style={[styles.goalPosts, styles.goalPostsLeft]} />
        <View style={[styles.goalPosts, styles.goalPostsRight]} />
      </View>
    );
  }

  return (
    <ThemedView style={[styles.card, compact ? styles.cardCompact : null]}>
      <ThemedText type="subtitle">Match day board</ThemedText>
      <ThemedText style={styles.helperText}>
        Use the field view and quick buttons below to track team stats live for both sides.
      </ThemedText>
      <View style={[styles.field, compact ? styles.fieldCompact : null]}>
        <View style={styles.centerLine} />
        <View style={styles.centerSquare} />
        <View style={styles.centerCircle} />
        <View style={[styles.arc, styles.arcLeft]} />
        <View style={[styles.arc, styles.arcRight]} />
        <View style={[styles.goalSquare, styles.goalSquareLeft]} />
        <View style={[styles.goalSquare, styles.goalSquareRight]} />
        <View style={[styles.goalPosts, styles.goalPostsLeft]} />
        <View style={[styles.goalPosts, styles.goalPostsRight]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  cardCompact: {
    padding: 14,
    gap: 8,
  },
  helperText: {
    color: '#6B7280',
  },
  backgroundField: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: '#2F8F4E',
    borderWidth: 2,
    borderColor: 'rgba(232,243,234,0.45)',
    opacity: 0.9,
    overflow: 'hidden',
  },
  backgroundFieldCompact: {
    borderRadius: 20,
  },
  field: {
    position: 'relative',
    height: 170,
    borderRadius: 20,
    backgroundColor: '#2F8F4E',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E8F3EA',
  },
  fieldCompact: {
    height: 150,
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: '#E8F3EA',
  },
  centerSquare: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 86,
    height: 52,
    marginLeft: -43,
    marginTop: -26,
    borderWidth: 2,
    borderColor: '#E8F3EA',
    borderRadius: 8,
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 78,
    height: 78,
    marginLeft: -39,
    marginTop: -39,
    borderWidth: 2,
    borderColor: '#E8F3EA',
    borderRadius: 999,
  },
  arc: {
    position: 'absolute',
    top: '50%',
    width: 70,
    height: 140,
    marginTop: -70,
    borderWidth: 2,
    borderColor: '#E8F3EA',
    borderRadius: 999,
  },
  arcLeft: {
    left: -36,
  },
  arcRight: {
    right: -36,
  },
  goalSquare: {
    position: 'absolute',
    top: '50%',
    width: 34,
    height: 116,
    marginTop: -58,
    borderWidth: 2,
    borderColor: '#E8F3EA',
  },
  goalSquareLeft: {
    left: 0,
    borderLeftWidth: 0,
  },
  goalSquareRight: {
    right: 0,
    borderRightWidth: 0,
  },
  goalPosts: {
    position: 'absolute',
    top: '50%',
    height: 88,
    marginTop: -44,
    borderLeftWidth: 2,
    borderColor: '#E8F3EA',
  },
  goalPostsLeft: {
    left: 12,
  },
  goalPostsRight: {
    right: 12,
  },
});
