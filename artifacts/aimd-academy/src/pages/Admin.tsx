import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getListAdminTattooBookingsQueryKey,
  useGetCurrentUser,
  useCreateEvent,
  useListAdminUsers,
  useListAdminTattooBookings,
  useUpdateAdminTattooBooking,
  useListInstructors,
  useCreateInstructor,
  useLinkInstructorUser,
  useAssignInstructorToWorkshop,
  useListWorkshops,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload } from '@/components/MediaUpload';
import { AdminModerationPanel } from '@/components/AdminModerationPanel';
import { AdminMonthlyDropsPanel } from '@/components/monthly-drops/AdminMonthlyDropsPanel';
import { AlertTriangle, Calendar, ClipboardList, Crown, Image as ImageIcon, Mail, Phone, Search, ShieldCheck, Users } from 'lucide-react';

// ─── Challenge data (same shape the Studio Log uses) ─────────────────────────

async function fetchCurrentChallenge() {
  const r = await fetch('/api/challenges/current', { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load challenge');
  return r.json() as Promise<{
    challenge: { week: string; theme: string; challengeWeek: string; totalSubmissions: number };
    submissions: Array<{
      id: number;
      rank: number;
      username: string;
      caption: string;
      imageUrl: string | null;
      votes: number;
    }>;
  }>;
}

// ─── Event creation ───────────────────────────────────────────────────────────

const CATEGORIES = ['workshop', 'pop-up', 'gallery', 'activation', 'community'] as const;
const EVENT_TYPES = ['free', 'ticketed', 'members-only'] as const;

function CreateEventCard() {
  const { toast } = useToast();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('community');
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>('free');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setLocation(''); setStartsAt('');
    setEndsAt(''); setMaxCapacity(''); setImageUrl(''); setIsFeatured(false);
  };

  const submit = () => {
    createEvent.mutate(
      {
        data: {
          title,
          description,
          category,
          eventType,
          location,
          imageUrl: imageUrl || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
          isFeatured,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Event posted!', description: `"${title}" is now live on Community Events.` });
          reset();
        },
        onError: (err: any) => {
          toast({ title: 'Could not post event', description: String(err?.message ?? err), variant: 'destructive' });
        },
      }
    );
  };

  const canSubmit = title.trim() && description.trim() && location.trim() && startsAt;

  const selectCls =
    'w-full h-10 px-3 bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-primary/50';

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2 mb-1">
        <Calendar className="w-5 h-5 text-primary" /> Post a Community Event
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Events go live immediately on the Community Events page. Only admins can post.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Title</label>
          <Input className="rounded-none border-border bg-background" placeholder="Gallery Opening: Discipline & Form" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Description</label>
          <Textarea className="rounded-none border-border bg-background min-h-[90px] resize-none" placeholder="What's happening, who it's for..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Category</label>
          <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value as any)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Entry</label>
          <select className={selectCls} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Location</label>
          <Input className="rounded-none border-border bg-background" placeholder="AIMD Gallery, Los Angeles, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Starts</label>
          <Input type="datetime-local" className="rounded-none border-border bg-background" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Ends (Optional)</label>
          <Input type="datetime-local" className="rounded-none border-border bg-background" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Max Capacity (Optional)</label>
          <Input type="number" min={1} className="rounded-none border-border bg-background" placeholder="e.g. 80" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} />
        </div>

        <div className="space-y-2 flex items-end pb-2">
          <label className="flex items-center gap-2 font-mono text-xs uppercase text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-[var(--primary)] w-4 h-4" />
            Featured event
          </label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Event Image (Optional)</label>
          <MediaUpload url={imageUrl} mediaType="image" onChange={(u) => setImageUrl(u)} />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
          onClick={submit}
          disabled={!canSubmit || createEvent.isPending}
        >
          {createEvent.isPending ? 'Posting…' : 'Post Event'}
        </Button>
      </div>
    </section>
  );
}

// ─── Members roster ───────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  free: 'Starter',
  workshop: 'Workshops',
  pro: 'Pro',
};

function MembersCard() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListAdminUsers();

  const members = (data?.members ?? []).filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Members
        </h2>
        {data && (
          <span className="font-mono text-xs text-muted-foreground border border-border px-2 py-1 flex-shrink-0">
            {data.total} total
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Everyone who's created an account — newest first.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="rounded-none border-border bg-background pl-9 font-mono text-sm"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground animate-pulse py-6 text-center">Loading members…</p>
      ) : members.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-border">
          <p className="font-mono text-sm text-muted-foreground">{search ? 'No members match that search.' : 'No members yet.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-2 pr-4">Creator</th>
                <th className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-2 pr-4 hidden sm:table-cell">Email</th>
                <th className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-2 pr-4">Plan</th>
                <th className="text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-2 pr-4">Pts</th>
                <th className="text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-2 pr-4 hidden md:table-cell">Posts</th>
                <th className="text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[120px]">{m.username}</span>
                      {m.isAdmin && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" aria-label="Admin" />}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs truncate max-w-[180px] hidden sm:table-cell">{m.email}</td>
                  <td className="py-2.5 pr-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider border border-border px-1.5 py-0.5 text-muted-foreground">
                      {TIER_LABELS[m.tier] ?? m.tier}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs">{m.points ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">{m.postCount ?? 0}</td>
                  <td className="py-2.5 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Instructor Management ───────────────────────────────────────────────────

function InstructorManagementCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: instructors = [], isLoading: loadingInstructors } = useListInstructors();
  const { data: usersData, isLoading: loadingUsers } = useListAdminUsers();
  const { data: workshops = [], isLoading: loadingWorkshops } = useListWorkshops();

  const createInstructor = useCreateInstructor();
  const linkUser = useLinkInstructorUser();
  const assignWorkshop = useAssignInstructorToWorkshop();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');

  const handleCreate = () => {
    if (!displayName.trim()) return;
    createInstructor.mutate(
      { data: { displayName, mentorSlug: displayName.toLowerCase().replace(/[^a-z0-9]/g, '-'), bio: bio || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Instructor Created', description: `${displayName} has been added.` });
          setDisplayName('');
          setBio('');
          queryClient.invalidateQueries({ queryKey: ['listInstructors'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  const handleLink = () => {
    if (!selectedInstructorId || !selectedUserId) return;
    linkUser.mutate(
      { instructorId: parseInt(selectedInstructorId, 10), data: { userId: parseInt(selectedUserId, 10) } },
      {
        onSuccess: () => {
          toast({ title: 'Account Linked', description: 'Instructor successfully linked to user account.' });
          setSelectedInstructorId('');
          setSelectedUserId('');
          queryClient.invalidateQueries({ queryKey: ['listInstructors'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  const handleAssign = () => {
    if (!selectedInstructorId || !selectedWorkshopId) return;
    assignWorkshop.mutate(
      { instructorId: parseInt(selectedInstructorId, 10), data: { workshopId: parseInt(selectedWorkshopId, 10) } },
      {
        onSuccess: () => {
          toast({ title: 'Workshop Assigned', description: 'Instructor assigned to workshop.' });
          setSelectedInstructorId('');
          setSelectedWorkshopId('');
          queryClient.invalidateQueries({ queryKey: ['listInstructors'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl uppercase">Instructor Management</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Create Instructor */}
        <div className="space-y-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2">1. Create Instructor Profile</h3>
          <div className="space-y-2">
            <label className="text-xs uppercase font-mono text-muted-foreground">Display Name</label>
            <Input 
              placeholder="e.g. Poncho The Artist" 
              className="rounded-none bg-background border-border" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              data-testid="admin-instructor-name-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-mono text-muted-foreground">Bio (Optional)</label>
            <Textarea 
              placeholder="Instructor credentials..." 
              className="rounded-none bg-background border-border resize-none" 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              data-testid="admin-instructor-bio-input"
            />
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={!displayName || createInstructor.isPending}
            className="w-full rounded-none bg-primary text-primary-foreground font-mono uppercase"
            data-testid="admin-create-instructor-btn"
          >
            Create Instructor
          </Button>
        </div>

        <div className="space-y-8">
          {/* Link to Account */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2">2. Link to User Account</h3>
            <div className="grid grid-cols-2 gap-2">
              <select 
                className="h-10 px-3 bg-background border border-border text-sm font-mono focus:outline-none"
                value={selectedInstructorId}
                onChange={e => setSelectedInstructorId(e.target.value)}
                data-testid="admin-link-instructor-select"
              >
                <option value="">Select Instructor...</option>
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.displayName}</option>
                ))}
              </select>
              <select 
                className="h-10 px-3 bg-background border border-border text-sm font-mono focus:outline-none"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                data-testid="admin-link-user-select"
              >
                <option value="">Select User...</option>
                {usersData?.members?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.username} ({m.email})</option>
                ))}
              </select>
            </div>
            <Button 
              onClick={handleLink} 
              disabled={!selectedInstructorId || !selectedUserId || linkUser.isPending}
              variant="outline"
              className="w-full rounded-none font-mono uppercase"
              data-testid="admin-link-btn"
            >
              Link Account
            </Button>
          </div>

          {/* Assign to Workshop */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2">3. Assign to Workshop</h3>
            <div className="grid grid-cols-2 gap-2">
              <select 
                className="h-10 px-3 bg-background border border-border text-sm font-mono focus:outline-none"
                value={selectedInstructorId}
                onChange={e => setSelectedInstructorId(e.target.value)}
                data-testid="admin-assign-instructor-select"
              >
                <option value="">Select Instructor...</option>
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.displayName}</option>
                ))}
              </select>
              <select 
                className="h-10 px-3 bg-background border border-border text-sm font-mono focus:outline-none"
                value={selectedWorkshopId}
                onChange={e => setSelectedWorkshopId(e.target.value)}
                data-testid="admin-assign-workshop-select"
              >
                <option value="">Select Workshop...</option>
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedInstructorId || !selectedWorkshopId || assignWorkshop.isPending}
              variant="outline"
              className="w-full rounded-none font-mono uppercase"
              data-testid="admin-assign-btn"
            >
              Assign Workshop
            </Button>
          </div>
        </div>
      </div>
      
      {/* Existing Instructors List */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Current Instructors</h3>
        {loadingInstructors ? (
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading...</p>
        ) : instructors.length === 0 ? (
          <p className="font-mono text-sm text-muted-foreground">No instructors created yet.</p>
        ) : (
          <div className="space-y-3">
            {instructors.map(inst => (
              <div key={inst.id} className="p-4 border border-border bg-background flex items-center justify-between">
                <div>
                  <p className="font-bold">{inst.displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono">ID: {inst.id} {inst.userId ? `· Linked to User: ${inst.userId}` : '· Unlinked'}</p>
                </div>
                <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1">
                  ID: {inst.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Tattoo bookings ─────────────────────────────────────────────────────────

const BOOKING_STATUSES = ['new', 'contacted', 'scheduled', 'completed', 'declined'] as const;

function TattooBookingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading, isError } = useListAdminTattooBookings();
  const updateBooking = useUpdateAdminTattooBooking();

  const updateStatus = (bookingId: number, status: (typeof BOOKING_STATUSES)[number]) => {
    updateBooking.mutate(
      { bookingId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminTattooBookingsQueryKey() });
          toast({ title: 'Booking updated', description: `Status changed to ${status}.` });
        },
        onError: (error: any) => {
          toast({
            title: 'Could not update booking',
            description: String(error?.message ?? error),
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
        <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Commission Inquiries
        </h2>
        <span className="font-mono text-xs text-muted-foreground border border-border px-2 py-1">
          {bookings.length} requests
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Private project requests and reference images. New submissions also notify the studio inbox.
      </p>

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground animate-pulse py-8 text-center">Loading bookings…</p>
      ) : isError ? (
        <div className="py-8 text-center border border-destructive/30 bg-destructive/5">
          <p className="font-mono text-sm text-destructive">Could not load booking requests.</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-border">
          <ClipboardList className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">No commission inquiries yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <details key={booking.id} className="group border border-border bg-background">
              <summary className="list-none cursor-pointer p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-primary">#{booking.id}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide border border-primary/30 text-primary px-1.5 py-0.5">
                      {booking.requestType === 'other' ? 'Other' : booking.requestType}
                    </span>
                    <h3 className="font-display font-bold uppercase tracking-tight">{booking.name}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wide border border-primary/30 text-primary px-1.5 py-0.5">
                      {booking.preferredArtist}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {booking.placement} · {booking.estimatedSize} ·{' '}
                    {booking.submittedAt ? new Date(booking.submittedAt).toLocaleString() : 'Just submitted'}
                  </p>
                </div>
                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                  {booking.notificationStatus === 'failed' && (
                    <span title="Email notification failed; booking is saved in Admin">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </span>
                  )}
                  <select
                    className="h-9 px-2 bg-card border border-border text-xs font-mono uppercase"
                    value={booking.status}
                    onChange={(event) => updateStatus(booking.id, event.target.value as (typeof BOOKING_STATUSES)[number])}
                    disabled={updateBooking.isPending}
                    aria-label={`Status for booking ${booking.id}`}
                  >
                    {BOOKING_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </summary>

              <div className="border-t border-border p-4 md:p-5 grid md:grid-cols-[1fr_240px] gap-6">
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a href={`mailto:${booking.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Mail className="w-4 h-4" /> {booking.email}
                    </a>
                    {booking.phone && (
                      <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-4 h-4" /> {booking.phone}
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                      {booking.requestType === 'tattoo' ? 'Tattoo idea' : booking.requestType === 'painting' ? 'Painting request' : 'Project details'}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{booking.idea}</p>
                  </div>
                  {booking.notificationStatus === 'failed' && (
                    <div className="text-xs border border-amber-500/40 bg-amber-500/10 p-3">
                      <p className="font-medium">The automatic inbox notice failed, but this request and its images are safely stored here.</p>
                      {booking.notificationError && (
                        <p className="mt-1 font-mono text-[10px] break-words text-muted-foreground">
                          {booking.notificationError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Private references
                  </p>
                  {booking.references.length === 0 ? (
                    <p className="text-xs text-muted-foreground border border-dashed border-border p-4">No images attached.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {booking.references.map((reference) => (
                        <a
                          key={reference.id}
                          href={reference.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border border-border bg-muted aspect-square overflow-hidden"
                          title={reference.originalName}
                        >
                          <img src={reference.url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { data: user, isLoading } = useGetCurrentUser();

  if (isLoading) {
    return (
      <div className="py-24 text-center font-mono text-sm text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="py-24 text-center">
        <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-mono text-sm text-muted-foreground">This area is for AIMD admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border px-6 md:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Review safety reports · Manage bookings · Post events · Pick challenge winners · Manage instructors
          </p>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <AdminModerationPanel />
          <InstructorManagementCard />
          <TattooBookingsCard />
          <MembersCard />
          <AdminMonthlyDropsPanel />
          <CreateEventCard />
        </div>
      </div>
    </div>
  );
}
