export type Severity = 'critical' | 'medium' | 'low';
export type HazardStatus = 'pending' | 'verified' | 'flagged' | 'resolved' | 'rejected';
export type HazardType = 'pothole' | 'manhole' | 'collapse' | 'debris';

export interface Score {
  total: number;
  severity: number;
  votes: number;
  days: number;
  daysOpen: number;
}

export interface Report {
  id: string;
  roadId: string;
  roadName: string;
  roadStretch: string;
  district: string;
  type: HazardType;
  typeLabel: string;
  severity: Severity;
  description: string;
  status: HazardStatus;
  createdAt: string;
  verifiedAt: string | null;
  resolvedAt: string | null;
  lat: number;
  lng: number;
  media: { url: string; width: number | null; height: number | null };
  evidence: string[];
  evidenceDetail: {
    capturedAt: string;
    lat: number;
    lng: number;
    accuracy: number | null;
    distanceKm: number;
    fileModified: string | null;
  } | null;
  reporter: { id: string; name: string };
  isOwner: boolean;
  verifyVotes: number;
  flagVotes: number;
  myVote: 'verify' | 'flag' | null;
  commentCount: number;
  score: Score;
  demo: boolean;
}

export interface OpenReport {
  id: string;
  type: HazardType;
  typeLabel: string;
  severity: Severity;
  status: HazardStatus;
  createdAt: string;
  lat: number;
  lng: number;
}

export interface RoadSummary {
  id: string;
  name: string;
  stretch: string;
  district: string;
  lat: number;
  lng: number;
  lengthKm: number;
  authority: string;
  notes: string;
  total: number;
  severity: number;
  votes: number;
  days: number;
  verifiedCount: number;
  criticalCount: number;
  pendingCount: number;
  resolvedCount: number;
  flaggedCount: number;
  reportCount: number;
  oldestOpenDays: number;
  rank: number | null;
  zone: 'alert' | 'watch' | 'clear';
  openReports: OpenReport[];
}

export interface Stats {
  verifiedOpen: number;
  pending: number;
  flagged: number;
  resolved: number;
  totalReports: number;
  contributors: number;
  verifyVotes: number;
  kmWatched: number;
  roadsWatched: number;
  avgOpenDays: number;
  avgResolutionDays: number;
}

export interface SessionInfo {
  user: { id: string; name: string; displayName: string };
  verification: { verifyThreshold: number; flagThreshold: number; captureWindowMinutes: number };
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: string;
  isMine?: boolean;
}

export interface Thresholds {
  verify: number;
  flag: number;
  flagVerified: number;
}

export interface DashboardData {
  stats: Stats;
  roads: RoadSummary[];
  recentVerified: Report[];
  thresholds: { verify: number; flag: number };
  formula: Record<Severity, number>;
  hazardTypes: Record<HazardType, { label: string }>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string } } | null)?.error;
    throw new ApiError(err?.message || 'Something went wrong. Please try again.', err?.code || 'ERROR', res.status);
  }
  return data as T;
}
