import { type FormEvent, useState } from 'react';

import { useAuth } from '@web/lib/auth-context';

export function AuthScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      setMessage(nextMessage ?? (mode === 'sign-up' ? 'Account created.' : null));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="gate-shell">
      <section className="panel">
        <span className="eyebrow">Supabase access</span>
        <h1>Sign in to Statto</h1>
        <p className="muted">
          Sign in to access your club workspace and keep team data synced across devices. If you were invited by email, use that same email address and the club will be added automatically.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoCapitalize="none"
              autoComplete="email"
              className="input"
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage(null);
              }}
              placeholder="coach@club.com"
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              className="input"
              onChange={(event) => {
                setPassword(event.target.value);
                setMessage(null);
              }}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          </label>

          <div className="inline-actions">
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>

            <button
              className="button button--ghost"
              onClick={() => {
                setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
                setMessage(null);
              }}
              type="button">
              {mode === 'sign-in' ? 'Need an account?' : 'Already have an account?'}
            </button>
          </div>

          {message ? <p className="muted">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
