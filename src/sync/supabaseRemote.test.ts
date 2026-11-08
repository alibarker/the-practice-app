import { expect, it } from 'vitest';
import { PLANS } from '../data/plans';
import { finishSession, startSession } from '../domain/session';
import type { SessionHistory } from '../domain/types';
import { fromRow, toRow } from './supabaseRemote';

it('maps sessions to database rows and back without loss', () => {
  const T0 = 1_700_000_000_123;
  const h: SessionHistory = {
    ...finishSession(startSession(PLANS[2]!, T0), T0 + 3_600_456, true),
    id: '6f1c2c5e-6d0b-4d6e-9a59-1b3f0b5e2a10',
    modifiedAt: T0 + 3_600_500,
    deletedAt: null,
  };
  const row = toRow(h);
  expect(row.started_at).toBe(new Date(T0).toISOString());
  expect(fromRow(row)).toEqual(h);
  expect(fromRow(toRow({ ...h, deletedAt: T0 + 1 })).deletedAt).toBe(T0 + 1);
});
