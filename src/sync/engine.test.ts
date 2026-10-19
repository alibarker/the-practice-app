import { beforeEach, describe, expect, it } from 'vitest';
import { PLANS } from '../data/plans';
import { finishSession, startSession } from '../domain/session';
import type { SessionHistory } from '../domain/types';
import { db, deleteSession, listSessions, saveSession } from '../storage/db';
import { syncTable, type CursorStore, type PullPage, type Remote } from './engine';
import { historyTable } from './historyTable';

const T0 = 1_700_000_000_000;

/** In-memory stand-in for the Supabase table, including its last-write-wins trigger. */
class FakeServer implements Remote<SessionHistory> {
  rows = new Map<string, SessionHistory & { updatedAt: number }>();
  clock = 0;
  pageSize = 500;
  onPush?: () => Promise<void>;

  async push(records: SessionHistory[]) {
    await this.onPush?.();
    for (const r of records) {
      const existing = this.rows.get(r.id);
      if (existing && r.modifiedAt < existing.modifiedAt) continue;
      this.rows.set(r.id, { ...r, updatedAt: ++this.clock });
    }
  }

  async pull(cursor: string | null): Promise<PullPage<SessionHistory>> {
    const after = cursor === null ? 0 : Number(cursor);
    const page = [...this.rows.values()]
      .filter((r) => r.updatedAt > after)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, this.pageSize);
    const last = page.at(-1);
    return {
      records: page.map(({ updatedAt: _u, ...r }) => r),
      cursor: last ? String(last.updatedAt) : cursor,
      done: page.length < this.pageSize,
    };
  }

  /** A change made on another device. */
  write(r: SessionHistory) {
    this.rows.set(r.id, { ...r, updatedAt: ++this.clock });
  }
}

function memoryCursor(): CursorStore {
  let value: string | null = null;
  return { get: () => value, set: (c) => (value = c) };
}

function summary(planIndex = 0, offset = 0) {
  return finishSession(startSession(PLANS[planIndex]!, T0 + offset), T0 + offset + 60_000, true);
}

function remoteRecord(id: string, modifiedAt: number, planIndex = 1): SessionHistory {
  return { ...summary(planIndex), id, modifiedAt, deletedAt: null };
}

let server: FakeServer;
let cursor: CursorStore;
const sync = () => syncTable(historyTable, server, cursor);

beforeEach(async () => {
  await db.history.clear();
  server = new FakeServer();
  cursor = memoryCursor();
});

describe('syncTable', () => {
  it('pushes local sessions and marks them clean', async () => {
    const a = await saveSession(summary());
    const result = await sync();
    expect(result.pushed).toBe(1);
    expect(server.rows.get(a.id)?.planId).toBe('plan-25');
    expect((await db.history.get(a.id))?.dirty).toBe(0);
    // Nothing left to push the second time; our own row comes back once, then the cursor is past it.
    expect((await sync()).pushed).toBe(0);
    expect((await sync()).pulled).toBe(0);
  });

  it('pulls sessions made on other devices', async () => {
    server.write(remoteRecord('remote-1', T0));
    const result = await sync();
    expect(result.pulled).toBe(1);
    expect((await listSessions()).map((h) => h.id)).toEqual(['remote-1']);
    expect((await db.history.get('remote-1'))?.dirty).toBe(0);
  });

  it('keeps a newer local edit over an older remote one, then pushes it', async () => {
    const a = await saveSession(summary());
    await sync();
    // Other device edits first (older), this device edits later (newer).
    server.write({ ...(await db.history.get(a.id))!, planName: 'remote', modifiedAt: T0 + 10 });
    await db.history.update(a.id, { planName: 'local', modifiedAt: T0 + 20, dirty: 1 });
    await sync();
    expect((await db.history.get(a.id))?.planName).toBe('local');
    expect(server.rows.get(a.id)?.planName).toBe('local');
  });

  it('takes a newer remote edit over the local copy', async () => {
    server.write(remoteRecord('r', T0));
    await sync();
    server.write({ ...remoteRecord('r', T0 + 5), planName: 'renamed' });
    await sync();
    expect((await db.history.get('r'))?.planName).toBe('renamed');
  });

  it('leaves a record dirty if it changed while being pushed', async () => {
    const a = await saveSession(summary());
    server.onPush = async () => {
      server.onPush = undefined;
      await db.history.update(a.id, { planName: 'edited mid-push', modifiedAt: Date.now() + 1 });
    };
    await sync();
    expect((await db.history.get(a.id))?.dirty).toBe(1);
    await sync();
    expect(server.rows.get(a.id)?.planName).toBe('edited mid-push');
    expect((await db.history.get(a.id))?.dirty).toBe(0);
  });

  it('syncs deletions both ways', async () => {
    const a = await saveSession(summary());
    server.write(remoteRecord('r', T0));
    await sync();
    await deleteSession(a.id);
    server.write({ ...remoteRecord('r', T0 + 5), deletedAt: T0 + 5 });
    await sync();
    expect(server.rows.get(a.id)?.deletedAt).not.toBeNull();
    expect(await listSessions()).toEqual([]);
  });

  it('pulls across multiple pages', async () => {
    server.pageSize = 2;
    for (let i = 0; i < 5; i++) server.write(remoteRecord(`r${i}`, T0 + i));
    expect((await sync()).pulled).toBe(5);
    expect(await db.history.count()).toBe(5);
  });
});
