import { SessionBreakdown } from '../components/SessionBreakdown';
import { formatSessionDate } from '../domain/format';
import type { SessionSummary } from '../domain/types';

interface Props {
  record: SessionSummary;
  saved: boolean;
  onDone: () => void;
}

export function SummaryScreen({ record, saved, onDone }: Props) {
  return (
    <main className="screen summary">
      <header className="topbar">
        <h1>{record.completed ? 'Session complete' : 'Session ended'}</h1>
        <button className="btn primary" onClick={onDone}>
          Done
        </button>
      </header>
      <p className="hint">
        {record.planName} plan · started {formatSessionDate(record.startedAt)}
        {!saved && ' · Under 10 seconds, so not saved to history'}
      </p>
      <SessionBreakdown record={record} />
    </main>
  );
}
