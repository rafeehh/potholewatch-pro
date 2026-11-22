export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysOpen(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  medium: 'Medium',
  low: 'Low',
};

export const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 50,
  medium: 25,
  low: 10,
};

export const HAZARD_LABEL: Record<string, string> = {
  pothole: 'Pothole',
  manhole: 'Open manhole',
  collapse: 'Road collapse',
  debris: 'Debris / obstruction',
};

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending verification',
  verified: 'Verified hazard',
  flagged: 'Flagged for review',
  resolved: 'Repaired',
  rejected: 'Rejected',
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function scoreLine(total: number): string {
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
