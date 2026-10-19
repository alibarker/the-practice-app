import { syncLabel, useSyncStatus } from '../sync/sync';

/** Sync status in the home screen's top bar. Hidden when the build has no Supabase settings. */
export function SyncBadge({ onClick }: { onClick: () => void }) {
  const status = useSyncStatus();
  if (!status.configured) return null;
  const tone = status.phase === 'error' ? 'error' : status.email ? '' : 'muted';
  return (
    <button className={`btn ghost sync-badge ${tone}`} onClick={onClick}>
      <span className={`sync-dot ${status.phase}`} aria-hidden />
      {syncLabel(status)}
    </button>
  );
}
