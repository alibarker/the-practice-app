import { useEffect, useRef } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { SectionList } from '../components/SectionList';
import { formatCountdown, formatDuration, formatMinutes, formatOffset } from '../domain/format';
import { isLastSection, type SessionAction } from '../domain/session';
import {
  currentSection,
  minutesOver,
  sectionElapsedMs,
  sectionRemainingMs,
  sessionRemainingMs,
  totalElapsedMs,
  vsPlanMs,
} from '../domain/timer';
import type { ActiveSession } from '../domain/types';
import { useNow } from '../hooks/useNow';
import { useWakeLock } from '../hooks/useWakeLock';

interface Props {
  session: ActiveSession;
  dispatch: (action: SessionAction) => void;
  onFinish: (completed: boolean) => void;
}

export function PracticeScreen({ session, dispatch, onFinish }: Props) {
  const now = useNow();
  useWakeLock(true);

  const section = currentSection(session);
  const next = session.planSnapshot.sections[session.currentIndex + 1];
  const remaining = sectionRemainingMs(session, now);
  const over = remaining <= 0;
  const overMinutes = minutesOver(session, now);
  const paused = session.pausedAt !== null;
  const last = isLastSection(session);
  const vsPlan = vsPlanMs(session, now);
  const progress = sectionElapsedMs(session, now) / (section.durationSec * 1000);

  // Move focus to the new section's title so screen readers announce it.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus({ preventScroll: true }), [session.currentIndex]);

  const endEarly = () => {
    if (window.confirm('End this session now?')) onFinish(false);
  };

  const classes = ['screen', 'practice', section.kind, over && 'over', paused && 'paused']
    .filter(Boolean)
    .join(' ');

  return (
    <main className={classes}>
      {overMinutes > 0 && !paused && <div key={overMinutes} className="over-pulse" aria-hidden />}

      <header className="topbar stats">
        <span className="plan-label">{session.planSnapshot.name}</span>
        <Stat label="Elapsed" value={formatDuration(totalElapsedMs(session, now))} />
        <Stat label="Session left" value={formatDuration(sessionRemainingMs(session, now))} />
        <Stat
          label="vs plan"
          value={Math.abs(vsPlan) < 1000 ? 'on time' : formatOffset(vsPlan)}
          tone={vsPlan >= 1000 ? 'over' : undefined}
        />
        <button className="btn ghost small" onClick={endEarly}>
          End
        </button>
      </header>

      <section className="current-panel">
        <div className="section-heading">
          <span className="section-count">
            {section.kind === 'rest' ? '☕ ' : ''}
            {session.currentIndex + 1} / {session.planSnapshot.sections.length}
          </span>
          <h2 ref={titleRef} tabIndex={-1}>
            {section.title}
          </h2>
          {section.notes && <p className="notes">{section.notes}</p>}
        </div>

        <div className="big-timer" aria-live="off">
          {formatCountdown(remaining)}
        </div>
        <div className="timer-status" role="status">
          {paused
            ? 'Paused'
            : over
              ? `Over time${overMinutes > 0 ? ` · ${overMinutes} min` : ''}`
              : ' '}
        </div>

        <ProgressBar fraction={progress} over={over} />

        <p className="next-up">
          {next ? (
            <>
              Next: <strong>{next.title}</strong> · {formatMinutes(next.durationSec)}
            </>
          ) : (
            'Last section'
          )}
        </p>

        <div className="controls">
          <button
            className="btn"
            onClick={() => dispatch({ type: 'previous' })}
            disabled={session.currentIndex === 0}
            aria-label="Previous section"
          >
            ◀ Prev
          </button>
          <button className="btn" onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}>
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
          <button
            className="btn primary big"
            onClick={() => (last ? onFinish(true) : dispatch({ type: 'next' }))}
          >
            {last ? 'Finish ✓' : 'Next ▶'}
          </button>
        </div>
      </section>

      <SectionList
        session={session}
        now={now}
        onJump={(index) => dispatch({ type: 'jumpTo', index })}
      />
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'over' }) {
  return (
    <span className={`stat ${tone ?? ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </span>
  );
}
