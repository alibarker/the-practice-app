import type { ActiveSession, Plan } from './types';

export function planTotalSec(plan: Plan): number {
  return plan.sections.reduce((sum, s) => sum + s.durationSec, 0);
}

/** The clock reading to use: frozen at pausedAt while paused. */
function effectiveNow(s: ActiveSession, now: number): number {
  return s.pausedAt ?? now;
}

export function currentSection(s: ActiveSession) {
  const section = s.planSnapshot.sections[s.currentIndex];
  if (!section) throw new Error(`No section at index ${s.currentIndex}`);
  return section;
}

export function sectionElapsedMs(s: ActiveSession, now: number): number {
  return Math.max(0, effectiveNow(s, now) - s.sectionStartedAt - s.sectionPausedMs);
}

/** Negative when over time. */
export function sectionRemainingMs(s: ActiveSession, now: number): number {
  return currentSection(s).durationSec * 1000 - sectionElapsedMs(s, now);
}

/** Whole minutes past the section's end (0 until a full minute over). */
export function minutesOver(s: ActiveSession, now: number): number {
  const remaining = sectionRemainingMs(s, now);
  return remaining < 0 ? Math.floor(-remaining / 60_000) : 0;
}

export function currentPauseMs(s: ActiveSession, now: number): number {
  return s.pausedAt === null ? 0 : Math.max(0, now - s.pausedAt);
}

/** Practice time since start, excluding pauses. */
export function totalElapsedMs(s: ActiveSession, now: number): number {
  return Math.max(0, now - s.startedAt - s.totalPausedMs - currentPauseMs(s, now));
}

/** Current section's remaining time (if any) plus every section after it. */
export function sessionRemainingMs(s: ActiveSession, now: number): number {
  const later = s.planSnapshot.sections
    .slice(s.currentIndex + 1)
    .reduce((sum, sec) => sum + sec.durationSec * 1000, 0);
  return Math.max(0, sectionRemainingMs(s, now)) + later;
}

/** Projected finish versus the plan's total: positive means running over. */
export function vsPlanMs(s: ActiveSession, now: number): number {
  return totalElapsedMs(s, now) + sessionRemainingMs(s, now) - planTotalSec(s.planSnapshot) * 1000;
}
