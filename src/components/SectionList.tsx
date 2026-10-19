import { useEffect, useRef } from 'react';
import { formatDuration, formatMinutes } from '../domain/format';
import { sectionElapsedMs } from '../domain/timer';
import type { ActiveSession } from '../domain/types';

interface Props {
  session: ActiveSession;
  now: number;
  onJump: (index: number) => void;
}

export function SectionList({ session, now, onJump }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);
  // Keep the current section visible when the list scrolls on its own (landscape layout).
  // Never scroll the page itself: on phones that would push the timer off screen.
  useEffect(() => {
    const nav = navRef.current;
    const item = currentRef.current;
    if (!nav || !item || nav.scrollHeight <= nav.clientHeight) return;
    const top = item.offsetTop - nav.offsetTop;
    if (top < nav.scrollTop || top + item.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTo({ top: top - nav.clientHeight / 3, behavior: 'smooth' });
    }
  }, [session.currentIndex]);

  return (
    <nav ref={navRef} className="section-list" aria-label="Sections">
      <ol>
        {session.planSnapshot.sections.map((sec, i) => {
          const record = session.sectionRecords[i]!;
          const current = i === session.currentIndex;
          const actualMs = record.actualMs + (current ? sectionElapsedMs(session, now) : 0);
          const done = !current && record.visited && i < session.currentIndex;
          const state = current ? 'current' : done ? 'done' : 'upcoming';
          const overran = actualMs > sec.durationSec * 1000;
          return (
            <li
              key={sec.id}
              ref={current ? currentRef : undefined}
              className={`${state} ${sec.kind}`}
            >
              <button onClick={() => onJump(i)} aria-current={current ? 'step' : undefined}>
                <span className="marker">{current ? '▶' : done ? '✓' : ''}</span>
                <span className="title">{sec.title}</span>
                <span className={`time ${done && overran ? 'over' : ''}`}>
                  {record.visited && !current && record.actualMs > 0
                    ? formatDuration(record.actualMs)
                    : formatMinutes(sec.durationSec)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
