import type { OpenReport } from '../lib/api';
import { SEVERITY_LABEL } from '../lib/format';

const W = 640;
const H = 300;

const SEV_COLOR: Record<string, string> = {
  critical: '#e8402c',
  medium: '#f0a11c',
  low: '#2f9e78',
};

export default function RiskMap({
  reports,
  roadName,
}: {
  reports: OpenReport[];
  roadName: string;
}) {
  const sorted = [...reports].sort((a, b) => a.lng - b.lng);
  const count = sorted.length;
  const points = sorted.map((report, i) => {
    const x = count === 1 ? W / 2 : 86 + (i / (count - 1)) * (W - 172);
    const y = count === 1 ? H / 2 - 10 : 150 + Math.sin(i * 1.55 + 0.4) * 52;
    return { report, x, y };
  });

  const roadPath = points.length
    ? points.reduce((d, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cx = (prev.x + p.x) / 2;
        return `${d} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
      }, '')
    : `M 86 150 C 220 110, 420 190, ${W - 86} 150`;

  return (
    <div className="risk-map">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Schematic map of hazards on ${roadName}`}>
        <defs>
          <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#e2e8f1" strokeWidth="1" />
          </pattern>
          <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0d1526" floodOpacity="0.28" />
          </filter>
        </defs>
        <rect width={W} height={H} fill="#eef3f9" />
        <rect width={W} height={H} fill="url(#map-grid)" />

        {/* city blocks */}
        <g fill="#e3eaf3">
          <rect x="26" y="26" width="120" height="62" rx="8" />
          <rect x="470" y="24" width="144" height="52" rx="8" />
          <rect x="40" y="214" width="150" height="58" rx="8" />
          <rect x="488" y="216" width="120" height="56" rx="8" />
          <rect x="250" y="18" width="150" height="40" rx="8" />
        </g>

        {/* cross streets */}
        <g stroke="#dde5ef" strokeWidth="14" strokeLinecap="round">
          <path d="M172 40 C 210 80, 230 110, 262 148" fill="none" />
          <path d="M474 64 C 430 94, 398 118, 366 142" fill="none" />
          <path d="M188 262 C 246 232, 284 210, 322 178" fill="none" />
          <path d="M486 246 C 430 224, 402 200, 366 176" fill="none" />
        </g>

        {/* the watched stretch */}
        <path d={roadPath} fill="none" stroke="#c9d3e2" strokeWidth="64" strokeLinecap="round" />
        <path d={roadPath} fill="none" stroke="#f7f9fc" strokeWidth="52" strokeLinecap="round" />
        <path d={roadPath} fill="none" stroke="#f2c14b" strokeWidth="2.5" strokeDasharray="14 16" />

        {points.map(({ report, x, y }, i) => {
          const color = SEV_COLOR[report.severity] || '#5c6779';
          const isCritical = report.severity === 'critical';
          return (
            <g key={report.id} transform={`translate(${x} ${y})`} filter="url(#pin-shadow)">
              <title>{`${SEVERITY_LABEL[report.severity]} ${report.typeLabel} — ${report.status}`}</title>
              {isCritical && (
                <circle r="21" fill={color} opacity="0.16" className="pin-pulse" style={{ animationDelay: `${i * 0.35}s` }} />
              )}
              <circle r="13.5" fill="#ffffff" />
              <circle r="10" fill={color} />
              <circle r="3.2" fill="#ffffff" opacity="0.9" />
            </g>
          );
        })}

        <g className="map-label">
          <text x="20" y="286" fill="#7c8798" fontSize="10.5" letterSpacing="1.4">
            SCHEMATIC STRETCH VIEW — NOT TO SCALE
          </text>
        </g>
      </svg>
      <div className="map-legend">
        <span>
          <i style={{ background: SEV_COLOR.critical }} /> Critical
        </span>
        <span>
          <i style={{ background: SEV_COLOR.medium }} /> Medium
        </span>
        <span>
          <i style={{ background: SEV_COLOR.low }} /> Low
        </span>
        <span className="map-legend-note">{reports.length} active pin{reports.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
