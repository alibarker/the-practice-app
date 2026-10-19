export function ProgressBar({ fraction, over }: { fraction: number; over: boolean }) {
  const pct = Math.min(1, Math.max(0, fraction)) * 100;
  return (
    <div className={`progress ${over ? 'over' : ''}`} aria-hidden>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
