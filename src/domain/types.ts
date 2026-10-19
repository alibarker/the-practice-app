export type SectionKind = 'play' | 'rest';

export interface PlanSection {
  /** Stable id, e.g. 'p45-long-tones'. Logs and history refer to sections by this. */
  id: string;
  title: string;
  notes?: string;
  durationSec: number;
  kind: SectionKind;
}

export interface Plan {
  id: string;
  name: string;
  sections: PlanSection[];
}

/** Reserved for v2 session logging; unused in v1. */
export interface SectionLog {
  exercises?: string[];
  tempoBpm?: number;
  articulation?: string;
  notes?: string;
}

export interface SectionRecord {
  sectionId: string;
  plannedSec: number;
  /** Practice time spent in this section, summed across visits, excluding pauses. */
  actualMs: number;
  visited: boolean;
  log?: SectionLog;
}

/** A session in progress. All timing derives from wall-clock timestamps (epoch ms). */
export interface ActiveSession {
  planId: string;
  /** Copy of the plan, so later plan edits can't corrupt a live session. */
  planSnapshot: Plan;
  startedAt: number;
  currentIndex: number;
  sectionStartedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Paused time accumulated in the current section visit. */
  sectionPausedMs: number;
  /** Paused time accumulated across the whole session (excluding any ongoing pause). */
  totalPausedMs: number;
  sectionRecords: SectionRecord[];
}

export interface SessionHistory {
  id?: number;
  planId: string;
  planName: string;
  startedAt: number;
  endedAt: number;
  /** False if the session was ended early. */
  completed: boolean;
  plannedTotalSec: number;
  actualTotalMs: number;
  pausedTotalMs: number;
  sections: (SectionRecord & { title: string; kind: SectionKind })[];
}
