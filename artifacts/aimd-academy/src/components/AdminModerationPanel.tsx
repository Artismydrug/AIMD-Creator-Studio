import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListModerationReportsQueryKey,
  useListModerationReports,
  useReviewModerationReport,
} from '@workspace/api-client-react';
import type { ContentReport, ModerationReviewInputAction } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Flag, History, RefreshCw, Trash2 } from 'lucide-react';

const NOTE_MAX = 1000;
const CLOSED = new Set(['resolved', 'dismissed']);

const ACTION_LABELS: Record<ModerationReviewInputAction, string> = {
  review: 'Mark reviewing',
  resolve: 'Resolve',
  dismiss: 'Dismiss',
  remove_content: 'Remove content',
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate: 'Hate',
  sexual_content: 'Sexual content',
  violence: 'Violence',
  scam: 'Scam',
  other: 'Other',
};

const STATUS_CLS: Record<string, string> = {
  open: 'border-destructive/40 text-destructive bg-destructive/5',
  reviewing: 'border-amber-500/40 text-amber-600 bg-amber-500/10',
  resolved: 'border-primary/30 text-primary bg-primary/5',
  dismissed: 'border-border text-muted-foreground',
};

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

function targetKind(r: ContentReport): 'post' | 'message' | 'user' | 'unknown' {
  if (r.postId != null) return 'post';
  if (r.messageId != null) return 'message';
  if (r.reportedUserId != null) return 'user';
  return 'unknown';
}

function hasContent(r: ContentReport) {
  const kind = targetKind(r);
  if (kind === 'post') return r.contentText != null || !!r.mediaUrl;
  if (kind === 'message') return r.contentText != null;
  return false;
}

function errStatus(e: unknown): number | undefined {
  const s = (e as { status?: unknown })?.status;
  return typeof s === 'number' ? s : undefined;
}

function ReportedMedia({ url, type }: { url: string; type?: string | null }) {
  if (type === 'video')
    return <video src={url} controls preload="metadata" playsInline className="w-full max-h-80 bg-muted border border-border" data-testid="media-reported-video" />;
  if (type === 'audio')
    return <audio src={url} controls preload="metadata" className="w-full" data-testid="media-reported-audio" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block border border-border bg-muted">
      <img src={url} alt="Reported media" className="w-full max-h-80 object-contain" data-testid="media-reported-image" />
    </a>
  );
}

function ReportItem({ report }: { report: ContentReport }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const review = useReviewModerationReport();
  const closed = CLOSED.has(report.status);
  const kind = targetKind(report);
  const canRemove = (kind === 'post' || kind === 'message') && hasContent(report);

  const actions: ModerationReviewInputAction[] = [
    ...(report.status === 'open' ? (['review'] as const) : []),
    'resolve',
    'dismiss',
    ...(canRemove ? (['remove_content'] as const) : []),
  ];

  const [action, setAction] = useState<ModerationReviewInputAction>(actions[0]);
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const trimmed = note.trim();
  const noteValid = trimmed.length > 0 && note.length <= NOTE_MAX;
  const effectiveAction = actions.includes(action) ? action : actions[0];

  const submit = async () => {
    try {
      await review.mutateAsync({ id: report.id, data: { action: effectiveAction, note: trimmed } });
      toast({ title: 'Report updated', description: `Report #${report.id}: ${ACTION_LABELS[effectiveAction]}.` });
      setNote('');
    } catch (e) {
      if (errStatus(e) === 409) {
        toast({ title: 'Report already changed', description: 'Another staff member updated this report. Showing latest data.', variant: 'destructive' });
      } else {
        toast({ title: 'Could not update report', description: String((e as Error)?.message ?? e), variant: 'destructive' });
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: getListModerationReportsQueryKey() });
    }
  };

  const onSubmit = () => {
    if (!noteValid) return;
    if (effectiveAction === 'remove_content') setConfirmOpen(true);
    else void submit();
  };

  const history = report.reviewHistory ?? [];

  return (
    <details className="border border-border bg-background" data-testid={`card-report-${report.id}`}>
      <summary className="list-none cursor-pointer p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">#{report.id}</span>
            <h3 className="font-display font-bold uppercase tracking-tight">{REASON_LABELS[report.reason] ?? report.reason}</h3>
            <span className="font-mono text-[10px] uppercase tracking-wide border border-border px-1.5 py-0.5 text-muted-foreground">{kind}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {report.reporterName ?? `User ${report.reporterId}`} reported {report.reportedUserName ?? 'content'} · {fmt(report.createdAt)}
          </p>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-1 self-start md:self-auto ${STATUS_CLS[report.status] ?? ''}`} data-testid={`status-report-${report.id}`}>
          {report.status}
        </span>
      </summary>

      <div className="border-t border-border p-4 md:p-5 space-y-5">
        {report.details && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Reporter details</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{report.details}</p>
          </div>
        )}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Reported {kind}
            {kind === 'post' && ` #${report.postId}`}
            {kind === 'message' && ` #${report.messageId}`}
            {kind === 'user' && ` · ${report.reportedUserName ?? `User ${report.reportedUserId}`}`}
          </p>
          {hasContent(report) ? (
            <div className="space-y-3 border border-border bg-card p-4">
              {report.contentText?.trim() && (
                <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-reported-content-${report.id}`}>{report.contentText}</p>
              )}
              {report.mediaUrl && <ReportedMedia url={report.mediaUrl} type={report.mediaType} />}
              {!report.contentText?.trim() && !report.mediaUrl && <p className="text-xs text-muted-foreground">No text or media attached.</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground border border-dashed border-border p-4">
              {kind === 'user' ? 'Account report. Review the reporter details above.' : 'Content is no longer available.'}
            </p>
          )}
        </div>

        {closed ? (
          <p className="text-xs font-mono text-muted-foreground border border-border p-3">
            Closed {fmt(report.reviewedAt)}. Closed reports cannot be changed.
          </p>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Staff decision</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Staff decision">
              {actions.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={effectiveAction === a}
                  onClick={() => setAction(a)}
                  data-testid={`button-action-${a}-${report.id}`}
                  className={`h-9 px-3 border font-mono text-xs uppercase tracking-wider transition-colors ${
                    effectiveAction === a
                      ? a === 'remove_content' ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {ACTION_LABELS[a]}
                </button>
              ))}
            </div>
            <Textarea
              className="rounded-none border-border bg-background min-h-[80px] resize-none"
              placeholder="Required note for the audit history"
              aria-label="Required review note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              data-testid={`input-note-${report.id}`}
            />
            <div className="flex items-center justify-between gap-3">
              <span className={`font-mono text-[10px] ${note.length > NOTE_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {note.length}/{NOTE_MAX}{!trimmed && ' · note required'}
              </span>
              <Button
                onClick={onSubmit}
                disabled={!noteValid || review.isPending}
                variant={effectiveAction === 'remove_content' ? 'destructive' : 'default'}
                className="rounded-none font-bold uppercase tracking-wider"
                data-testid={`button-submit-review-${report.id}`}
              >
                {review.isPending ? 'Saving…' : ACTION_LABELS[effectiveAction]}
              </Button>
            </div>
          </div>
        )}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Audit history
          </p>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No staff actions yet.</p>
          ) : (
            <ol className="border-l border-border ml-1 space-y-3">
              {history.map((h) => (
                <li key={h.id} className="pl-4 relative" data-testid={`history-${report.id}-${h.id}`}>
                  <span className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-primary" />
                  <p className="font-mono text-[10px] uppercase tracking-wider">
                    {ACTION_LABELS[h.action] ?? h.action} · {h.reviewerName ?? (h.reviewerId ? `Staff ${h.reviewerId}` : 'Staff')} · <span className="text-muted-foreground">{fmt(h.createdAt)}</span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{h.note}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" /> Permanently remove this {kind === 'message' ? 'message' : 'post'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The reported {kind === 'message' ? 'MESSAGE' : 'POST'} will be permanently removed and cannot be restored. No account or other post/message is deleted. Public access to this post’s owned uploaded media is withdrawn, which can affect other uses of the same file. External copies are not removed. Report #{report.id} will be closed with your note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none" data-testid={`button-cancel-remove-${report.id}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void submit()}
              data-testid={`button-confirm-remove-${report.id}`}
            >
              Remove permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </details>
  );
}

export function AdminModerationPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, isFetching, refetch } = useListModerationReports({ query: { refetchInterval: 30000, queryKey: getListModerationReportsQueryKey() } });
  const [filter, setFilter] = useState<'current' | 'closed'>('current');

  const reports = useMemo(() => data ?? [], [data]);
  const current = useMemo(() => reports.filter((r) => !CLOSED.has(r.status)), [reports]);
  const closed = useMemo(() => reports.filter((r) => CLOSED.has(r.status)), [reports]);
  const shown = filter === 'current' ? current : closed;

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: getListModerationReportsQueryKey() });
    void refetch();
  };

  return (
    <section className="border border-border bg-card p-6 md:p-8" data-testid="section-moderation">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
        <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2">
          <Flag className="w-5 h-5 text-primary" /> Safety Reports
        </h2>
        <Button variant="outline" size="sm" className="rounded-none font-mono text-xs uppercase" onClick={reload} disabled={isFetching} data-testid="button-reload-reports">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} /> Reload
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Member reports on posts, messages and accounts. Every decision needs a note and is kept in the audit history. Refreshes every 30 seconds.
      </p>

      <div className="flex border border-border mb-5 w-fit">
        {(['current', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`tab-reports-${f}`}
            className={`px-4 h-9 font-mono text-xs uppercase tracking-wider ${filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {f === 'current' ? 'Open & reviewing' : 'Closed'} ({f === 'current' ? current.length : closed.length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 border border-border bg-muted/50 animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="py-8 text-center border border-destructive/30 bg-destructive/5">
          <p className="font-mono text-sm text-destructive mb-3">Could not load safety reports.</p>
          <Button variant="outline" size="sm" className="rounded-none font-mono uppercase" onClick={reload} data-testid="button-retry-reports">Retry</Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-border">
          <Flag className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">
            {filter === 'current' ? 'No open reports. The queue is clear.' : 'No closed reports yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((r) => <ReportItem key={`${r.id}-${r.status}`} report={r} />)}
        </div>
      )}
    </section>
  );
}
