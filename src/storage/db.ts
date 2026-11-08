import Dexie, { type EntityTable } from 'dexie';
import type { SessionHistory, SessionSummary } from '../domain/types';

/** A history row as stored on this device. `dirty` is 1 until the row has been pushed. */
export type LocalSession = SessionHistory & { dirty: 0 | 1 };

export const db = new Dexie('the-practice-app') as Dexie & {
  history: EntityTable<LocalSession, 'id'>;
};

db.version(1).stores({
  sessions: '++id, startedAt',
});

// v2: string UUID keys and sync fields. IndexedDB can't change a primary key in place,
// so v1 rows move from `sessions` to a new `history` table.
db.version(2)
  .stores({
    sessions: null,
    history: 'id, startedAt, dirty',
  })
  .upgrade(async (tx) => {
    const old = (await tx.table('sessions').toArray()) as (SessionSummary & { id: number })[];
    const now = Date.now();
    await tx.table('history').bulkAdd(
      old.map(({ id: _oldId, ...rest }): LocalSession => ({
        ...rest,
        id: crypto.randomUUID(),
        modifiedAt: now,
        deletedAt: null,
        dirty: 1,
      })),
    );
  });

export async function saveSession(summary: SessionSummary): Promise<SessionHistory> {
  const record: LocalSession = {
    ...summary,
    id: crypto.randomUUID(),
    modifiedAt: Date.now(),
    deletedAt: null,
    dirty: 1,
  };
  await db.history.add(record);
  return record;
}

export async function deleteSession(id: string): Promise<void> {
  const now = Date.now();
  await db.history.update(id, { deletedAt: now, modifiedAt: now, dirty: 1 });
}

export async function listSessions(): Promise<SessionHistory[]> {
  const rows = await db.history.orderBy('startedAt').reverse().toArray();
  return rows.filter((r) => r.deletedAt === null);
}

export async function getSession(id: string): Promise<SessionHistory | undefined> {
  const row = await db.history.get(id);
  return row && row.deletedAt === null ? row : undefined;
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
