const MINUS = '\u2212';

/** Countdown display: rounds up while positive, so a fresh 5:00 section shows 5:00. */
export function formatCountdown(ms: number): string {
  if (ms > 0) return clock(Math.ceil(ms / 1000));
  const secs = Math.floor(-ms / 1000);
  return `${MINUS}${clock(secs)}`;
}

/** Elapsed/duration display, rounded down. */
export function formatDuration(ms: number): string {
  return clock(Math.floor(Math.max(0, ms) / 1000));
}

/** Signed offset, e.g. '+2:30' or '−1:05'. */
export function formatOffset(ms: number): string {
  const secs = Math.round(Math.abs(ms) / 1000);
  return `${ms < 0 ? MINUS : '+'}${clock(secs)}`;
}

export function formatMinutes(sec: number): string {
  return `${Math.round(sec / 60)} min`;
}

function clock(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function formatSessionDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
