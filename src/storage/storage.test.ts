import { describe, expect, it } from 'vitest';
import { PLANS } from '../data/plans';
import { finishSession, reduceSession, startSession } from '../domain/session';
import { loadActiveSession, saveActiveSession } from './activeSession';
import { getSession, listSessions, saveSession } from './db';

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
  it('saves and lists sessions newest first', async () => {
    const a = finishSession(startSession(PLANS[0]!, T0), T0 + 60_000, false);
    const b = finishSession(startSession(PLANS[2]!, T0 + 86_400_000), T0 + 86_460_000, true);
    const idA = await saveSession(a);
    await saveSession(b);
    const list = await listSessions();
    expect(list.map((h) => h.planId)).toEqual(['plan-60', 'plan-25']);
    expect((await getSession(idA))?.planName).toBe('25 min');
  });
});
