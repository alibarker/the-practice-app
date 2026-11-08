import { useEffect, useState } from 'react';
import { finishSession, reduceSession, shouldSave, startSession } from './domain/session';
import type { ActiveSession, Plan, SessionSummary } from './domain/types';
import type { SessionAction } from './domain/session';
import { loadActiveSession, saveActiveSession } from './storage/activeSession';
import { saveSession } from './storage/db';
import { AccountScreen } from './screens/Account';
import { HistoryDetailScreen, HistoryScreen } from './screens/History';
import { HomeScreen } from './screens/Home';
import { PracticeScreen } from './screens/Practice';
import { SummaryScreen } from './screens/Summary';
import { requestSync } from './sync/sync';

type View =
  | { name: 'home' }
  | { name: 'practice' }
  | { name: 'summary'; record: SessionSummary; saved: boolean }
  | { name: 'history' }
  | { name: 'historyDetail'; id: string }
  | { name: 'account' };

export default function App() {
  const [session, setSession] = useState<ActiveSession | null>(loadActiveSession);
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => saveActiveSession(session), [session]);

  const start = (plan: Plan) => {
    setSession(startSession(plan, Date.now()));
    setView({ name: 'practice' });
  };

  const dispatch = (action: SessionAction) =>
    setSession((s) => (s ? reduceSession(s, action, Date.now()) : s));

  const finish = async (completed: boolean) => {
    if (!session) return;
    const record = finishSession(session, Date.now(), completed);
    const saved = shouldSave(record);
    if (saved) {
      try {
        await saveSession(record);
        void requestSync();
      } catch (err) {
        console.error('Failed to save session', err);
      }
    }
    setSession(null);
    setView({ name: 'summary', record, saved });
  };

  switch (view.name) {
    case 'practice':
      if (session) {
        return <PracticeScreen session={session} dispatch={dispatch} onFinish={finish} />;
      }
      break;
    case 'summary':
      return (
        <SummaryScreen
          record={view.record}
          saved={view.saved}
          onDone={() => setView({ name: 'home' })}
        />
      );
    case 'history':
      return (
        <HistoryScreen
          onBack={() => setView({ name: 'home' })}
          onOpen={(id) => setView({ name: 'historyDetail', id })}
        />
      );
    case 'historyDetail':
      return <HistoryDetailScreen id={view.id} onBack={() => setView({ name: 'history' })} />;
    case 'account':
      return <AccountScreen onBack={() => setView({ name: 'home' })} />;
  }

  return (
    <HomeScreen
      activeSession={session}
      onStart={start}
      onResume={() => setView({ name: 'practice' })}
      onDiscard={() => setSession(null)}
      onHistory={() => setView({ name: 'history' })}
      onAccount={() => setView({ name: 'account' })}
    />
  );
}
