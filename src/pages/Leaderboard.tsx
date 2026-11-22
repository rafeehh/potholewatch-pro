import { Link } from 'react-router-dom';
import type { DashboardData } from '../lib/api';
import { useApi } from '../lib/useApi';
import { scoreLine, SEVERITY_WEIGHT } from '../lib/format';
import Icon from '../components/Icon';
import RiskTable from '../components/RiskTable';
import { ErrorBox, Loading } from '../components/ui';

export default function Leaderboard() {
  const { data, loading, error, reload } = useApi<DashboardData>('/api/dashboard', 20_000);

  if (loading && !data) {
    return (
      <div className="shell page-pad">
        <Loading />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="shell page-pad">
        <ErrorBox message={error} onRetry={reload} />
      </div>
    );
  }
  if (!data) return null;

  const { roads, stats } = data;
  const worst = roads[0];
  const totalScore = roads.reduce((s, r) => s + r.total, 0);

  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">Public accountability register</p>
        <h1>Hazard risk leaderboard</h1>
        <p className="page-sub">
          Every verified, unresolved hazard on a road stretch is rolled into one score. The newest danger and the oldest
          neglect both push a road upward. Rank #1 is the red alert zone.
        </p>
      </header>

      <div className="board-summary">
        <div className="bs-main">
          <span className="bs-label">Red alert zone</span>
          <h2>{worst ? worst.name : 'No active alerts'}</h2>
          <p>{worst ? worst.stretch : 'Every watched stretch is currently clear.'}</p>
          {worst && (
            <Link to={`/roads/${worst.id}`} className="btn btn-light btn-sm">
              Open stretch detail <Icon name="arrow" size={15} />
            </Link>
          )}
        </div>
        <div className="bs-score">
          <span className="bs-label">Highest risk score</span>
          <strong className="mono">{worst ? scoreLine(worst.total) : '0'}</strong>
          <span className="bs-sub">
            {worst ? `${worst.verifiedCount} verified · ${Math.round(worst.oldestOpenDays)} days oldest` : 'No open hazards'}
          </span>
        </div>
        <div className="bs-stats">
          <div>
            <span>Total risk on the board</span>
            <strong className="mono">{scoreLine(Math.round(totalScore * 10) / 10)}</strong>
          </div>
          <div>
            <span>Open verified hazards</span>
            <strong className="mono">{stats.verifiedOpen}</strong>
          </div>
          <div>
            <span>Resolved all-time</span>
            <strong className="mono">{stats.resolved}</strong>
          </div>
        </div>
      </div>

      <div className="section">
        <RiskTable roads={roads} />
      </div>

      <div className="board-lower">
        <section className="formula-card formula-card-solid">
          <div className="formula-copy">
            <p className="eyebrow">Scoring, in the open</p>
            <h3>How the rank is calculated</h3>
            <p>
              There is no editorial hand on this board. Each verified hazard contributes its severity weight, every
              independent confirmation adds points, and every day it stays unresolved adds 1.5 more.
            </p>
            <div className="formula-weights">
              <span>
                <i className="legend-dot legend-red" /> Critical <strong className="mono">{SEVERITY_WEIGHT.critical}</strong>
              </span>
              <span>
                <i className="legend-dot legend-amber" /> Medium <strong className="mono">{SEVERITY_WEIGHT.medium}</strong>
              </span>
              <span>
                <i className="legend-dot legend-green" /> Low <strong className="mono">{SEVERITY_WEIGHT.low}</strong>
              </span>
            </div>
          </div>
          <div className="formula-math">
            <span className="mono formula-line">
              <em>score</em> = (verified reports × severity weight)
            </span>
            <span className="mono formula-line indent">+ (community votes × 2)</span>
            <span className="mono formula-line indent">+ (unresolved days × 1.5)</span>
          </div>
        </section>

        <aside className="board-aside">
          <h3>What does not score</h3>
          <ul className="check-list">
            <li>
              <Icon name="close" size={15} /> Pending reports — they are queued, not counted
            </li>
            <li>
              <Icon name="close" size={15} /> Flagged or rejected reports
            </li>
            <li>
              <Icon name="close" size={15} /> Repaired hazards — they leave the board
            </li>
            <li>
              <Icon name="close" size={15} /> Duplicate filings at the same spot
            </li>
          </ul>
          <p className="aside-note">
            A hazard falls off the score the moment the municipal desk marks it repaired. The history stays on the road
            page.
          </p>
        </aside>
      </div>
    </div>
  );
}
