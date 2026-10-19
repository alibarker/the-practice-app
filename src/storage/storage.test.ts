import { describe, expect, it } from 'vitest';
import { PLANS } from '../data/plans';
import { finishSession, reduceSession, startSession } from '../domain/session';
import { loadActiveSession, saveActiveSession } from './activeSession';
import { db, deleteSession, getSession, listSessions, saveSession } from './db';

const T0 = 1_700_000_000_000;

describe('active session storage', () => {
  it('round-trips a session and restores the same state after reload', () => {
    let s = startSession(PLANS[1]!, T0);
    s = reduceSession(s, { type: 'next' }, T0 + 5000);
    saveActiveSession(s);
    expect(loadActiveSession()).toEqual(s);
    saveActiveSession(null);
    expect(loadActiveSession()).toBeNull();
  });

  it('ignores corrupt data', () => {
    localStorage.setItem('activeSession', '{not json');
    expect(loadActiveSession()).toBeNull();
    localStorage.setItem('activeSession', '{"foo":1}');
    expect(loadActiveSession()).toBeNull();
  });
});

describe('history db', () => {
  it('saves with a UUID, lists newest first, and soft-deletes', async () => {
    const a = await saveSession(finishSession(startSession(PLANS[0]!, T0), T0 + 60_000, false));
    await saveSession(
      finishSession(startSession(PLANS[2]!, T0 + 86_400_000), T0 + 86_460_000, true),
    );
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await listSessions()).map((h) => h.planId)).toEqual(['plan-60', 'plan-25']);
    expect((await getSession(a.id))?.planName).toBe('25 min');
    expect((await db.history.get(a.id))?.dirty).toBe(1);

    await deleteSession(a.id);
    expect(await getSession(a.id)).toBeUndefined();
    expect((await listSessions()).map((h) => h.planId)).toEqual(['plan-60']);
    const tombstone = await db.history.get(a.id);
    expect(tombstone?.deletedAt).not.toBeNull();
    expect(tombstone?.dirty).toBe(1);
  });
});
