import { describe, expect, it } from 'vitest';
import { finishSession, reduceSession, shouldSave, startSession } from './session';
import {
  minutesOver,
  sectionElapsedMs,
  sectionRemainingMs,
  sessionRemainingMs,
  totalElapsedMs,
  vsPlanMs,
} from './timer';
import type { Plan } from './types';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

const plan: Plan = {
  id: 'test',
  name: 'Test',
  sections: [
    { id: 'a', title: 'A', durationSec: 60, kind: 'play' },
    { id: 'b', title: 'B', durationSec: 120, kind: 'rest' },
    { id: 'c', title: 'C', durationSec: 180, kind: 'play' },
  ],
};

describe('timer', () => {
  it('counts down the current section from its duration', () => {
    const s = startSession(plan, T0);
    expect(sectionRemainingMs(s, T0)).toBe(MIN);
    expect(sectionRemainingMs(s, T0 + 20_000)).toBe(40_000);
    expect(sessionRemainingMs(s, T0 + 20_000)).toBe(40_000 + 5 * MIN);
  });

  it('goes negative when over and counts whole minutes over', () => {
    const s = startSession(plan, T0);
    expect(sectionRemainingMs(s, T0 + 90_000)).toBe(-30_000);
    expect(minutesOver(s, T0 + 90_000)).toBe(0);
    expect(minutesOver(s, T0 + 2 * MIN)).toBe(1);
    expect(minutesOver(s, T0 + 3.5 * MIN)).toBe(2);
  });

  it('pushes projected finish out when over', () => {
    const s = startSession(plan, T0);
    // 2 min into a 1 min section: remaining clamps to 0, rest of plan still 5 min.
    expect(sessionRemainingMs(s, T0 + 2 * MIN)).toBe(5 * MIN);
    expect(vsPlanMs(s, T0 + 2 * MIN)).toBe(MIN);
    expect(vsPlanMs(s, T0 + 30_000)).toBe(0);
  });
});

describe('pause', () => {
  it('freezes section and total time while paused', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'pause' }, T0 + 10_000);
    expect(sectionElapsedMs(s, T0 + 50_000)).toBe(10_000);
    expect(totalElapsedMs(s, T0 + 50_000)).toBe(10_000);
    s = reduceSession(s, { type: 'resume' }, T0 + 50_000);
    expect(sectionElapsedMs(s, T0 + 55_000)).toBe(15_000);
    expect(totalElapsedMs(s, T0 + 55_000)).toBe(15_000);
    expect(s.totalPausedMs).toBe(40_000);
  });

  it('ignores double pause and resume when not paused', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'pause' }, T0 + 1000);
    expect(reduceSession(s, { type: 'pause' }, T0 + 5000)).toBe(s);
    const running = startSession(plan, T0);
    expect(reduceSession(running, { type: 'resume' }, T0 + 5000)).toBe(running);
  });

  it('stays paused when navigating, and starts the new section at zero', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'pause' }, T0 + 10_000);
    s = reduceSession(s, { type: 'next' }, T0 + 30_000);
    expect(s.pausedAt).toBe(T0 + 30_000);
    expect(s.sectionRecords[0]!.actualMs).toBe(10_000);
    expect(sectionElapsedMs(s, T0 + 60_000)).toBe(0);
    s = reduceSession(s, { type: 'resume' }, T0 + 60_000);
    expect(sectionElapsedMs(s, T0 + 65_000)).toBe(5_000);
    expect(totalElapsedMs(s, T0 + 65_000)).toBe(15_000);
    expect(s.totalPausedMs).toBe(50_000);
  });
});

describe('navigation', () => {
  it('next records actual time and marks the next section visited', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'next' }, T0 + 75_000);
    expect(s.currentIndex).toBe(1);
    expect(s.sectionRecords[0]!.actualMs).toBe(75_000);
    expect(s.sectionRecords[1]!.visited).toBe(true);
    expect(sectionRemainingMs(s, T0 + 75_000)).toBe(2 * MIN);
  });

  it('next on the last section is a no-op', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'jumpTo', index: 2 }, T0);
    expect(reduceSession(s, { type: 'next' }, T0 + 1000)).toBe(s);
  });

  it('previous restarts the earlier section and accumulates its actual time', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'next' }, T0 + 30_000);
    s = reduceSession(s, { type: 'previous' }, T0 + 40_000);
    expect(s.currentIndex).toBe(0);
    expect(sectionRemainingMs(s, T0 + 40_000)).toBe(MIN);
    s = reduceSession(s, { type: 'next' }, T0 + 60_000);
    expect(s.sectionRecords[0]!.actualMs).toBe(50_000);
    expect(s.sectionRecords[1]!.actualMs).toBe(10_000);
  });

  it('previous on the first section is a no-op', () => {
    const s = startSession(plan, T0);
    expect(reduceSession(s, { type: 'previous' }, T0 + 1000)).toBe(s);
  });

  it('jumpTo skips sections, leaving them unvisited', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'jumpTo', index: 2 }, T0 + 5000);
    expect(s.currentIndex).toBe(2);
    expect(s.sectionRecords.map((r) => r.visited)).toEqual([true, false, true]);
    expect(reduceSession(s, { type: 'jumpTo', index: 9 }, T0 + 6000)).toBe(s);
  });
});

describe('finish', () => {
  it('produces a history record with per-section actuals', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'next' }, T0 + MIN);
    s = reduceSession(s, { type: 'pause' }, T0 + 2 * MIN);
    s = reduceSession(s, { type: 'resume' }, T0 + 3 * MIN);
    const h = finishSession(s, T0 + 4 * MIN, false);
    expect(h.completed).toBe(false);
    expect(h.plannedTotalSec).toBe(360);
    expect(h.actualTotalMs).toBe(3 * MIN);
    expect(h.pausedTotalMs).toBe(MIN);
    expect(h.sections.map((r) => r.actualMs)).toEqual([MIN, 2 * MIN, 0]);
    expect(h.sections[1]).toMatchObject({ title: 'B', kind: 'rest', visited: true });
  });

  it('counts an ongoing pause when finishing while paused', () => {
    let s = startSession(plan, T0);
    s = reduceSession(s, { type: 'pause' }, T0 + 20_000);
    const h = finishSession(s, T0 + 50_000, false);
    expect(h.actualTotalMs).toBe(20_000);
    expect(h.pausedTotalMs).toBe(30_000);
    expect(h.sections[0]!.actualMs).toBe(20_000);
  });

  it('discards sessions under 10 seconds', () => {
    const s = startSession(plan, T0);
    expect(shouldSave(finishSession(s, T0 + 9_999, false))).toBe(false);
    expect(shouldSave(finishSession(s, T0 + 10_000, false))).toBe(true);
  });
});
