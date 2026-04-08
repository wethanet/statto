import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPlayerDisplayName } from '@/lib/team';
import type { Player } from '@/lib/types';

type Props = {
  player: Player;
  points: number;
  onChange: (points: number) => void;
};

export function VotePlayerRow({ player, points, onChange }: Props) {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.meta}>
        <ThemedText type="defaultSemiBold">{getPlayerDisplayName(player)}</ThemedText>
        {player.position ? <ThemedText>{player.position}</ThemedText> : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => onChange(Math.max(0, points - 1))}
          style={[styles.button, styles.buttonNeutral]}>
          <ThemedText>-</ThemedText>
        </Pressable>
        <ThemedText style={styles.points}>{points} pts</ThemedText>
        <Pressable
          onPress={() => onChange(Math.min(5, points + 1))}
          style={[styles.button, styles.buttonPrimary]}>
          <ThemedText style={styles.buttonPrimaryText}>+</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  points: {
    minWidth: 48,
    textAlign: 'center',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPrimary: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  buttonNeutral: {
    backgroundColor: '#F3F4F6',
    borderColor: '#C7CDD3',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
  },
});
