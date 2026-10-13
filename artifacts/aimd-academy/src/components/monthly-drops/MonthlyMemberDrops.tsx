import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRewardsQueryKey, useGetRewards, useRequestMonthlyDrop } from '@workspace/api-client-react';
import { trackEvent } from '@/lib/telemetry';
import { AlertTriangle, Package, RotateCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { errorMessage, formatDateTime, formatMonthKey, laMonthKey, RequestStatusPill } from './shared';

export function MonthlyMemberDrops() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetRewards();
  const request = useRequestMonthlyDrop();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lock = useRef(false);

  if (isLoading) {
    return (
      <div className="border border-border bg-card p-6 space-y-4" aria-busy="true">
        <div className="h-5 w-48 bg-muted animate-pulse" />
        <div className="h-20 bg-muted/60 animate-pulse" />
        <div className="h-9 w-40 bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="border border-destructive/40 bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="font-mono text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {errorMessage(error, 'Could not load points and monthly packages.')}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} /> Retry
        </Button>
      </div>
    );
  }

  const drop = data.monthlyDrop;
  const own = drop?.ownRequest ?? null;
  const soldOut = !!drop && drop.remaining <= 0;
  const canRequest = !!drop && drop.status === 'open' && !own && !soldOut;
  const history = (data.recentRequests ?? []).filter((r) => !own || r.id !== own.id);

  const submit = () => {
    if (!drop || lock.current || !canRequest) return;
    lock.current = true;
    setSubmitError(null);
    request.mutate(
      { id: drop.id },
      {
        onSuccess: () => {
          trackEvent('point_reward_claimed', { reward_type: 'member_drop' });
          setConfirmOpen(false);
        },
        onError: (err) => {
          setSubmitError(errorMessage(err, 'Your request was not submitted. Try again.'));
          setConfirmOpen(false);
        },
        onSettled: () => {
          lock.current = false;
          qc.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
        },
      },
    );
  };

  let blockedReason: string | null = null;
  if (drop && !own) {
    if (drop.status === 'closed') blockedReason = 'Requests for this package are closed.';
    else if (drop.status !== 'open') blockedReason = 'This package is not open for requests yet.';
    else if (soldOut) blockedReason = 'All packages for this month have been reserved.';
  }

  return (
    <div className="border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 p-6 border-b border-border">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Monthly member package · {formatMonthKey(laMonthKey())}
          </p>
          <h3 className="font-display font-bold text-lg uppercase flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Member Drop
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center sm:justify-end gap-1">
            <Trophy className="w-3 h-3 text-amber-400" /> AIMD points
          </p>
          <p className="font-display font-black text-2xl text-primary tabular-nums">{data.points.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm sm:ml-auto">
            Members can use their AIMD points towards merch, events, workshops and more! Keep a look out for special drops!
          </p>
        </div>
      </div>

      <div className="p-6">
        {!drop ? (
          <div className="border border-dashed border-border p-8 text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-display font-bold uppercase text-sm">No package published this month</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              When the AIMD team publishes this month's member package, it will appear here for every signed-in account.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_auto] gap-6">
            <div>
              <h4 className="font-display font-black text-2xl uppercase leading-tight">{drop.title}</h4>
              {drop.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{drop.description}</p>
              )}
              <ul className="mt-4 space-y-1.5">
                {drop.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-[11px] text-primary pt-0.5 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-56 border border-border bg-background p-4 flex flex-col gap-3 self-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Remaining</p>
                <p className="font-display font-black text-3xl tabular-nums">
                  {Math.max(0, drop.remaining)}
                  <span className="text-sm text-muted-foreground font-mono font-normal"> / {drop.stock}</span>
                </p>
                <div className="h-1 bg-muted mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary origin-left transition-transform"
                    style={{ transform: `scaleX(${drop.stock > 0 ? Math.max(0, drop.remaining) / drop.stock : 0})` }}
                  />
                </div>
              </div>
              {own ? (
                <div className="space-y-1.5">
                  <RequestStatusPill status={own.status} />
                  <p className="font-mono text-[10px] text-muted-foreground">Requested {formatDateTime(own.requestedAt)}</p>
                </div>
              ) : canRequest ? (
                <Button onClick={() => { setSubmitError(null); setConfirmOpen(true); }} disabled={request.isPending}>
                  {request.isPending ? 'Submitting…' : 'Request package'}
                </Button>
              ) : (
                <p className="font-mono text-[11px] text-muted-foreground">{blockedReason}</p>
              )}
              {submitError && (
                <div className="text-xs text-destructive flex flex-col gap-2">
                  <span>{submitError}</span>
                  {canRequest && (
                    <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>Try again</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Your request history</p>
            <ul className="divide-y divide-border">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatMonthKey(r.monthKey)} · requested {formatDateTime(r.requestedAt)}
                    </p>
                  </div>
                  <RequestStatusPill status={r.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!request.isPending) setConfirmOpen(o); }}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase">Request {drop?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              You can request one package per month. Your request will be reviewed by AIMD staff and is not a guarantee of delivery. No points or payment are used.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={request.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={request.isPending}
              onClick={(e) => { e.preventDefault(); submit(); }}
            >
              {request.isPending ? 'Submitting…' : 'Submit request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
