import { useState, type FormEvent } from 'react';
import {
  requestSync,
  sendSignInCode,
  signOut,
  syncLabel,
  useSyncStatus,
  verifySignInCode,
} from '../sync/sync';

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const status = useSyncStatus();

  return (
    <main className="screen account">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          ◀ Home
        </button>
        <h1>Sync</h1>
      </header>
      {!status.configured ? (
        <p className="hint">Sync isn't set up for this build.</p>
      ) : status.email ? (
        <SignedIn />
      ) : (
        <SignIn />
      )}
    </main>
  );
}

function SignedIn() {
  const status = useSyncStatus();
  const [busy, setBusy] = useState(false);

  const doSignOut = async () => {
    if (!window.confirm('Sign out? Your history stays on this device.')) return;
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-panel">
      <p>
        Signed in as <strong>{status.email}</strong>
      </p>
      <p className={`sync-status ${status.phase}`} role="status">
        {syncLabel(status)}
        {status.lastSyncedAt && status.phase === 'idle' && (
          <> · {new Date(status.lastSyncedAt).toLocaleTimeString()}</>
        )}
      </p>
      {status.error && <p className="form-error">{status.error}</p>}
      <div className="account-actions">
        <button
          className="btn primary"
          onClick={() => void requestSync()}
          disabled={status.phase === 'syncing'}
        >
          Sync now
        </button>
        <button className="btn ghost" onClick={doSignOut} disabled={busy}>
          Sign out
        </button>
      </div>
      <p className="hint">
        Your practice history syncs across every device you sign in on. It also stays on each
        device, so the app works offline.
      </p>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await sendSignInCode(email.trim());
      setStep('code');
    });
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    void run(() => verifySignInCode(email.trim(), code.trim()));
  };

  return (
    <div className="account-panel">
      <p className="hint">
        Sign in to keep your practice history in sync across your iPad, phone and laptop.
      </p>
      {step === 'email' ? (
        <form onSubmit={submitEmail} className="account-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="btn primary" disabled={busy || !email.trim()}>
            Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="account-form">
          <label>
            Code sent to {email}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="btn primary" disabled={busy || !code.trim()}>
            Sign in
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
