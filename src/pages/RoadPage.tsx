import { Link, useParams } from 'react-router-dom';
import type { Report, RoadSummary } from '../lib/api';
import { useApi } from '../lib/useApi';
import { scoreLine } from '../lib/format';
import Icon from '../components/Icon';
import HazardCard from '../components/HazardCard';
import RiskMap from '../components/RiskMap';
import { ErrorBox, Loading, ScoreBreakdown, ScoreBar } from '../components/ui';

interface RoadData {
  road: RoadSummary;
  reports: Report[];
}

export default function RoadPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useApi<RoadData>(`/api/roads/${id}`, 20_000);

  if (loading && !data) {
    return (
      <div className="shell page-pad">
        <Loading label="Opening the stretch record…" />
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

  const { road, reports } = data;
  const verified = reports.filter((r) => r.status === 'verified');
  const pending = reports.filter((r) => r.status === 'pending');
  const history = reports.filter((r) => r.status === 'resolved' || r.status === 'flagged');
  const maxRef = Math.max(road.total, 100);

  return (
    <div className="road-page">
      <section className="road-hero">
        <div className="shell">
          <nav className="crumbs crumbs-light" aria-label="Breadcrumb">
            <Link to="/leaderboard">Leaderboard</Link>
            <Icon name="chevron" size={13} />
            <span>{road.name}</span>
          </nav>
          <div className="road-hero-grid">
            <div>
              <div className="road-tags">
                {road.zone === 'alert' && <span className="zone zone-alert">Rank #{road.rank} · Red alert zone</span>}
                {road.zone === 'watch' && <span className="zone zone-watch">Rank #{road.rank} · On watch</span>}
                {road.zone === 'clear' && <span className="zone zone-clear">Clear · no open verified hazards</span>}
                <span className="road-district">
                  <Icon name="pin" size={13} /> {road.district}
                </span>
              </div>
              <h1>{road.name}</h1>
              <p className="road-stretch">{road.stretch}</p>
              <p className="road-notes">{road.notes}</p>
              <div className="road-facts">
                <span>
                  <strong className="mono">{road.lengthKm} km</strong> watched
                </span>
                <span>
                  <strong className="mono">{road.verifiedCount}</strong> verified open
                </span>
                <span>
                  <strong className="mono">{road.pendingCount}</strong> pending
                </span>
                <span>
                  <strong className="mono">{road.resolvedCount}</strong> repaired
                </span>
              </div>
            </div>
            <div className="road-scorecard">
              <span className="bs-label">Hazard Risk Score</span>
              <strong className="road-score mono">{scoreLine(road.total)}</strong>
              <ScoreBar value={road.total} max={maxRef} tone={road.zone === 'alert' ? 'red' : 'ink'} />
              <ScoreBreakdown
                severity={road.severity}
                votes={road.votes}
                days={road.days}
                total={road.total}
                compact
              />
            </div>
          </div>
        </div>
      </section>

      <div className="shell road-body">
        <div className="road-main">
          <section className="panel">
            <div className="panel-title-row">
              <h2>Hazards on this stretch</h2>
              <span className="panel-count">{road.openReports.length} active pins</span>
            </div>
            <RiskMap reports={road.openReports} roadName={road.name} />
          </section>

          <section>
            <div className="section-head section-head-sm">
              <div>
                <h2>Verified &amp; still open</h2>
                <p className="section-desc">These are the hazards compounding 1.5 risk points for every day they stay open.</p>
              </div>
              {road.pendingCount > 0 && (
                <Link to="/queue" className="btn btn-ghost btn-sm">
                  Verify {road.pendingCount} pending
                </Link>
              )}
            </div>
            {verified.length === 0 ? (
              <div className="state-box state-empty state-sm">
                <Icon name="check" size={22} />
                <h3>No verified hazards open</h3>
                <p>This stretch is not currently adding to the leaderboard.</p>
              </div>
            ) : (
              <div className="stack">
                {verified.map((report) => (
                  <HazardCard key={report.id} report={report} threshold={3} flagThreshold={3} showRoad={false} />
                ))}
              </div>
            )}
          </section>

          {pending.length > 0 && (
            <section>
              <div className="section-head section-head-sm">
                <div>
                  <h2>Awaiting verification</h2>
                  <p className="section-desc">Filed by neighbours, but not scoring until confirmed.</p>
                </div>
              </div>
              <div className="stack">
                {pending.map((report) => (
                  <HazardCard key={report.id} report={report} threshold={3} flagThreshold={3} showRoad={false} />
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <div className="section-head section-head-sm">
                <div>
                  <h2>History</h2>
                  <p className="section-desc">Repaired hazards and frozen reports. History stays public.</p>
                </div>
              </div>
              <div className="stack">
                {history.map((report) => (
                  <HazardCard key={report.id} report={report} threshold={3} flagThreshold={3} showRoad={false} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="road-aside">
          <div className="panel">
            <h3>Maintaining authority</h3>
            <p className="authority-name">{road.authority}</p>
            <p className="panel-fine">
              Verified hazards on this stretch are visible on the municipal desk, ordered by risk score. Repair status is
              updated there.
            </p>
            <Link to="/municipal" className="aside-link">
              Open municipal desk <Icon name="arrow" size={14} />
            </Link>
          </div>
          <div className="panel">
            <h3>Accountability snapshot</h3>
            <dl className="meta-list">
              <div>
                <dt>Oldest open hazard</dt>
                <dd>{road.oldestOpenDays ? `${Math.round(road.oldestOpenDays)} days` : '—'}</dd>
              </div>
              <div>
                <dt>Critical hazards</dt>
                <dd>{road.criticalCount}</dd>
              </div>
              <div>
                <dt>Total reports</dt>
                <dd>{road.reportCount}</dd>
              </div>
              <div>
                <dt>Flagged for review</dt>
                <dd>{road.flaggedCount}</dd>
              </div>
            </dl>
          </div>
          <div className="aside-card aside-soft">
            <h3>
              <Icon name="shield" size={17} /> Verified or nothing
            </h3>
            <p>
              Only hazards that reached three independent confirmations appear in the score above. Pending reports are
              listed for transparency but contribute zero.
            </p>
            <Link to="/report" className="aside-link">
              Report a hazard here <Icon name="arrow" size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
