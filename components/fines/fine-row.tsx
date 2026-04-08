import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Props = {
  playerName: string;
  reason: string;
  amount: number;
  issuedAt: string;
  paid: boolean;
  onTogglePaid: () => void;
  onDelete: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function FineRow({ playerName, reason, amount, issuedAt, paid, onTogglePaid, onDelete }: Props) {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <View style={styles.meta}>
          <ThemedText type="defaultSemiBold">{playerName}</ThemedText>
          <ThemedText>{reason}</ThemedText>
          <ThemedText>
            ${amount} • {formatDate(issuedAt)}
          </ThemedText>
        </View>
        <ThemedText style={paid ? styles.paidLabel : styles.outstandingLabel}>
          {paid ? 'Paid' : 'Outstanding'}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onTogglePaid}
          style={[styles.button, paid ? styles.buttonNeutral : styles.buttonPrimary]}>
          <ThemedText style={paid ? undefined : styles.buttonPrimaryText}>
            {paid ? 'Mark unpaid' : 'Mark paid'}
          </ThemedText>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.button, styles.buttonDanger]}>
          <ThemedText style={styles.buttonDangerText}>Delete fine</ThemedText>
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
  paidLabel: {
    color: '#0B7A42',
  },
  outstandingLabel: {
    color: '#A43D2A',
  },
  button: {
    alignSelf: 'flex-start',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});
