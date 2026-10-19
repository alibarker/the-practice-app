import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionHistory } from '../domain/types';
import type { PullPage, Remote } from './engine';

const PAGE_SIZE = 500;

/** Row shape of public.sessions (see supabase/migrations). */
interface SessionRow {
  id: string;
  plan_id: string;
  plan_name: string;
  started_at: string;
  ended_at: string;
  completed: boolean;
  planned_total_sec: number;
  actual_total_ms: number;
  paused_total_ms: number;
  sections: SessionHistory['sections'];
  modified_at: string;
  deleted_at: string | null;
  updated_at?: string;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (iso: string) => Date.parse(iso);

export function toRow(h: SessionHistory): SessionRow {
  return {
    id: h.id,
    plan_id: h.planId,
    plan_name: h.planName,
    started_at: iso(h.startedAt),
    ended_at: iso(h.endedAt),
    completed: h.completed,
    planned_total_sec: h.plannedTotalSec,
    actual_total_ms: h.actualTotalMs,
    paused_total_ms: h.pausedTotalMs,
    sections: h.sections,
    modified_at: iso(h.modifiedAt),
    deleted_at: h.deletedAt === null ? null : iso(h.deletedAt),
  };
}

export function fromRow(r: SessionRow): SessionHistory {
  return {
    id: r.id,
    planId: r.plan_id,
    planName: r.plan_name,
    startedAt: ms(r.started_at),
    endedAt: ms(r.ended_at),
    completed: r.completed,
    plannedTotalSec: r.planned_total_sec,
    actualTotalMs: Number(r.actual_total_ms),
    pausedTotalMs: Number(r.paused_total_ms),
    sections: r.sections,
    modifiedAt: ms(r.modified_at),
    deletedAt: r.deleted_at === null ? null : ms(r.deleted_at),
  };
}

export function sessionsRemote(client: SupabaseClient): Remote<SessionHistory> {
  return {
    async push(records) {
      // user_id defaults to auth.uid() on the server; a trigger there keeps the newer modified_at.
      const { error } = await client.from('sessions').upsert(records.map(toRow));
      if (error) throw new Error(error.message);
    },

    async pull(cursor): Promise<PullPage<SessionHistory>> {
      // updated_at is set by the server, so it's a reliable cursor whatever the device clocks say.
      let query = client
        .from('sessions')
        .select('*')
        .order('updated_at', { ascending: true })
        .limit(PAGE_SIZE);
      if (cursor) query = query.gt('updated_at', cursor);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as SessionRow[];
      return {
        records: rows.map(fromRow),
        cursor: rows.at(-1)?.updated_at ?? cursor,
        done: rows.length < PAGE_SIZE,
      };
    },
  };
}
