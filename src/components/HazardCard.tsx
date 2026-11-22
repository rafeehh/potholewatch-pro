import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Report } from '../lib/api';
import { timeAgo } from '../lib/format';
import Icon from './Icon';
import { Avatar, SeverityTag, StatusBadge, VoteMeter } from './ui';

export default function HazardCard({
  report,
  actions,
  showRoad = true,
  threshold,
  flagThreshold,
}: {
  report: Report;
  actions?: ReactNode;
  showRoad?: boolean;
  threshold: number;
  flagThreshold: number;
}) {
  return (
    <article className={`hazard-card${report.status === 'flagged' ? ' is-flagged' : ''}`}>
      <Link to={`/hazards/${report.id}`} className="hc-media" aria-label={`Open report: ${report.typeLabel}`}>
        <img src={report.media.url} alt={`${report.severity} ${report.typeLabel.toLowerCase()} on ${report.roadName}`} loading="lazy" />
        <span className="hc-media-top">
          <SeverityTag severity={report.severity} />
          <span className="hc-type">{report.typeLabel}</span>
        </span>
        <span className="hc-media-bottom">
          <Icon name="pin" size={13} />
          {showRoad ? report.roadName : report.roadStretch}
        </span>
      </Link>

      <div className="hc-body">
        <div className="hc-head">
          <StatusBadge status={report.status} />
          <span className="hc-time">{timeAgo(report.createdAt)}</span>
        </div>

        <Link to={`/hazards/${report.id}`} className="hc-title-link">
          <h3 className="hc-title">{report.description}</h3>
        </Link>

        <div className="hc-meta">
          <span className="hc-author">
            <Avatar name={report.reporter.name} size={24} />
            {report.reporter.name}
          </span>
          <span className="hc-dot-sep">·</span>
          <span className="hc-votes">
            <Icon name="users" size={14} /> {report.verifyVotes} verified
          </span>
          <span className="hc-dot-sep">·</span>
          <Link to={`/hazards/${report.id}`} className="hc-comments">
            <Icon name="chat" size={14} /> {report.commentCount}
          </Link>
        </div>

        {(report.status === 'pending' || report.status === 'flagged') && (
          <VoteMeter
            verifyVotes={report.verifyVotes}
            flagVotes={report.flagVotes}
            verifyThreshold={threshold}
            flagThreshold={flagThreshold}
          />
        )}

        {report.status === 'verified' && (
          <div className="hc-scoreline">
            <span>
              Risk contribution <strong className="mono">{report.score.total.toFixed(1)}</strong>
            </span>
            <span>{report.score.daysOpen.toFixed(0)} days open</span>
          </div>
        )}

        {actions && <div className="hc-actions">{actions}</div>}
      </div>
    </article>
  );
}
