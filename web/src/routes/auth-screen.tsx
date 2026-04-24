import { type FormEvent, useState } from 'react';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useAuth } from '@web/lib/auth-context';

export function AuthScreen() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);

    try {
      const nextMessage = await signInWithGoogle();
      if (nextMessage) {
        setMessage(nextMessage);
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <main className="gate-shell">
      <section className="panel auth-panel">
        <div className="auth-layout">
          <section className="auth-hero stack">
            <div className="auth-brand">
              <img alt="Warners Bay Bulldogs logo" className="auth-brand__logo" src={bulldogsLogo} />
              <div className="stack-sm">
                <span className="eyebrow">Warners Bay Bulldogs</span>
                <h1>Club access</h1>
              </div>
            </div>

            <p className="auth-hero__lead">
              Sign in to the Bulldogs workspace to manage training, matches, player availability, and club admin from any device.
            </p>

          </section>

          <section className="auth-form-card stack">
            <div className="stack-sm">
              <span className="eyebrow">Sign in</span>
              <h2>{mode === 'sign-in' ? 'Choose how you want to continue' : 'Set up your login'}</h2>
            </div>

            <div className="stack">
              <button
                className="google-sign-in-button"
                disabled={isGoogleSubmitting || isSubmitting}
                onClick={() => void handleGoogleSignIn()}
                type="button">
                <span aria-hidden="true" className="google-sign-in-button__icon">
                  <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9081c1.7018-1.5668 2.6842-3.8741 2.6842-6.6155z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1791l-2.9081-2.2582c-.8055.54-1.8355.8591-3.0482.8591-2.3441 0-4.3282-1.5832-5.0364-3.7091H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.9636 10.7127c-.18-.54-.2836-1.1168-.2836-1.7127s.1036-1.1727.2836-1.7127V4.9555H.9573C.3477 6.1705 0 7.5432 0 9s.3477 2.8295.9573 4.0445l3.0063-2.3318z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4636.8918 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9555l3.0063 2.3318C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
                      fill="#EA4335"
                    />
                  </svg>
                </span>
                <span className="google-sign-in-button__label">
                  {isGoogleSubmitting ? 'Redirecting to Google...' : 'Continue with Google'}
                </span>
              </button>
            </div>

            <div className="auth-divider" aria-hidden="true">
              <span>or use email</span>
            </div>

            <form className="stack" onSubmit={handleSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  autoCapitalize="none"
                  autoComplete="email"
                  className="input auth-input"
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
                  className="input auth-input"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setMessage(null);
                  }}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                />
              </label>

              <div className="inline-actions auth-actions">
                <button className="button auth-actions__primary" disabled={isSubmitting} type="submit">
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

              {message ? <p className="auth-message">{message}</p> : null}
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
