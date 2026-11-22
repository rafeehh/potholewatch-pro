import type { ReactNode } from 'react';
import Icon from './Icon';
import { SEVERITY_LABEL, STATUS_LABEL, initials, scoreLine } from '../lib/format';
import type { HazardStatus, Severity } from '../lib/api';

export function SeverityTag({ severity, large }: { severity: Severity; large?: boolean }) {
  return (
    <span className={`sev sev-${severity}${large ? ' sev-lg' : ''}`}>
      <span className="sev-dot" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function StatusBadge({ status }: { status: HazardStatus }) {
  return <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function ScoreBar({ value, max, tone = 'ink' }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.max(3, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className={`score-bar tone-${tone}`}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

export function VoteMeter({
  verifyVotes,
  flagVotes,
  verifyThreshold,
  flagThreshold,
}: {
  verifyVotes: number;
  flagVotes: number;
  verifyThreshold: number;
  flagThreshold: number;
}) {
  const verifyPct = Math.min(100, (verifyVotes / verifyThreshold) * 100);
  const flagPct = Math.min(100, (flagVotes / flagThreshold) * 100);
  return (
    <div className="votes-meter">
      <div className="meter-row">
        <span className="meter-label">
          <Icon name="check" size={13} /> Verified
        </span>
        <div className="meter-track">
          <span className="meter-fill meter-verify" style={{ width: `${verifyPct}%` }} />
          <span className="meter-target" />
        </div>
        <span className="meter-count">
          {verifyVotes}/{verifyThreshold}
        </span>
      </div>
      <div className="meter-row">
        <span className="meter-label">
          <Icon name="flag" size={13} /> Flags
        </span>
        <div className="meter-track">
          <span className="meter-fill meter-flag" style={{ width: `${flagPct}%` }} />
          <span className="meter-target" />
        </div>
        <span className="meter-count">
          {flagVotes}/{flagThreshold}
        </span>
      </div>
    </div>
  );
}

const EVIDENCE_COPY: Record<string, string> = {
  live_capture: 'Live capture',
  gps_match: 'GPS matches road',
  file_fresh: 'New file, not archived',
};

export function EvidenceChips({ evidence, dark }: { evidence: string[]; dark?: boolean }) {
  return (
    <ul className={`evidence-chips${dark ? ' on-dark' : ''}`}>
      {evidence.map((key) => (
        <li key={key}>
          <Icon name="check" size={12} strokeWidth={2.4} />
          {EVIDENCE_COPY[key] || key}
        </li>
      ))}
    </ul>
  );
}

export function SectionHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="section-desc">{description}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading live data…' }: { label?: string }) {
  return (
    <div className="state-box">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box state-error">
      <Icon name="alert" size={22} />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-box state-empty">
      <Icon name="check" size={26} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function ScoreBreakdown({
  severity,
  votes,
  days,
  total,
  compact,
}: {
  severity: number;
  votes: number;
  days: number;
  total: number;
  compact?: boolean;
}) {
  const rows = [
    { label: 'Severity weight', value: severity },
    { label: 'Community votes × 2', value: votes },
    { label: 'Unresolved days × 1.5', value: days },
  ];
  return (
    <div className={`breakdown${compact ? ' compact' : ''}`}>
      {rows.map((row) => (
        <div key={row.label} className="breakdown-row">
          <span>{row.label}</span>
          <span className="mono">+{scoreLine(Math.round(row.value * 10) / 10)}</span>
        </div>
      ))}
      <div className="breakdown-row breakdown-total">
        <span>Hazard Risk Score</span>
        <span className="mono">{scoreLine(total)}</span>
      </div>
    </div>
  );
}
