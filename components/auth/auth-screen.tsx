import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth-context';

export function AuthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setMessage('Enter an email address.');
      return;
    }

    if (!password) {
      setMessage('Enter a password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextMessage =
        mode === 'sign-in'
          ? await signInWithPassword(normalizedEmail, password)
          : await signUpWithPassword(normalizedEmail, password);

      setMessage(nextMessage ?? (mode === 'sign-in' ? null : 'Account created.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText type="title">Sign in to Statto</ThemedText>
        <ThemedText>
          Use your club account to unlock Supabase-backed storage and keep team admin synced across devices.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">{mode === 'sign-in' ? 'Welcome back' : 'Create an account'}</ThemedText>
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setMessage(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setMessage(null);
          }}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].background,
              color: Colors[colorScheme].text,
            },
          ]}
        />
        <Pressable onPress={handleSubmit} style={styles.primaryButton} disabled={isSubmitting}>
          <ThemedText style={styles.primaryButtonText}>
            {isSubmitting
              ? 'Working...'
              : mode === 'sign-in'
                ? 'Sign in'
                : 'Create account'}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
            setMessage(null);
          }}
          style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>
            {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </ThemedText>
        </Pressable>
        {message ? <ThemedText style={styles.helperText}>{message}</ThemedText> : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  hero: {
    gap: 8,
  },
  card: {
    gap: 12,
    padding: 20,
    borderRadius: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0A7EA4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    color: '#0A7EA4',
  },
  helperText: {
    color: '#6B7280',
  },
});
