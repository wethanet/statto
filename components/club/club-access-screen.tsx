import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useClubAccess } from '@/lib/club-access-context';

export function ClubAccessScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { activeClubId, clubs, createClub, joinClub, setActiveClubId } = useClubAccess();
  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateClub() {
    setIsSubmitting(true);

    try {
      const nextMessage = await createClub(clubName);
      setMessage(nextMessage ?? null);

      if (!nextMessage) {
        setClubName('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinClub() {
    setIsSubmitting(true);

    try {
      const nextMessage = await joinClub(inviteCode);
      setMessage(nextMessage ?? null);

      if (!nextMessage) {
        setInviteCode('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Club access</ThemedText>
        <ThemedText>
          Create a club for your team or join an existing club with an invite code so multiple managers can work from the same data.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Create a club</ThemedText>
        <TextInput
          value={clubName}
          onChangeText={(value) => {
            setClubName(value);
            setMessage(null);
          }}
          placeholder="Club name"
          placeholderTextColor="#6B7280"
          autoCapitalize="words"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <Pressable onPress={handleCreateClub} style={styles.primaryButton} disabled={isSubmitting}>
          <ThemedText style={styles.primaryButtonText}>
            {isSubmitting ? 'Working...' : 'Create club'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Join a club</ThemedText>
        <TextInput
          value={inviteCode}
          onChangeText={(value) => {
            setInviteCode(value.toUpperCase());
            setMessage(null);
          }}
          placeholder="Invite code"
          placeholderTextColor="#6B7280"
          autoCapitalize="characters"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <Pressable onPress={handleJoinClub} style={styles.primaryButton} disabled={isSubmitting}>
          <ThemedText style={styles.primaryButtonText}>
            {isSubmitting ? 'Working...' : 'Join club'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Your clubs</ThemedText>
        {clubs.length > 0 ? (
          clubs.map((club) => {
            const isActive = club.id === activeClubId;

            return (
              <Pressable
                key={club.id}
                onPress={() => {
                  setActiveClubId(club.id).catch((error: unknown) => {
                    console.warn('Failed to switch clubs', error);
                  });
                }}
                style={[styles.clubRow, isActive ? styles.clubRowActive : undefined]}>
                <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
                <ThemedText>
                  {club.role} • Invite code {club.inviteCode}
                </ThemedText>
                <ThemedText style={styles.helperText}>{isActive ? 'Active club' : 'Tap to switch'}</ThemedText>
              </Pressable>
            );
          })
        ) : (
          <ThemedText>No clubs yet. Create one or join with an invite code.</ThemedText>
        )}
      </ThemedView>

      {message ? <ThemedText style={styles.helperText}>{message}</ThemedText> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0A7EA4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  clubRow: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7CDD3',
  },
  clubRowActive: {
    borderColor: '#0A7EA4',
  },
  helperText: {
    color: '#6B7280',
  },
});
