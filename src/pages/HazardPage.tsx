import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Comment, Report, Thresholds } from '../lib/api';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { daysOpen, formatDateTime, timeAgo } from '../lib/format';
import Icon from '../components/Icon';
import RiskMap from '../components/RiskMap';
import {
  Avatar,
  ErrorBox,
  EvidenceChips,
  Loading,
  ScoreBreakdown,
  SeverityTag,
  StatusBadge,
  VoteMeter,
} from '../components/ui';

interface HazardData {
  hazard: Report;
  comments: Comment[];
  thresholds: Thresholds;
}

export default function HazardPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useApi<HazardData>(`/api/hazards/${id}`);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  if (loading && !data) {
    return (
      <div className="shell page-pad">
        <Loading label="Opening the hazard record…" />
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

  const { hazard, comments, thresholds } = data;
  const canVote = hazard.status === 'pending' || hazard.status === 'verified';

  const vote = async (kind: 'verify' | 'flag') => {
    setBusy(kind);
    setActionError('');
    try {
      const result = await api<{ transition: string | null; hazard: Report }>(`/api/hazards/${hazard.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ kind }),
      });
      if (result.transition === 'verified') {
        setNotice('Threshold reached. This hazard is now verified and counting toward the road score.');
      } else if (result.transition === 'flagged') {
        setNotice('Flag threshold reached. The report is frozen and sent to the municipal review desk.');
      } else if (result.hazard.myVote) {
        setNotice(kind === 'verify' ? 'Confirmation recorded.' : 'Flag recorded. A moderator will see it.');
      } else {
        setNotice('Your vote was withdrawn.');
      }
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Your vote did not go through.');
    } finally {
      setBusy('');
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 2) return;
    setPosting(true);
    setActionError('');
    try {
      await api<{ comments: Comment[] }>(`/api/hazards/${hazard.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment.trim() }),
      });
      setComment('');
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not post that comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="shell page-pad">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/queue">Verify queue</Link>
        <Icon name="chevron" size={13} />
        <Link to={`/roads/${hazard.roadId}`}>{hazard.roadName}</Link>
        <Icon name="chevron" size={13} />
        <span>{hazard.typeLabel}</span>
      </nav>

      {(notice || actionError) && (
        <div className={`toast-inline${actionError ? ' toast-error' : ''}`} role="status">
          <Icon name={actionError ? 'alert' : 'check'} size={16} /> {actionError || notice}
        </div>
      )}

      <div className="hazard-layout">
        <div className="hazard-main">
          <div className="hazard-media">
            <img src={hazard.media.url} alt={`${hazard.severity} ${hazard.typeLabel} on ${hazard.roadName}`} />
            <div className="hazard-media-top">
              <SeverityTag severity={hazard.severity} large />
              <StatusBadge status={hazard.status} />
            </div>
            <span className="hazard-media-id mono">REPORT {hazard.id.replace('r_', '').toUpperCase().slice(0, 10)}</span>
          </div>

          <div className="hazard-headcard">
            <h1>
              {hazard.typeLabel} on {hazard.roadName}
            </h1>
            <p className="hazard-addr">
              <Icon name="pin" size={15} /> {hazard.roadStretch}, {hazard.district}
              <span className="hc-dot-sep">·</span>
              {hazard.media.width
                ? `${hazard.media.width}×${hazard.media.height} photo`
                : 'Uploaded photo'}
            </p>
            <p className="hazard-desc">{hazard.description}</p>
            <div className="hazard-reportmeta">
              <span>
                <Avatar name={hazard.reporter.name} size={26} /> Reported by {hazard.reporter.name}
              </span>
              <span>
                <Icon name="clock" size={14} /> {formatDateTime(hazard.createdAt)}
              </span>
              <span>
                <Icon name="chat" size={14} /> {hazard.commentCount} comments
              </span>
            </div>
          </div>

          <section className="panel">
            <h2>Discussion</h2>
            <p className="panel-sub">Road users on this stretch can add context, warnings and repair updates.</p>
            <div className="comment-list">
              {comments.length === 0 && <p className="comment-empty">No comments yet. Add the first update.</p>}
              {comments.map((c) => (
                <div className="comment" key={c.id}>
                  <Avatar name={c.author} size={32} />
                  <div>
                    <div className="comment-top">
                      <strong>{c.author}</strong>
                      <span>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form className="comment-form" onSubmit={submitComment}>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add what you saw — direction of travel, lane, whether it has been marked…"
                maxLength={700}
              />
              <div className="comment-form-foot">
                <span>{comment.trim().length}/700</span>
                <button type="submit" className="btn btn-primary btn-sm" disabled={posting || comment.trim().length < 2}>
                  <Icon name="chat" size={14} /> {posting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="hazard-aside">
          <div className="panel vote-panel">
            <div className="vote-panel-head">
              <span className="field-label">Community verification</span>
              {hazard.status === 'pending' && <span className="pill pill-pending">Not scoring yet</span>}
              {hazard.status === 'verified' && <span className="pill pill-verified">Counting toward score</span>}
              {hazard.status === 'resolved' && <span className="pill pill-resolved">Repaired</span>}
              {hazard.status === 'flagged' && <span className="pill pill-flagged">Frozen for review</span>}
            </div>
            <VoteMeter
              verifyVotes={hazard.verifyVotes}
              flagVotes={hazard.flagVotes}
              verifyThreshold={thresholds.verify}
              flagThreshold={thresholds.flag}
            />
            {canVote && (
              <div className="vote-buttons">
                <button
                  type="button"
                  className={`btn btn-verify${hazard.myVote === 'verify' ? ' is-active' : ''}`}
                  disabled={busy !== '' || hazard.isOwner}
                  onClick={() => void vote('verify')}
                >
                  <Icon name="check" size={16} strokeWidth={2.2} />
                  {hazard.myVote === 'verify' ? 'You confirmed this' : 'I saw this too'}
                </button>
                <button
                  type="button"
                  className={`btn btn-flag${hazard.myVote === 'flag' ? ' is-active' : ''}`}
                  disabled={busy !== '' || hazard.isOwner}
                  onClick={() => void vote('flag')}
                >
                  <Icon name="flag" size={15} />
                  {hazard.myVote === 'flag' ? 'You flagged this' : 'Flag as fake'}
                </button>
              </div>
            )}
            {hazard.isOwner && <p className="owner-note">This is your report. Another resident has to verify it.</p>}
            <p className="vote-fine">
              {hazard.status === 'pending'
                ? `${thresholds.verify} independent confirmations promote this report and start the score.`
                : hazard.status === 'verified'
                  ? `Every confirmation adds 2 points. ${thresholds.flagVerified} flags would freeze it for review.`
                  : 'Voting is closed on this report.'}
            </p>
          </div>

          {hazard.status === 'verified' && (
            <div className="panel">
              <div className="panel-title-row">
                <h3>Risk contribution</h3>
                <span className="mono big-score">{hazard.score.total.toFixed(1)}</span>
              </div>
              <ScoreBreakdown
                severity={hazard.score.severity}
                votes={hazard.score.votes}
                days={hazard.score.days}
                total={hazard.score.total}
              />
              <p className="panel-fine">Open for {daysOpen(hazard.createdAt)} days. Adds to the road total.</p>
            </div>
          )}

          <div className="panel">
            <h3>Evidence audit</h3>
            <EvidenceChips evidence={hazard.evidence} />
            <dl className="meta-list">
              <div>
                <dt>Captured</dt>
                <dd>{hazard.evidenceDetail ? timeAgo(hazard.evidenceDetail.capturedAt) : 'Seeded demo record'}</dd>
              </div>
              <div>
                <dt>GPS reading</dt>
                <dd className="mono">
                  {hazard.lat.toFixed(5)}, {hazard.lng.toFixed(5)}
                </dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{hazard.evidenceDetail?.accuracy ? `±${hazard.evidenceDetail.accuracy} m` : '—'}</dd>
              </div>
              <div>
                <dt>Distance to anchor</dt>
                <dd>{hazard.evidenceDetail ? `${hazard.evidenceDetail.distanceKm.toFixed(2)} km` : '< 0.05 km'}</dd>
              </div>
              <div>
                <dt>Reporter</dt>
                <dd>{hazard.reporter.name}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{hazard.status === 'resolved' ? `Repaired ${timeAgo(hazard.resolvedAt || hazard.createdAt)}` : hazard.status}</dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <h3>Location</h3>
            <RiskMap
              roadName={hazard.roadName}
              reports={[
                {
                  id: hazard.id,
                  type: hazard.type,
                  typeLabel: hazard.typeLabel,
                  severity: hazard.severity,
                  status: hazard.status,
                  createdAt: hazard.createdAt,
                  lat: hazard.lat,
                  lng: hazard.lng,
                },
              ]}
            />
            <Link to={`/roads/${hazard.roadId}`} className="aside-link">
              {hazard.roadName} stretch detail <Icon name="arrow" size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
