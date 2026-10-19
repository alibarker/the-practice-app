import { useEffect, useState } from 'react';
import { SessionBreakdown } from '../components/SessionBreakdown';
import { formatDuration, formatSessionDate } from '../domain/format';
import type { SessionHistory } from '../domain/types';
import { getSession, listSessions } from '../storage/db';

export function HistoryScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (id: number) => void;
}) {
  const [sessions, setSessions] = useState<SessionHistory[] | null>(null);
  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  return (
    <main className="screen history">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          ◀ Home
        </button>
        <h1>History</h1>
      </header>
      {sessions === null ? null : sessions.length === 0 ? (
        <p className="hint">No sessions yet. Go practise!</p>
      ) : (
        <ul className="history-list">
          {sessions.map((h) => (
            <li key={h.id}>
              <button onClick={() => h.id !== undefined && onOpen(h.id)}>
                <span className="history-date">{formatSessionDate(h.startedAt)}</span>
                <span className="history-time">
                  {formatDuration(h.actualTotalMs)} / {formatDuration(h.plannedTotalSec * 1000)}
                </span>
                <span className="history-plan">{h.planName}</span>
                <span className={`history-status ${h.completed ? '' : 'early'}`}>
                  {h.completed ? 'Completed' : 'Ended early'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function HistoryDetailScreen({ id, onBack }: { id: number; onBack: () => void }) {
  const [record, setRecord] = useState<SessionHistory | null | undefined>(undefined);
  useEffect(() => {
    getSession(id)
      .then((r) => setRecord(r ?? null))
      .catch(() => setRecord(null));
  }, [id]);

  return (
    <main className="screen summary">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          ◀ History
        </button>
        <h1>{record ? `${record.planName} plan` : 'Session'}</h1>
      </header>
      {record === null && <p className="hint">Session not found.</p>}
      {record && (
        <>
          <p className="hint">{formatSessionDate(record.startedAt)}</p>
          <SessionBreakdown record={record} />
        </>
      )}
    </main>
  );
}
