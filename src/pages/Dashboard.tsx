import { Link } from 'react-router-dom';
import type { DashboardData } from '../lib/api';
import { useApi } from '../lib/useApi';
import { scoreLine } from '../lib/format';
import Icon from '../components/Icon';
import RiskTable from '../components/RiskTable';
import { ErrorBox, Loading, ScoreBar, SeverityTag } from '../components/ui';

export default function Dashboard() {
  const { data, loading, error, reload } = useApi<DashboardData>('/api/dashboard', 15_000);

  if (loading && !data) {
    return (
      <div className="shell page-pad">
        <Loading label="Reading the road watch…" />
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

  const { stats, roads, recentVerified } = data;
  const top = roads.slice(0, 3);
  const maxScore = Math.max(...roads.map((r) => r.total), 1);
  const leader = roads[0];

  return (
    <div className="dashboard">
      <section className="shell hero-shell">
        <div className="hero">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <span className="live-dot" /> Live road watch · Colombo
            </p>
            <h1>
              The road you drive every day,
              <span className="hero-em"> held to account.</span>
            </h1>
            <p className="hero-sub">
              Citizens photograph potholes, open manholes and collapsing tarmac. Neighbours verify that the hazard is
              real. Only then does it climb the public risk leaderboard — and reach the municipal desk.
            </p>
            <div className="hero-actions">
              <Link to="/report" className="btn btn-primary btn-lg">
                <Icon name="camera" size={18} /> Report a hazard
              </Link>
              <Link to="/leaderboard" className="btn btn-outline-light btn-lg">
                See the risk leaderboard <Icon name="arrow" size={17} />
              </Link>
            </div>
            <ul className="hero-trust">
              <li>
                <Icon name="camera" size={15} /> Live photo evidence
              </li>
              <li>
                <Icon name="users" size={15} /> {data.thresholds.verify} neighbour verifications
              </li>
              <li>
                <Icon name="wrench" size={15} /> Repair status tracked
              </li>
            </ul>
          </div>

          <aside className="hero-board">
            <div className="hb-head">
              <span className="hb-title">Live risk board</span>
              <span className="hb-live">
                <span className="live-dot" /> updated live
              </span>
            </div>
            <div className="hb-rows">
              {top.map((road) => (
                <Link to={`/roads/${road.id}`} key={road.id} className="hb-row">
                  <span className={`hb-rank${road.rank === 1 ? ' is-first' : ''}`}>
                    {road.rank ? `#${road.rank}` : '—'}
                  </span>
                  <span className="hb-main">
                    <span className="hb-name">
                      {road.name}
                      {road.rank === 1 && <span className="hb-alert">RED ALERT</span>}
                    </span>
                    <span className="hb-sub">
                      {road.verifiedCount} verified · {road.criticalCount} critical ·{' '}
                      {Math.round(road.oldestOpenDays)}d oldest
                    </span>
                    <ScoreBar value={road.total} max={maxScore} tone={road.rank === 1 ? 'red' : 'ink'} />
                  </span>
                  <span className="hb-score mono">{scoreLine(road.total)}</span>
                </Link>
              ))}
            </div>
            <div className="hb-foot">
              <span>
                <Icon name="shield" size={14} /> Only verified hazards score
              </span>
              <Link to="/leaderboard">
                Full board <Icon name="chevron" size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <div className="tape" aria-hidden="true" />

      <section className="shell stats-strip">
        <div className="stat">
          <span className="stat-label">Verified hazards open</span>
          <strong className="stat-value mono">{stats.verifiedOpen}</strong>
          <span className="stat-note">counting toward road scores</span>
        </div>
        <div className="stat">
          <span className="stat-label">Awaiting verification</span>
          <strong className="stat-value mono">{stats.pending}</strong>
          <span className="stat-note">{stats.verifyVotes} neighbour confirmations cast</span>
        </div>
        <div className="stat">
          <span className="stat-label">Kilometres watched</span>
          <strong className="stat-value mono">{stats.kmWatched}</strong>
          <span className="stat-note">across {stats.roadsWatched} named stretches</span>
        </div>
        <div className="stat">
          <span className="stat-label">Median wait for repair</span>
          <strong className="stat-value mono">{stats.avgOpenDays}d</strong>
          <span className="stat-note">{stats.resolved} hazards marked repaired</span>
        </div>
      </section>

      <section className="shell section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Public accountability</p>
            <h2>Road stretches ranked by verified risk</h2>
            <p className="section-desc">
              The score combines hazard severity, independent neighbour votes and how long the danger has gone
              unresolved. Rank #1 is the stretch that needs a repair crew first.
            </p>
          </div>
          <div className="section-action">
            <Link to="/leaderboard" className="btn btn-ghost">
              Full leaderboard <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
        <RiskTable roads={roads} limit={5} />
        <div className="table-note">
          <span>
            <span className="legend-dot legend-red" /> Red alert = highest verified risk
          </span>
          <span>
            <Icon name="check" size={13} /> Repaired hazards drop off the board automatically
          </span>
        </div>
      </section>

      <section className="shell section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Anti-scam by design</p>
            <h2>Why a fake report cannot climb this board</h2>
            <p className="section-desc">
              Most reporting apps die under a pile of prank entries. PotholeWatch keeps a hazard out of the public score
              until three separate neighbours back it up.
            </p>
          </div>
        </div>

        <div className="layers">
          <article className="layer">
            <span className="layer-step">01</span>
            <span className="layer-icon">
              <Icon name="lock" size={22} />
            </span>
            <h3>Evidence is captured, not downloaded</h3>
            <p>
              The upload must be a fresh file captured inside the app, timestamped within {45} minutes and read inside
              the road's GPS zone. Old screenshots and archived photos are refused at the server.
            </p>
          </article>
          <article className="layer">
            <span className="layer-step">02</span>
            <span className="layer-icon">
              <Icon name="users" size={22} />
            </span>
            <h3>Three independent neighbours</h3>
            <p>
              A new report waits in the pending queue. It becomes a verified hazard only after {data.thresholds.verify}{' '}
              different identities confirm they saw it, and nobody can vote twice or vote on their own report.
            </p>
          </article>
          <article className="layer">
            <span className="layer-step">03</span>
            <span className="layer-icon">
              <Icon name="flag" size={22} />
            </span>
            <h3>Flags freeze the score</h3>
            <p>
              {data.thresholds.flag} “flag as fake” votes pull a pending report out of public view and send it to the
              municipal review desk. Verified reports need five flags before they are frozen for review.
            </p>
          </article>
        </div>

        <div className="formula-card">
          <div className="formula-copy">
            <p className="eyebrow">The only number that matters</p>
            <h3>Hazard Risk Score</h3>
            <p>
              Severity carries the most weight. Community confirmation adds a smaller bump. Neglect compounds it every
              single day a verified hazard stays open.
            </p>
            <div className="formula-weights">
              <span>
                <i className="legend-dot legend-red" /> Critical <strong className="mono">50</strong>
              </span>
              <span>
                <i className="legend-dot legend-amber" /> Medium <strong className="mono">25</strong>
              </span>
              <span>
                <i className="legend-dot legend-green" /> Low <strong className="mono">10</strong>
              </span>
            </div>
          </div>
          <div className="formula-math">
            <span className="mono formula-line">
              <em>score</em> = (verified reports × severity weight)
            </span>
            <span className="mono formula-line indent">+ (community votes × 2)</span>
            <span className="mono formula-line indent">+ (unresolved days × 1.5)</span>
            {leader && leader.total > 0 && (
              <span className="formula-example">
                Today's #1 — {leader.name} scores <strong className="mono">{scoreLine(leader.total)}</strong>
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="shell section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Recent evidence</p>
            <h2>Hazards the community has already confirmed</h2>
          </div>
          <div className="section-action">
            <Link to="/queue" className="btn btn-ghost">
              Help verify {stats.pending} pending <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
        <div className="evidence-grid">
          {recentVerified.map((report) => (
            <Link to={`/hazards/${report.id}`} className="ev-card" key={report.id}>
              <div className="ev-media">
                <img src={report.media.url} alt={`${report.typeLabel} on ${report.roadName}`} loading="lazy" />
                <span className="ev-sev">
                  <SeverityTag severity={report.severity} />
                </span>
                <span className={`ev-state ${report.status === 'resolved' ? 'is-resolved' : ''}`}>
                  {report.status === 'resolved' ? 'Repaired' : 'Verified'}
                </span>
              </div>
              <div className="ev-body">
                <span className="ev-road">
                  <Icon name="pin" size={13} /> {report.roadName}
                </span>
                <p className="ev-desc">{report.description}</p>
                <div className="ev-foot">
                  <span>
                    <Icon name="users" size={13} /> {report.verifyVotes} confirmations
                  </span>
                  <span>{report.status === 'resolved' ? 'fixed' : `${Math.round(report.score.daysOpen)}d open`}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <p className="demo-note">
          <Icon name="spark" size={14} /> Demo data: seeded reports date back several weeks so the ageing penalty is
          visible on the board. New reports you file start at zero and stay pending.
        </p>
      </section>

      <section className="shell">
        <div className="cta-band">
          <div className="cta-copy">
            <h2>Seen a hazard that the board is missing?</h2>
            <p>
              One photo, one location check, three neighbours. That is the whole path from “somebody should fix this” to
              a ranked, addressable repair ticket.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/report" className="btn btn-primary btn-lg">
              <Icon name="camera" size={18} /> File a report
            </Link>
            <Link to="/queue" className="btn btn-outline-light btn-lg">
              Verify nearby reports
            </Link>
          </div>
        </div>
        <div className="last-updated">
          <span className="live-dot" /> Board refreshes every 15 seconds · live from this server
        </div>
      </section>
    </div>
  );
}
