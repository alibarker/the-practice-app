import { planTotalSec, sectionElapsedMs, totalElapsedMs } from './timer';
import type { ActiveSession, Plan, SessionSummary } from './types';

/** Sessions shorter than this (e.g. an accidental tap on a plan card) aren't saved. */
export const MIN_SAVED_SESSION_MS = 10_000;

export type SessionAction =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'jumpTo'; index: number }
  | { type: 'pause' }
  | { type: 'resume' };

export function startSession(plan: Plan, now: number): ActiveSession {
  if (plan.sections.length === 0) throw new Error('Plan has no sections');
  return {
    planId: plan.id,
    planSnapshot: plan,
    startedAt: now,
    currentIndex: 0,
    sectionStartedAt: now,
    pausedAt: null,
    sectionPausedMs: 0,
    totalPausedMs: 0,
    sectionRecords: plan.sections.map((sec, i) => ({
      sectionId: sec.id,
      plannedSec: sec.durationSec,
      actualMs: 0,
      visited: i === 0,
    })),
  };
}

export function isLastSection(s: ActiveSession): boolean {
  return s.currentIndex === s.planSnapshot.sections.length - 1;
}

/**
 * Add the current section's elapsed time to its record and fold any ongoing pause
 * into the session total. If paused, the session stays paused (pausedAt moves to now).
 */
function closeCurrentSection(s: ActiveSession, now: number): ActiveSession {
  const elapsed = sectionElapsedMs(s, now);
  const sectionRecords = s.sectionRecords.map((r, i) =>
    i === s.currentIndex ? { ...r, actualMs: r.actualMs + elapsed } : r,
  );
  const ongoingPause = s.pausedAt === null ? 0 : Math.max(0, now - s.pausedAt);
  return {
    ...s,
    sectionRecords,
    totalPausedMs: s.totalPausedMs + ongoingPause,
    pausedAt: s.pausedAt === null ? null : now,
  };
}

function goTo(s: ActiveSession, index: number, now: number): ActiveSession {
  if (index < 0 || index >= s.planSnapshot.sections.length) return s;
  const closed = closeCurrentSection(s, now);
  return {
    ...closed,
    currentIndex: index,
    sectionStartedAt: now,
    sectionPausedMs: 0,
    sectionRecords: closed.sectionRecords.map((r, i) =>
      i === index ? { ...r, visited: true } : r,
    ),
  };
}

/** Moving on from the last section is handled by finishSession, so 'next' there is a no-op. */
export function reduceSession(s: ActiveSession, action: SessionAction, now: number): ActiveSession {
  switch (action.type) {
    case 'next':
      return isLastSection(s) ? s : goTo(s, s.currentIndex + 1, now);
    case 'previous':
      return goTo(s, s.currentIndex - 1, now);
    case 'jumpTo':
      return action.index === s.currentIndex ? s : goTo(s, action.index, now);
    case 'pause':
      return s.pausedAt === null ? { ...s, pausedAt: now } : s;
    case 'resume': {
      if (s.pausedAt === null) return s;
      const paused = Math.max(0, now - s.pausedAt);
      return {
        ...s,
        pausedAt: null,
        sectionPausedMs: s.sectionPausedMs + paused,
        totalPausedMs: s.totalPausedMs + paused,
      };
    }
  }
}

export function finishSession(s: ActiveSession, now: number, completed: boolean): SessionSummary {
  const actualTotalMs = totalElapsedMs(s, now);
  const closed = closeCurrentSection(s, now);
  return {
    planId: s.planId,
    planName: s.planSnapshot.name,
    startedAt: s.startedAt,
    endedAt: now,
    completed,
    plannedTotalSec: planTotalSec(s.planSnapshot),
    actualTotalMs,
    pausedTotalMs: closed.totalPausedMs,
    sections: closed.sectionRecords.map((r, i) => {
      const sec = s.planSnapshot.sections[i]!;
      return { ...r, title: sec.title, kind: sec.kind };
    }),
  };
}

export function shouldSave(h: SessionSummary): boolean {
  return h.actualTotalMs >= MIN_SAVED_SESSION_MS;
}
