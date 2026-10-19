import type { SessionHistory } from '../domain/types';
import { db, type LocalSession } from '../storage/db';
import { remoteWins, type LocalTable } from './engine';

function withoutDirty({ dirty: _dirty, ...record }: LocalSession): SessionHistory {
  return record;
}

export const historyTable: LocalTable<SessionHistory> = {
  async dirty() {
    const rows = await db.history.where('dirty').equals(1).toArray();
    return rows.map(withoutDirty);
  },

  async markClean(records) {
    await db.transaction('rw', db.history, async () => {
      for (const r of records) {
        const current = await db.history.get(r.id);
        if (current && current.modifiedAt === r.modifiedAt) {
          await db.history.update(r.id, { dirty: 0 });
        }
      }
    });
  },

  async applyRemote(records) {
    await db.transaction('rw', db.history, async () => {
      for (const r of records) {
        const current = await db.history.get(r.id);
        if (remoteWins(current, r)) await db.history.put({ ...r, dirty: 0 });
      }
    });
  },
};
