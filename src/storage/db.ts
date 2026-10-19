import Dexie, { type EntityTable } from 'dexie';
import type { SessionHistory } from '../domain/types';

const db = new Dexie('the-practice-app') as Dexie & {
  sessions: EntityTable<SessionHistory, 'id'>;
};

db.version(1).stores({
  sessions: '++id, startedAt',
});

export async function saveSession(record: SessionHistory): Promise<number> {
  return (await db.sessions.add(record)) as number;
}

export async function listSessions(): Promise<SessionHistory[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray();
}

export async function getSession(id: number): Promise<SessionHistory | undefined> {
  return db.sessions.get(id);
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Best effort only.
  }
}
