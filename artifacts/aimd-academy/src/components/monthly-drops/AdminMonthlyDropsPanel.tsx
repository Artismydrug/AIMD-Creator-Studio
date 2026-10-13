import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetRewardsQueryKey,
  getListAdminMonthlyDropRequestsQueryKey,
  getListAdminMonthlyDropsQueryKey,
  useCreateAdminMonthlyDrop,
  useListAdminMonthlyDropRequests,
  useListAdminMonthlyDrops,
  useUpdateAdminMonthlyDrop,
  useUpdateAdminMonthlyDropRequest,
  type MonthlyDrop,
  type MonthlyDropRequestUpdateStatus,
  type MonthlyDropStatus,
  type MonthlyDropUpdate,
} from '@workspace/api-client-react';
import { AlertTriangle, ChevronLeft, ChevronRight, Package, Pencil, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropStatusPill, errorMessage, formatDateTime, formatMonthKey, laMonthKey, RequestStatusPill } from './shared';

const PAGE = 20;
const label = 'font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1';

type FormState = { monthKey: string; title: string; description: string; items: string; stock: string; status: MonthlyDropStatus };

function parseItems(s: string) {
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}

function validate(f: FormState, checkMonth: boolean): string | null {
  if (checkMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(f.monthKey)) return 'Month must be YYYY-MM.';
  const t = f.title.trim();
  if (t.length < 3 || t.length > 120) return 'Title must be 3–120 characters.';
  if (f.description.length > 1500) return 'Description is limited to 1500 characters.';
  const items = parseItems(f.items);
  if (items.length < 1 || items.length > 20) return 'List 1–20 items, one per line.';
  if (items.some((i) => i.length > 160)) return 'Each item is limited to 160 characters.';
  const n = Number(f.stock);
  if (!Number.isInteger(n) || n < 0 || n > 100000) return 'Total packages must be a whole number 0–100000.';
  return null;
}

function DropForm({
  initial, monthLocked, contentsLocked, minStock, submitting, submitLabel, onSubmit, onCancel,
}: {
  initial: FormState; monthLocked?: boolean; contentsLocked?: boolean; minStock?: number;
  submitting: boolean; submitLabel: string; onSubmit: (f: FormState) => void; onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        const v = validate(f, !monthLocked);
        if (v) return setErr(v);
        if (minStock !== undefined && Number(f.stock) < minStock) return setErr(`Total packages cannot go below ${minStock} reserved.`);
        setErr(null);
        onSubmit(f);
      }}
    >
      <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
        <div>
          <span className={label}>Month (LA)</span>
          <Input type="month" value={f.monthKey} onChange={set('monthKey')} disabled={monthLocked} required />
        </div>
        <div>
          <span className={label}>Title</span>
          <Input value={f.title} onChange={set('title')} maxLength={120} disabled={contentsLocked} />
        </div>
      </div>
      <div>
        <span className={label}>Description</span>
        <Textarea value={f.description} onChange={set('description')} rows={2} maxLength={1500} disabled={contentsLocked} />
      </div>
      <div className="grid sm:grid-cols-[1fr_10rem] gap-3">
        <div>
          <span className={label}>Items — one per line</span>
          <Textarea value={f.items} onChange={set('items')} rows={4} disabled={contentsLocked} />
        </div>
        <div className="space-y-3">
          <div>
            <span className={label}>Total packages</span>
            <Input type="number" min={minStock ?? 0} max={100000} value={f.stock} onChange={set('stock')} />
          </div>
          <div>
            <span className={label}>Status</span>
            <select
              value={f.status}
              onChange={set('status')}
              className="w-full h-9 border border-input bg-background px-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>
      {contentsLocked && (
        <p className="font-mono text-[10px] text-muted-foreground">Contents are locked because members have already requested this package. Stock and status can still change.</p>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>{submitting ? 'Saving…' : submitLabel}</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>}
      </div>
    </form>
  );
}

function DropRow({ drop, onChanged }: { drop: MonthlyDrop; onChanged: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const update = useUpdateAdminMonthlyDrop();
  const locked = drop.requestCount > 0;

  const send = (data: MonthlyDropUpdate, done?: () => void) => {
    if (update.isPending) return;
    update.mutate(
      { id: drop.id, data },
      {
        onSuccess: () => { toast({ title: 'Package updated' }); done?.(); },
        onError: (e) => toast({ title: 'Update failed', description: errorMessage(e), variant: 'destructive' }),
        onSettled: onChanged,
      },
    );
  };

  const saveEdit = (f: FormState) => {
    const data: MonthlyDropUpdate = {};
    const stock = Number(f.stock);
    if (stock !== drop.stock) data.stock = stock;
    if (f.status !== drop.status) data.status = f.status;
    if (!locked) {
      const items = parseItems(f.items);
      if (f.title.trim() !== drop.title) data.title = f.title.trim();
      if (f.description.trim() !== drop.description) data.description = f.description.trim();
      if (JSON.stringify(items) !== JSON.stringify(drop.items)) data.items = items;
    }
    if (Object.keys(data).length === 0) return setEditing(false);
    send(data, () => setEditing(false));
  };

  return (
    <div className="border border-border bg-background">
      <div className="p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] text-muted-foreground">{formatMonthKey(drop.monthKey)}</span>
            <DropStatusPill status={drop.status} />
          </div>
          <p className="font-display font-bold uppercase">{drop.title}</p>
          <p className="font-mono text-[11px] text-muted-foreground mt-1 tabular-nums">
            {drop.remaining} remaining · {drop.reserved} reserved · {drop.stock} total · {drop.requestCount} requests
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {drop.status !== 'open' && (
            <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => send({ status: 'open' })}>Open</Button>
          )}
          {drop.status === 'open' && (
            <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => send({ status: 'closed' })}>Close</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant={showRequests ? 'default' : 'outline'} onClick={() => setShowRequests((v) => !v)}>
            Requests
          </Button>
        </div>
      </div>
      {editing && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          <DropForm
            key={`${drop.id}-${drop.requestCount}`}
            initial={{
              monthKey: drop.monthKey, title: drop.title, description: drop.description,
              items: drop.items.join('\n'), stock: String(drop.stock), status: drop.status,
            }}
            monthLocked
            contentsLocked={locked}
            minStock={drop.reserved}
            submitting={update.isPending}
            submitLabel="Save changes"
            onSubmit={saveEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
      {showRequests && <RequestsTable dropId={drop.id} onChanged={onChanged} />}
    </div>
  );
}

function RequestsTable({ dropId, onChanged }: { dropId: number; onChanged: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const params = { dropId, limit: PAGE, offset };
  const { data, isLoading, isError, error, refetch, isFetching } = useListAdminMonthlyDropRequests(params, {
    query: { queryKey: getListAdminMonthlyDropRequestsQueryKey(params) },
  });
  const update = useUpdateAdminMonthlyDropRequest();
  const [busyId, setBusyId] = useState<number | null>(null);
  const lock = useRef(false);
  const [fulfillTarget, setFulfillTarget] = useState<{ id: number; name: string } | null>(null);

  const act = (id: number, status: MonthlyDropRequestUpdateStatus, done?: () => void) => {
    if (lock.current) return;
    lock.current = true;
    setBusyId(id);
    update.mutate(
      { id, data: { status } },
      {
        onSuccess: () => { toast({ title: `Request ${status}` }); done?.(); },
        onError: (e) => toast({ title: 'Action failed', description: errorMessage(e), variant: 'destructive' }),
        onSettled: () => {
          lock.current = false;
          setBusyId(null);
          qc.invalidateQueries({ queryKey: getListAdminMonthlyDropRequestsQueryKey() });
          onChanged();
        },
      },
    );
  };

  return (
    <div className="border-t border-border">
      {isLoading ? (
        <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-9 bg-muted/60 animate-pulse" />)}</div>
      ) : isError || !data ? (
        <div className="p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {errorMessage(error, 'Could not load requests.')}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}><RotateCw className="w-3.5 h-3.5 mr-1" /> Retry</Button>
        </div>
      ) : data.requests.length === 0 ? (
        <p className="p-6 text-center font-mono text-xs text-muted-foreground">No member requests yet.</p>
      ) : (
        <>
          <ul className={`divide-y divide-border ${isFetching ? 'opacity-70' : ''}`}>
            {data.requests.map((r) => {
              const deleted = r.userId == null || r.username == null;
              const name = deleted ? 'Deleted account' : `@${r.username}`;
              const busy = busyId === r.id;
              return (
                <li key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${deleted ? 'italic text-muted-foreground' : ''}`}>{name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      #{r.id} · {formatDateTime(r.requestedAt)}
                      {r.updatedAt !== r.requestedAt && ` · updated ${formatDateTime(r.updatedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <RequestStatusPill status={r.status} />
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy || deleted || update.isPending} title={deleted ? 'Deleted accounts cannot be approved' : undefined} onClick={() => act(r.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="ghost" disabled={busy || update.isPending} onClick={() => act(r.id, 'declined')}>Decline</Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <>
                        <Button size="sm" disabled={busy || deleted || update.isPending} onClick={() => setFulfillTarget({ id: r.id, name })}>Mark fulfilled</Button>
                        <Button size="sm" variant="ghost" disabled={busy || update.isPending} onClick={() => act(r.id, 'declined')}>Decline</Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-2 border-t border-border flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>{offset + 1}–{Math.min(offset + data.requests.length, data.total)} of {data.total}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={!!fulfillTarget} onOpenChange={(o) => { if (!o && !update.isPending) setFulfillTarget(null); }}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase">Mark as fulfilled?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm the package for {fulfillTarget?.name} has been delivered. Fulfilled is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={update.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (fulfillTarget) act(fulfillTarget.id, 'fulfilled', () => setFulfillTarget(null));
              }}
            >
              {update.isPending ? 'Saving…' : 'Mark fulfilled'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminMonthlyDropsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useListAdminMonthlyDrops({
    query: { queryKey: getListAdminMonthlyDropsQueryKey() },
  });
  const create = useCreateAdminMonthlyDrop();
  const [formKey, setFormKey] = useState(0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListAdminMonthlyDropsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
  };

  const drops = [...(data ?? [])].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  const current = laMonthKey();
  const hasCurrent = drops.some((d) => d.monthKey === current);

  return (
    <section className="border border-border bg-card">
      <div className="p-6 border-b border-border">
        <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Monthly Member Drops
        </h2>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          One package per LA calendar month · open to every signed-in account · independent of points
        </p>
      </div>

      <div className="p-6 border-b border-border">
        <p className="font-mono text-[11px] uppercase tracking-widest text-foreground mb-3">New package</p>
        <DropForm
          key={formKey}
          initial={{ monthKey: hasCurrent ? '' : current, title: '', description: '', items: '', stock: '', status: 'draft' }}
          submitting={create.isPending}
          submitLabel="Create package"
          onSubmit={(f) => {
            if (drops.some((d) => d.monthKey === f.monthKey)) {
              toast({ title: 'Month already has a package', description: 'Edit the existing package instead.', variant: 'destructive' });
              return;
            }
            create.mutate(
              { data: { monthKey: f.monthKey, title: f.title.trim(), description: f.description.trim(), items: parseItems(f.items), stock: Number(f.stock), status: f.status } },
              {
                onSuccess: () => { toast({ title: 'Package created' }); setFormKey((k) => k + 1); },
                onError: (e) => toast({ title: 'Create failed', description: errorMessage(e), variant: 'destructive' }),
                onSettled: refresh,
              },
            );
          }}
        />
      </div>

      <div className="p-6 space-y-3">
        {isLoading ? (
          [0, 1].map((i) => <div key={i} className="h-20 bg-muted/60 animate-pulse" />)
        ) : isError ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-destructive">{errorMessage(error, 'Could not load packages.')}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}><RotateCw className="w-3.5 h-3.5 mr-1" /> Retry</Button>
          </div>
        ) : drops.length === 0 ? (
          <p className="text-center font-mono text-xs text-muted-foreground py-6">No packages yet. Members see an empty state until one is published.</p>
        ) : (
          drops.map((d) => <DropRow key={d.id} drop={d} onChanged={refresh} />)
        )}
      </div>
    </section>
  );
}
