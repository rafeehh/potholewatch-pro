import { Link } from 'react-router-dom';
import type { RoadSummary } from '../lib/api';
import { scoreLine } from '../lib/format';
import Icon from './Icon';
import { ScoreBar } from './ui';

export default function RiskTable({ roads, limit }: { roads: RoadSummary[]; limit?: number }) {
  const rows = typeof limit === 'number' ? roads.slice(0, limit) : roads;
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="risk-table">
      <div className="rt-head" aria-hidden="true">
        <span>Rank</span>
        <span>Road stretch</span>
        <span className="rt-num">Verified</span>
        <span className="rt-num">Critical</span>
        <span className="rt-num">Open days</span>
        <span className="rt-score-col">Risk score</span>
        <span>Status</span>
      </div>
      {rows.map((road) => (
        <Link
          key={road.id}
          to={`/roads/${road.id}`}
          className={`rt-row${road.zone === 'alert' ? ' rt-alert' : ''}${road.total === 0 ? ' rt-clear' : ''}`}
        >
          <div className="rt-rank">
            {road.rank ? (
              <span className="rank-num">#{road.rank}</span>
            ) : (
              <span className="rank-none">
                <Icon name="check" size={13} /> Clear
              </span>
            )}
          </div>
          <div className="rt-road">
            <strong>{road.name}</strong>
            <span>{road.stretch}</span>
          </div>
          <div className="rt-num" data-label="Verified">
            <span className="mono">{road.verifiedCount}</span>
          </div>
          <div className="rt-num" data-label="Critical">
            <span className="mono">{road.criticalCount}</span>
          </div>
          <div className="rt-num" data-label="Open days">
            <span className="mono">{road.oldestOpenDays ? Math.round(road.oldestOpenDays) : '—'}</span>
          </div>
          <div className="rt-score-col" data-label="Risk score">
            <div className="rt-score">
              <span className="mono">{scoreLine(road.total)}</span>
              <ScoreBar value={road.total} max={max} tone={road.zone === 'alert' ? 'red' : 'ink'} />
            </div>
          </div>
          <div className="rt-zone">
            {road.zone === 'alert' && <span className="zone zone-alert">Red alert</span>}
            {road.zone === 'watch' && <span className="zone zone-watch">Watch</span>}
            {road.zone === 'clear' && <span className="zone zone-clear">Clear</span>}
            <Icon name="chevron" size={16} className="rt-chevron" />
          </div>
        </Link>
      ))}
    </div>
  );
}
