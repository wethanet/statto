import { type FormEvent, useState } from 'react';

import bulldogsLogo from '@web/assets/bulldogs-logo-square.png';
import { useAuth } from '@web/lib/auth-context';

export function PasswordResetScreen() {
  const { clearPasswordRecovery, signOut, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage('Use at least 8 characters for the new password.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextMessage = await updatePassword(password);

      if (nextMessage) {
        setMessage(nextMessage);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setIsComplete(true);
      setMessage('Password updated. Sign in again with your new password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReturnToSignIn() {
    await signOut();
    clearPasswordRecovery();
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
                <h1>Password reset</h1>
              </div>
            </div>

            <p className="auth-hero__lead">
              Set a new password for your Bulldogs workspace account.
            </p>
          </section>

          <section className="auth-form-card stack">
            <div className="stack-sm">
              <span className="eyebrow">Secure account</span>
              <h2>{isComplete ? 'Password updated' : 'Choose a new password'}</h2>
            </div>

            {isComplete ? (
              <button className="button auth-actions__primary" onClick={() => void handleReturnToSignIn()} type="button">
                Return to sign in
              </button>
            ) : (
              <form className="stack" onSubmit={handleSubmit}>
                <label className="field">
                  <span>New password</span>
                  <input
                    autoComplete="new-password"
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

                <label className="field">
                  <span>Confirm password</span>
                  <input
                    autoComplete="new-password"
                    className="input auth-input"
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setMessage(null);
                    }}
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                  />
                </label>

                <button className="button auth-actions__primary" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Updating...' : 'Update password'}
                </button>
              </form>
            )}

            {message ? <p className="auth-message">{message}</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
