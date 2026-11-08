import { useLiveQuery } from 'dexie-react-hooks';
import { SessionBreakdown } from '../components/SessionBreakdown';
import { formatDuration, formatSessionDate } from '../domain/format';
import { deleteSession, getSession, listSessions } from '../storage/db';
import { requestSync } from '../sync/sync';

export function HistoryScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  // Live, so sessions pulled from other devices appear without leaving the screen.
  const sessions = useLiveQuery(listSessions);

  return (
    <main className="screen history">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          ◀ Home
        </button>
        <h1>History</h1>
      </header>
      {sessions === undefined ? null : sessions.length === 0 ? (
        <p className="hint">No sessions yet. Go practise!</p>
      ) : (
        <ul className="history-list">
          {sessions.map((h) => (
            <li key={h.id}>
              <button onClick={() => onOpen(h.id)}>
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

export function HistoryDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  // undefined while loading, null once we know it's missing or deleted.
  const record = useLiveQuery(async () => (await getSession(id)) ?? null, [id]);

  const remove = async () => {
    if (!window.confirm('Delete this session from your history?')) return;
    await deleteSession(id);
    void requestSync();
    onBack();
  };

  return (
    <main className="screen summary">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          ◀ History
        </button>
        <h1>{record ? `${record.planName} plan` : 'Session'}</h1>
        {record && (
          <button className="btn ghost danger" onClick={remove}>
            Delete
          </button>
        )}
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
