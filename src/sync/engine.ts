import type { SyncFields } from '../domain/types';

/** One page of server changes, oldest first. `cursor` marks where the next page starts. */
export interface PullPage<T> {
  records: T[];
  cursor: string | null;
  done: boolean;
}

export interface Remote<T extends SyncFields> {
  push(records: T[]): Promise<void>;
  pull(cursor: string | null): Promise<PullPage<T>>;
}

export interface LocalTable<T extends SyncFields> {
  /** Records changed on this device that the server hasn't seen yet. */
  dirty(): Promise<T[]>;
  /** Mark pushed records clean, unless they changed again while the push was in flight. */
  markClean(records: T[]): Promise<void>;
  /** Store server records, keeping a local record instead if its change is newer. */
  applyRemote(records: T[]): Promise<void>;
}

export interface CursorStore {
  get(): string | null;
  set(cursor: string | null): void;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
}

/** Push local changes, then pull everything the server changed since the last pull. */
export async function syncTable<T extends SyncFields>(
  local: LocalTable<T>,
  remote: Remote<T>,
  cursor: CursorStore,
): Promise<SyncResult> {
  const dirty = await local.dirty();
  if (dirty.length > 0) {
    await remote.push(dirty);
    await local.markClean(dirty);
  }

  let pulled = 0;
  let page: PullPage<T>;
  do {
    page = await remote.pull(cursor.get());
    if (page.records.length > 0) {
      await local.applyRemote(page.records);
      pulled += page.records.length;
    }
    cursor.set(page.cursor);
  } while (!page.done);

  return { pushed: dirty.length, pulled };
}

/** Last-write-wins: should an incoming record replace the local one? */
export function remoteWins(local: SyncFields | undefined, remote: SyncFields): boolean {
  return !local || remote.modifiedAt >= local.modifiedAt;
}
