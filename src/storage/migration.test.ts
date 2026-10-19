import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { PLANS } from '../data/plans';
import { finishSession, startSession } from '../domain/session';

const T0 = 1_700_000_000_000;

it('moves v1 history (numeric ids) into the v2 table with UUIDs, marked for upload', async () => {
  // Seed a database exactly as v1 of the app left it, before the app's db module opens it.
  const v1 = new Dexie('the-practice-app');
  v1.version(1).stores({ sessions: '++id, startedAt' });
  await v1.table('sessions').add(finishSession(startSession(PLANS[0]!, T0), T0 + 60_000, true));
  await v1
    .table('sessions')
    .add(finishSession(startSession(PLANS[1]!, T0 + 1), T0 + 90_000, false));
  v1.close();

  const { db, listSessions } = await import('./db');
  const rows = await db.history.toArray();
  expect(rows).toHaveLength(2);
  for (const r of rows) {
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.dirty).toBe(1);
    expect(r.deletedAt).toBeNull();
  }
  expect((await listSessions()).map((h) => h.planId)).toEqual(['plan-45', 'plan-25']);
  expect(db.tables.map((t) => t.name)).toEqual(['history']);
});
