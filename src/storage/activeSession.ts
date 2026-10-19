import type { ActiveSession } from '../domain/types';

const KEY = 'activeSession';

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    const valid =
      typeof parsed.startedAt === 'number' &&
      typeof parsed.currentIndex === 'number' &&
      Array.isArray(parsed.planSnapshot?.sections) &&
      parsed.currentIndex < parsed.planSnapshot.sections.length &&
      Array.isArray(parsed.sectionRecords);
    return valid ? parsed : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession | null): void {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (e.g. private mode); the session still works in memory.
  }
}
