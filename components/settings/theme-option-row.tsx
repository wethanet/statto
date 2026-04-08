import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ThemePreference } from '@/lib/storage/settings-storage';

type Props = {
  label: string;
  description: string;
  value: ThemePreference;
  selectedValue: ThemePreference;
  onPress: (value: ThemePreference) => void;
};

export function ThemeOptionRow({ label, description, value, selectedValue, onPress }: Props) {
  const isSelected = value === selectedValue;

  return (
    <Pressable onPress={() => onPress(value)}>
      <ThemedView style={[styles.card, isSelected ? styles.cardSelected : undefined]}>
        <View style={styles.copy}>
          <ThemedText type="defaultSemiBold">{label}</ThemedText>
          <ThemedText>{description}</ThemedText>
        </View>
        <View style={[styles.indicator, isSelected ? styles.indicatorSelected : undefined]} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardSelected: {
    borderColor: '#0A7EA4',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C7CDD3',
  },
  indicatorSelected: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
});
