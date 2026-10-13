import type { MonthlyDropRequestStatus, MonthlyDropStatus } from '@workspace/api-client-react';

export function laMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${y}-${m}`;
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!err) return fallback;
  const e = err as { data?: unknown; message?: string };
  if (e.data && typeof e.data === 'object') {
    const d = e.data as { error?: unknown; message?: unknown };
    if (typeof d.error === 'string') return d.error;
    if (typeof d.message === 'string') return d.message;
  }
  return typeof e.message === 'string' && e.message ? e.message : fallback;
}

const REQUEST_STYLES: Record<MonthlyDropRequestStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending review', cls: 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  approved: { label: 'Approved', cls: 'border-primary/40 text-primary bg-primary/10' },
  declined: { label: 'Declined', cls: 'border-destructive/40 text-destructive bg-destructive/10' },
  fulfilled: { label: 'Fulfilled', cls: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
};

export function RequestStatusPill({ status }: { status: MonthlyDropRequestStatus }) {
  const s = REQUEST_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest ${s.cls}`}>
      {s.label}
    </span>
  );
}

const DROP_STYLES: Record<MonthlyDropStatus, string> = {
  draft: 'border-border text-muted-foreground bg-muted/40',
  open: 'border-primary/40 text-primary bg-primary/10',
  closed: 'border-border text-foreground/70 bg-background',
};

export function DropStatusPill({ status }: { status: MonthlyDropStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest ${DROP_STYLES[status]}`}>
      {status}
    </span>
  );
}
