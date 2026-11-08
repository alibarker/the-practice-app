import { useState, type FormEvent } from 'react';
import {
  requestSync,
  createAccount,
  signOut,
  syncLabel,
  useSyncStatus,
  signInWithPassword,
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
  const [mode, setMode] = useState<'signIn' | 'create'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signIn') {
        await signInWithPassword(email.trim(), password);
      } else if (await createAccount(email.trim(), password)) {
        setNotice(
          'Account created. Tap the confirmation link Supabase has emailed you, then come back and sign in.',
        );
        setMode('signIn');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const creating = mode === 'create';

  return (
    <div className="account-panel">
      <p className="hint">
        Sign in to keep your practice history in sync across your iPad, phone and laptop.
      </p>
      <form onSubmit={submit} className="account-form">
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            minLength={creating ? 8 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn primary" disabled={busy || !email.trim() || !password}>
          {creating ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setMode(creating ? 'signIn' : 'create');
            setError(null);
            setNotice(null);
          }}
        >
          {creating ? 'I already have an account' : 'First time? Create an account'}
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
