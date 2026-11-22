import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Report, Severity } from '../lib/api';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import Icon from '../components/Icon';
import HazardCard from '../components/HazardCard';
import { EmptyState, ErrorBox, Loading } from '../components/ui';

interface QueueData {
  queue: Report[];
  thresholds: { verify: number; flag: number };
}

const FILTERS: Array<{ key: 'all' | Severity; label: string }> = [
  { key: 'all', label: 'All pending' },
  { key: 'critical', label: 'Critical' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export default function Queue() {
  const { data, loading, error, reload, setData } = useApi<QueueData>('/api/queue', 20_000);
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [voteError, setVoteError] = useState('');

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const queue = data?.queue ?? [];
  const counts = useMemo(() => {
    return {
      all: queue.length,
      critical: queue.filter((r) => r.severity === 'critical').length,
      medium: queue.filter((r) => r.severity === 'medium').length,
      low: queue.filter((r) => r.severity === 'low').length,
    };
  }, [queue]);
  const visible = filter === 'all' ? queue : queue.filter((r) => r.severity === filter);

  const vote = async (report: Report, kind: 'verify' | 'flag') => {
    setBusyId(report.id);
    setVoteError('');
    try {
      const result = await api<{ transition: string | null; hazard: Report }>(`/api/hazards/${report.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ kind }),
      });
      if (result.transition === 'verified') {
        setMessage(`“${report.typeLabel}” on ${report.roadName} just became a verified hazard and is now scoring.`);
        if (data) {
          setData({
            ...data,
            queue: data.queue.filter((r) => r.id !== report.id),
          });
        }
      } else if (result.transition === 'flagged') {
        setMessage(`“${report.typeLabel}” on ${report.roadName} reached the flag threshold and went to municipal review.`);
        if (data) {
          setData({
            ...data,
            queue: data.queue.filter((r) => r.id !== report.id),
          });
        }
      } else {
        if (data) {
          setData({
            ...data,
            queue: data.queue.map((r) => (r.id === report.id ? result.hazard : r)),
          });
        }
      }
    } catch (err) {
      setVoteError(err instanceof ApiError ? err.message : 'Your vote did not go through.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">Community peer review</p>
        <h1>Verify what you see</h1>
        <p className="page-sub">
          These reports are not on the leaderboard yet. Confirm only the ones you have actually seen on the road — three
          independent confirmations promote a report, three flags remove it from public view.
        </p>
      </header>

      <div className="queue-rules">
        <span>
          <Icon name="users" size={16} /> {data?.thresholds.verify ?? 3} confirmations to verify
        </span>
        <span>
          <Icon name="flag" size={16} /> {data?.thresholds.flag ?? 3} flags to freeze
        </span>
        <span>
          <Icon name="lock" size={16} /> One vote per identity, never on your own report
        </span>
      </div>

      {message && (
        <div className="toast-inline" role="status">
          <Icon name="check" size={16} /> {message}
        </div>
      )}
      {voteError && (
        <div className="toast-inline toast-error" role="alert">
          <Icon name="alert" size={16} /> {voteError}
        </div>
      )}

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="mono">{counts[f.key]}</span>
          </button>
        ))}
        <span className="filter-note">
          <span className="live-dot" /> auto-refreshing
        </span>
      </div>

      {loading && !data && <Loading label="Loading the verification queue…" />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {data && visible.length === 0 && (
        <EmptyState
          title={queue.length === 0 ? 'The queue is clear' : 'Nothing at this severity'}
          body={
            queue.length === 0
              ? 'Every reported hazard has been verified, flagged or resolved. File a new report if you spot something the board is missing.'
              : 'No pending reports match this severity filter. Try another filter.'
          }
          action={
            <Link to="/report" className="btn btn-primary">
              <Icon name="camera" size={16} /> Report a hazard
            </Link>
          }
        />
      )}

      <div className="queue-grid">
        {data &&
          visible.map((report) => (
            <HazardCard
              key={report.id}
              report={report}
              threshold={data.thresholds.verify}
              flagThreshold={data.thresholds.flag}
              actions={
                <>
                  <button
                    type="button"
                    className={`btn btn-verify btn-sm${report.myVote === 'verify' ? ' is-active' : ''}`}
                    disabled={busyId === report.id}
                    onClick={() => void vote(report, 'verify')}
                  >
                    <Icon name="check" size={15} strokeWidth={2.2} />
                    {report.myVote === 'verify'
                      ? 'You confirmed this'
                      : report.isOwner
                        ? 'Your own report'
                        : 'I saw this too'}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-flag btn-sm${report.myVote === 'flag' ? ' is-active' : ''}`}
                    disabled={busyId === report.id || report.isOwner}
                    onClick={() => void vote(report, 'flag')}
                  >
                    <Icon name="flag" size={14} />
                    {report.myVote === 'flag' ? 'Flagged' : 'Flag as fake'}
                  </button>
                </>
              }
            />
          ))}
      </div>

      {data && queue.length > 0 && (
        <p className="queue-foot-note">
          <Icon name="shield" size={14} /> Votes are tied to a device identity and cannot be repeated. Reports you filed
          yourself cannot be verified by you.
        </p>
      )}
    </div>
  );
}
