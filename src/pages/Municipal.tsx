import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Report, Stats, Thresholds } from '../lib/api';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { daysOpen } from '../lib/stats';
import { formatDateTime, scoreLine, timeAgo } from '../lib/format';
import Icon from '../components/Icon';
import { EmptyState, ErrorBox, Loading, SeverityTag } from '../components/ui';

interface MunicipalData {
  verified: Report[];
  flagged: Report[];
  stats: Stats;
  thresholds: Thresholds;
}

type Action = 'resolve' | 'reinstate' | 'reject';

export default function Municipal() {
  const { data, loading, error, reload, setData } = useApi<MunicipalData>('/api/municipal', 30_000);
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');
  const [actionError, setActionError] = useState('');

  const act = async (report: Report, action: Action) => {
    setBusy(`${report.id}:${action}`);
    setActionError('');
    setFlash('');
    try {
      const next = await api<MunicipalData>(`/api/hazards/${report.id}/${action}`, { method: 'POST' });
      setData(next);
      setFlash(
        action === 'resolve'
          ? `Marked the ${report.typeLabel.toLowerCase()} on ${report.roadName} as repaired. It has left the risk score.`
          : action === 'reinstate'
            ? `Report restored to the public record after review.`
            : `Report rejected. It is hidden from public view.`,
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'That action failed.');
    } finally {
      setBusy('');
    }
  };

  if (loading && !data) {
    return (
      <div className="shell page-pad">
        <Loading label="Opening the municipal desk…" />
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

  const urgent = [...data.verified].sort((a, b) => b.score.total - a.score.total);

  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">Authority workspace</p>
        <h1>Municipal repair desk</h1>
        <p className="page-sub">
          Every verified hazard, ordered by the risk score the public sees. Mark a hazard repaired to remove it from the
          leaderboard; triage flagged reports before they return to public view.
        </p>
      </header>

      <div className="demo-banner">
        <Icon name="alert" size={16} />
        <span>
          Demo access: in a real deployment this desk would sit behind municipal staff login. Here any visitor can
          exercise the repair and review actions.
        </span>
      </div>

      {(flash || actionError) && (
        <div className={`toast-inline${actionError ? ' toast-error' : ''}`} role="status">
          <Icon name={actionError ? 'alert' : 'check'} size={16} /> {actionError || flash}
        </div>
      )}

      <div className="municipal-stats">
        <div>
          <span>Awaiting repair</span>
          <strong className="mono">{data.verified.length}</strong>
        </div>
        <div>
          <span>Flagged for review</span>
          <strong className="mono">{data.flagged.length}</strong>
        </div>
        <div>
          <span>Repaired all-time</span>
          <strong className="mono">{data.stats.resolved}</strong>
        </div>
        <div>
          <span>Avg. repair turnaround</span>
          <strong className="mono">
            {data.stats.avgResolutionDays ? `${data.stats.avgResolutionDays}d` : '—'}
          </strong>
        </div>
      </div>

      <section className="desk-section">
        <div className="section-head section-head-sm">
          <div>
            <h2>Repair queue</h2>
            <p className="section-desc">Ranked by Hazard Risk Score. Highest first — this is the dispatch order.</p>
          </div>
        </div>

        {urgent.length === 0 ? (
          <EmptyState title="No verified hazards open" body="Every verified hazard has been repaired. The board is clear." />
        ) : (
          <div className="desk-list">
            {urgent.map((report, i) => (
              <article className="desk-row" key={report.id}>
                <span className="desk-rank mono">#{i + 1}</span>
                <img src={report.media.url} alt="" loading="lazy" />
                <div className="desk-main">
                  <div className="desk-badges">
                    <SeverityTag severity={report.severity} />
                    <span className="pill pill-verified">Verified</span>
                  </div>
                  <Link to={`/hazards/${report.id}`} className="desk-title">
                    {report.typeLabel} · {report.roadName}
                  </Link>
                  <p className="desk-desc">{report.description}</p>
                  <span className="desk-meta">
                    <Icon name="pin" size={13} /> {report.roadStretch} · {report.verifyVotes} confirmations · open{' '}
                    {daysOpen(report.createdAt)} days · filed {formatDateTime(report.createdAt)}
                  </span>
                </div>
                <div className="desk-score">
                  <span className="mono">{scoreLine(report.score.total)}</span>
                  <span className="desk-score-label">risk pts</span>
                </div>
                <button
                  type="button"
                  className="btn btn-resolve btn-sm"
                  disabled={busy === `${report.id}:resolve`}
                  onClick={() => void act(report, 'resolve')}
                >
                  <Icon name="wrench" size={15} />
                  {busy === `${report.id}:resolve` ? 'Saving…' : 'Mark repaired'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="desk-section">
        <div className="section-head section-head-sm">
          <div>
            <h2>Flagged for review</h2>
            <p className="section-desc">
              These crossed {data.thresholds.flag} community flags and are frozen out of the public board. Reinstate if
              the evidence holds; reject if it does not.
            </p>
          </div>
        </div>

        {data.flagged.length === 0 ? (
          <EmptyState title="Review queue is empty" body="No reports are currently flagged as fake." />
        ) : (
          <div className="desk-list">
            {data.flagged.map((report) => (
              <article className="desk-row desk-row-flagged" key={report.id}>
                <span className="desk-rank">
                  <Icon name="flag" size={17} />
                </span>
                <img src={report.media.url} alt="" loading="lazy" />
                <div className="desk-main">
                  <div className="desk-badges">
                    <SeverityTag severity={report.severity} />
                    <span className="pill pill-flagged">{report.flagVotes} flags</span>
                    <span className="pill pill-pending">
                      {report.verifyVotes}/{data.thresholds.verify} confirmations
                    </span>
                  </div>
                  <Link to={`/hazards/${report.id}`} className="desk-title">
                    {report.typeLabel} · {report.roadName}
                  </Link>
                  <p className="desk-desc">{report.description}</p>
                  <span className="desk-meta">
                    Filed by {report.reporter.name} · {timeAgo(report.createdAt)} · {report.evidence.length} evidence
                    checks passed
                  </span>
                </div>
                <div className="desk-review-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy === `${report.id}:reinstate`}
                    onClick={() => void act(report, 'reinstate')}
                  >
                    <Icon name="check" size={14} /> Reinstate
                  </button>
                  <button
                    type="button"
                    className="btn btn-flag btn-sm"
                    disabled={busy === `${report.id}:reject`}
                    onClick={() => void act(report, 'reject')}
                  >
                    <Icon name="close" size={14} /> Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="desk-foot">
        <span>
          <Icon name="shield" size={14} /> Every action is written to the report history and updates the public board
          within one refresh.
        </span>
        <span className="mono">Thresholds: {data.thresholds.verify} verify · {data.thresholds.flag} flags · {data.thresholds.flagVerified} to freeze verified</span>
      </div>
    </div>
  );
}
