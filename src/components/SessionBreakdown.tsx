import { formatDuration, formatOffset } from '../domain/format';
import type { SessionHistory } from '../domain/types';

export function SessionBreakdown({ record }: { record: SessionHistory }) {
  const plannedMs = record.plannedTotalSec * 1000;
  return (
    <>
      <dl className="totals">
        <div>
          <dt>Planned</dt>
          <dd>{formatDuration(plannedMs)}</dd>
        </div>
        <div>
          <dt>Actual</dt>
          <dd>{formatDuration(record.actualTotalMs)}</dd>
        </div>
        <div>
          <dt>Paused</dt>
          <dd>{formatDuration(record.pausedTotalMs)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{record.completed ? 'Completed' : 'Ended early'}</dd>
        </div>
      </dl>

      <table className="breakdown">
        <thead>
          <tr>
            <th>Section</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Diff</th>
          </tr>
        </thead>
        <tbody>
          {record.sections.map((s) => {
            const diff = s.actualMs - s.plannedSec * 1000;
            const skipped = !s.visited;
            return (
              <tr key={s.sectionId} className={`${s.kind} ${skipped ? 'skipped' : ''}`}>
                <td>{s.title}</td>
                <td>{formatDuration(s.plannedSec * 1000)}</td>
                <td>{skipped ? 'Skipped' : formatDuration(s.actualMs)}</td>
                <td className={!skipped && diff >= 1000 ? 'over' : ''}>
                  {skipped ? '' : formatOffset(diff)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
