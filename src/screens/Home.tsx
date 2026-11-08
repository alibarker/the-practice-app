import { PLANS } from '../data/plans';
import { formatMinutes } from '../domain/format';
import { planTotalSec } from '../domain/timer';
import type { ActiveSession, Plan } from '../domain/types';
import { SyncBadge } from '../components/SyncBadge';

interface Props {
  activeSession: ActiveSession | null;
  onStart: (plan: Plan) => void;
  onResume: () => void;
  onDiscard: () => void;
  onHistory: () => void;
  onAccount: () => void;
}

export function HomeScreen({
  activeSession,
  onStart,
  onResume,
  onDiscard,
  onHistory,
  onAccount,
}: Props) {
  const start = (plan: Plan) => {
    if (activeSession && !window.confirm('Discard the unfinished session and start a new one?')) {
      return;
    }
    onStart(plan);
  };

  return (
    <main className="screen home">
      <header className="topbar">
        <h1>The Practice App</h1>
        <SyncBadge onClick={onAccount} />
        <button className="btn ghost" onClick={onHistory}>
          History
        </button>
      </header>

      {activeSession && (
        <div className="banner" role="status">
          <span>
            Unfinished session: <strong>{activeSession.planSnapshot.name}</strong>, section{' '}
            {activeSession.currentIndex + 1} of {activeSession.planSnapshot.sections.length}
          </span>
          <div className="banner-actions">
            <button className="btn primary" onClick={onResume}>
              Resume
            </button>
            <button
              className="btn ghost"
              onClick={() => window.confirm('Discard this session?') && onDiscard()}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <p className="hint">How long have you got? Tap a plan to start.</p>
      <div className="plan-cards">
        {PLANS.map((plan) => {
          const total = planTotalSec(plan);
          const label = formatMinutes(total);
          return (
            <button key={plan.id} className="plan-card" onClick={() => start(plan)}>
              <span className="plan-name">{plan.name}</span>
              <span className="plan-meta">
                {label !== plan.name && <>{label} · </>}
                {plan.sections.length} sections
              </span>
              <span className="plan-preview">
                {plan.sections
                  .filter((s) => s.kind === 'play')
                  .map((s) => s.title)
                  .join(' · ')}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
