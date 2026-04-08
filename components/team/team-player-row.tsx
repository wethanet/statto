import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPlayerDisplayName, getPlayerRoleLabel } from '@/lib/team';
import type { Player } from '@/lib/types';

type Props = {
  player: Player;
  onToggleActive: () => void;
  onCycleRole: () => void;
  onDelete: () => void;
};

export function TeamPlayerRow({ player, onToggleActive, onCycleRole, onDelete }: Props) {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <View style={styles.meta}>
          <ThemedText type="defaultSemiBold">{getPlayerDisplayName(player)}</ThemedText>
          <ThemedText>
            {player.position ? `${player.position} • ` : ''}
            {getPlayerRoleLabel(player.role)}
          </ThemedText>
        </View>
        <ThemedText style={player.active ? styles.activeLabel : styles.inactiveLabel}>
          {player.active ? 'Active' : 'Inactive'}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggleActive}
          style={[styles.button, player.active ? styles.buttonNeutral : styles.buttonPrimary]}>
          <ThemedText style={player.active ? undefined : styles.buttonPrimaryText}>
            {player.active ? 'Set inactive' : 'Set active'}
          </ThemedText>
        </Pressable>
        <Pressable onPress={onCycleRole} style={[styles.button, styles.buttonNeutral]}>
          <ThemedText>Cycle role</ThemedText>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.button, styles.buttonDanger]}>
          <ThemedText style={styles.buttonDangerText}>Delete player</ThemedText>
        </Pressable>
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
  meta: {
    flex: 1,
    gap: 4,
  },
  activeLabel: {
    color: '#0B7A42',
  },
  inactiveLabel: {
    color: '#A43D2A',
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
  buttonDanger: {
    backgroundColor: '#FFF1F0',
    borderColor: '#E56A54',
  },
  buttonDangerText: {
    color: '#A43D2A',
  },
});
