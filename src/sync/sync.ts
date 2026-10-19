import { createClient, type User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { SUPABASE_KEY, SUPABASE_URL, syncConfigured } from './config';
import { syncTable, type CursorStore } from './engine';
import { historyTable } from './historyTable';
import { sessionsRemote } from './supabaseRemote';

export interface SyncStatus {
  configured: boolean;
  email: string | null;
  phase: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncedAt: number | null;
  error: string | null;
}

/** Don't re-sync on every app switch; once a minute is plenty. */
const VISIBILITY_SYNC_INTERVAL_MS = 60_000;
const LAST_SYNCED_KEY = 'sync:lastSyncedAt';

const client =
  syncConfigured && SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

let userId: string | null = null;
let status: SyncStatus = {
  configured: syncConfigured,
  email: null,
  phase: 'idle',
  lastSyncedAt: readNumber(LAST_SYNCED_KEY),
  error: null,
};
const listeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
  );
}

function readNumber(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

/** Pull cursor per user, so switching accounts starts a fresh pull. */
function cursorStore(uid: string): CursorStore {
  const key = `sync:history:cursor:${uid}`;
  return {
    get: () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (cursor) => {
      try {
        if (cursor) localStorage.setItem(key, cursor);
        else localStorage.removeItem(key);
      } catch {
        // Without storage we just re-pull everything next time; applyRemote is idempotent.
      }
    },
  };
}

let running: Promise<void> | null = null;
let again = false;

/** Sync now, or once more after the sync in progress finishes. Never throws. */
export function requestSync(): Promise<void> {
  if (!client || !userId) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce(userId);
    } while (again && userId);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce(uid: string | null) {
  if (!client || !uid) return;
  if (!navigator.onLine) {
    setStatus({ phase: 'offline' });
    return;
  }
  setStatus({ phase: 'syncing', error: null });
  try {
    await syncTable(historyTable, sessionsRemote(client), cursorStore(uid));
    const now = Date.now();
    try {
      localStorage.setItem(LAST_SYNCED_KEY, String(now));
    } catch {
      // Not critical.
    }
    setStatus({ phase: 'idle', lastSyncedAt: now });
  } catch (err) {
    setStatus({ phase: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}

function setUser(user: User | null) {
  userId = user?.id ?? null;
  setStatus({ email: user?.email ?? null });
}

export function initSync(): void {
  if (!client) return;

  client.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null);
    // Supabase advises against calling its API from inside this callback, so defer.
    if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
      setTimeout(() => void requestSync(), 0);
    }
  });

  window.addEventListener('online', () => void requestSync());
  document.addEventListener('visibilitychange', () => {
    const stale = Date.now() - (status.lastSyncedAt ?? 0) > VISIBILITY_SYNC_INTERVAL_MS;
    if (document.visibilityState === 'visible' && stale) void requestSync();
  });
}

/** Email a one-time sign-in code. Codes, not magic links: on iOS a link would open Safari, not the installed app. */
export async function sendSignInCode(email: string): Promise<void> {
  if (!client) throw new Error('Sync is not configured');
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message);
}

export async function verifySignInCode(email: string, code: string): Promise<void> {
  if (!client) throw new Error('Sync is not configured');
  const { error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(error.message);
}

/** History stays on this device; anything new is uploaded on the next sign-in. */
export async function signOut(): Promise<void> {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
  setStatus({ phase: 'idle', error: null });
}

export function syncLabel(s: SyncStatus): string {
  if (!s.email) return 'Sign in to sync';
  switch (s.phase) {
    case 'syncing':
      return 'Syncing…';
    case 'error':
      return 'Sync error';
    case 'offline':
      return 'Offline';
    case 'idle':
      return s.lastSyncedAt ? 'Synced' : 'Not synced yet';
  }
}
