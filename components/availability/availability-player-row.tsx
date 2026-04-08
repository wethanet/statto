import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPlayerDisplayName } from '@/lib/team';
import type { AvailabilityStatus, Player } from '@/lib/types';

type Props = {
  player: Player;
  status: AvailabilityStatus;
  onChange: (status: AvailabilityStatus) => void;
};

const availabilityOptions: AvailabilityStatus[] = ['available', 'unavailable', 'uncertain'];

export function AvailabilityPlayerRow({ player, status, onChange }: Props) {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <View style={styles.playerMeta}>
          <ThemedText type="defaultSemiBold">{getPlayerDisplayName(player)}</ThemedText>
          {player.position ? <ThemedText>{player.position}</ThemedText> : null}
        </View>
        <ThemedText style={styles.statusLabel}>{status}</ThemedText>
      </View>

      <View style={styles.actions}>
        {availabilityOptions.map((option) => {
          const isSelected = option === status;

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.button, isSelected ? styles.buttonSelected : undefined]}>
              <ThemedText style={isSelected ? styles.buttonSelectedText : undefined}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  playerMeta: {
    flex: 1,
    gap: 4,
  },
  statusLabel: {
    textTransform: 'capitalize',
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    backgroundColor: '#F3F4F6',
  },
  buttonSelected: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  buttonSelectedText: {
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
});
