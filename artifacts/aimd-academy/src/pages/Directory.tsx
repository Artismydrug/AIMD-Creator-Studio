import { useEffect, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  ExternalLink,
  LayoutGrid,
  Map,
  MapPin,
  MessageSquare,
  Search,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useCreateConversation } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Creator {
  id: number;
  username: string;
  avatarUrl: string | null;
  tier: string;
  discipline: string | null;
  bio: string | null;
  location: string | null;
  bookingOpen: boolean;
  portfolioUrl: string | null;
  badgeCount: number;
  postCount: number;
}

const DISCIPLINE_FILTERS = [
  'All',
  'Tattooing',
  'Fine Art',
  'Mural & Street Art',
  'Graphic Design',
  'Illustration',
  'Fine Art & Murals',
];

const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const AVATAR_BG = [
  'bg-primary/15 text-primary',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-sky-500/20 text-sky-400',
  'bg-rose-500/20 text-rose-400',
];

// ─── Creator card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator, idx }: { creator: Creator; idx: number }) {
  const avatarClass = AVATAR_BG[idx % AVATAR_BG.length];
  const [, navigate] = useLocation();
  const conversation = useCreateConversation();
  const messageCreator = () => {
    conversation.mutate({ data: { participantIds: [creator.id] } }, {
      onSuccess: ({ id }) => navigate(`/messages?conversation=${id}`),
    });
  };

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 overflow-hidden group transition-all hover:border-zinc-600">
      {/* Header strip */}
      <div className="h-1 bg-gradient-to-r from-emerald-500/60 via-emerald-400/40 to-transparent" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <Link href={`/profile/${creator.id}`}>
            <div
              className={`w-11 h-11 rounded-full border border-current/20 flex items-center justify-center text-sm font-bold flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${avatarClass}`}
            >
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.username}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                INITIALS(creator.username)
              )}
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${creator.id}`}>
                <p className="font-bold text-white text-sm truncate hover:text-emerald-400 transition-colors cursor-pointer">{creator.username}</p>
              </Link>
              <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" aria-label="Studio Ready" />
            </div>
            {creator.location && (
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {creator.location}
              </p>
            )}
          </div>
        </div>

        {/* Discipline */}
        {creator.discipline && (
          <span className="self-start font-mono text-[10px] uppercase tracking-widest text-zinc-400 border border-zinc-700 px-2 py-0.5">
            {creator.discipline}
          </span>
        )}

        {/* Bio */}
        {creator.bio && (
          <p className="text-xs text-zinc-400 leading-relaxed flex-1">{creator.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-zinc-800 text-xs text-zinc-600 font-mono">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {creator.badgeCount} badge{creator.badgeCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {creator.postCount} post{creator.postCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-2">
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-9 rounded-none border-zinc-700 text-zinc-300 hover:text-emerald-400 font-mono text-xs uppercase">
            <Link href={`/profile/${creator.id}`}>View Profile</Link>
          </Button>
          {creator.bookingOpen ? (
            <Button
              asChild
              className="flex-1 h-9 rounded-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider text-xs"
            >
              <a href={`mailto:bookings@artismydrug.org?subject=Booking Request — ${creator.username}`}>
                Request Booking
              </a>
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="flex-1 h-9 rounded-none border-zinc-700 text-zinc-600 font-mono text-xs uppercase"
            >
              Not Accepting
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-none border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40"
            title={conversation.isError ? 'Could not start conversation. Try again.' : 'Message'}
            aria-label="Message creator"
            disabled={conversation.isPending}
            onClick={messageCreator}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
          {creator.portfolioUrl && (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-none border-zinc-700 text-zinc-400 hover:text-white"
            >
              <a href={creator.portfolioUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
        </div>
        {conversation.isError && <p className="font-mono text-[10px] text-destructive">Could not start a conversation. Please try again.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Map view — city clusters ─────────────────────────────────────────────────

const CITY_COORDS: Record<string, { label: string; top: string; left: string }> = {
  'Atlanta':    { label: 'Atlanta, GA',   top: '58%', left: '72%' },
  'Miami':      { label: 'Miami, FL',     top: '75%', left: '76%' },
  'New York':   { label: 'New York, NY',  top: '30%', left: '86%' },
  'Los Angeles':{ label: 'Los Angeles',   top: '48%', left: '12%' },
  'Chicago':    { label: 'Chicago, IL',   top: '32%', left: '64%' },
  'Houston':    { label: 'Houston, TX',   top: '65%', left: '54%' },
  'Phoenix':    { label: 'Phoenix, AZ',   top: '52%', left: '22%' },
  'Seattle':    { label: 'Seattle, WA',   top: '16%', left: '10%' },
  'Boston':     { label: 'Boston, MA',    top: '25%', left: '89%' },
  'Denver':     { label: 'Denver, CO',    top: '40%', left: '38%' },
};

function cityKey(location: string | null): string {
  if (!location) return '';
  return Object.keys(CITY_COORDS).find(c => location.includes(c)) ?? '';
}

function MapView({ creators }: { creators: Creator[] }) {
  const [hoverCity, setHoverCity] = useState<string | null>(null);

  // Group creators by city
  const byCity: Record<string, Creator[]> = {};
  const unmapped: Creator[] = [];
  for (const c of creators) {
    const key = cityKey(c.location);
    if (key) { (byCity[key] = byCity[key] ?? []).push(c); }
    else unmapped.push(c);
  }

  return (
    <div className="space-y-6">
      {/* Schematic US map */}
      <div className="relative border border-border bg-muted/40/50 overflow-hidden" style={{ paddingBottom: '52%' }}>
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Coasts */}
        <div className="absolute inset-y-0 left-[8%] right-[8%] border border-border/30" />

        {/* City pins */}
        {Object.entries(CITY_COORDS).map(([key, pos]) => {
          const group = byCity[key] ?? [];
          if (group.length === 0) return null;
          const isHover = hoverCity === key;

          return (
            <button
              key={key}
              onMouseEnter={() => setHoverCity(key)}
              onMouseLeave={() => setHoverCity(null)}
              style={{ top: pos.top, left: pos.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
            >
              {/* Pin dot */}
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                isHover
                  ? 'bg-primary border-emerald-400 text-zinc-950 scale-125'
                  : 'bg-muted border-primary/50 text-primary'
              }`}>
                {group.length}
              </div>
              {/* City label */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap font-mono text-[10px] px-2 py-0.5 bg-background border border-border transition-opacity ${isHover ? 'opacity-100' : 'opacity-70'}`}>
                {pos.label}
              </div>

              {/* Hover tooltip */}
              {isHover && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-20 w-52">
                  <div className="bg-background border border-border p-3 space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{pos.label}</p>
                    {group.slice(0, 3).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${AVATAR_BG[i % AVATAR_BG.length]}`}>
                          {INITIALS(c.username)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{c.username}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.discipline ?? '—'}</p>
                        </div>
                        {c.bookingOpen && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                    ))}
                    {group.length > 3 && (
                      <p className="font-mono text-[10px] text-muted-foreground">+{group.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Open to book</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-600" /> Studio Ready™</span>
        </div>
      </div>

      {/* City groups below the map */}
      <div className="space-y-6">
        {Object.entries(byCity).map(([city, group]) => (
          <div key={city}>
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-primary" />
              {CITY_COORDS[city].label} · {group.length} creator{group.length !== 1 ? 's' : ''}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.map((c, i) => <CreatorCard key={c.id} creator={c} idx={i} />)}
            </div>
          </div>
        ))}
        {unmapped.length > 0 && (
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Other locations · {unmapped.length}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unmapped.map((c, i) => <CreatorCard key={c.id} creator={c} idx={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Directory() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState('All');
  const [bookableOnly, setBookableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    fetch('/api/directory')
      .then((r) => r.json())
      .then((data) => { setCreators(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = creators.filter((c) => {
    const matchSearch =
      !search ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      (c.bio ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.location ?? '').toLowerCase().includes(search.toLowerCase());
    const matchDiscipline =
      discipline === 'All' ||
      (c.discipline ?? '').toLowerCase().includes(discipline.toLowerCase());
    const matchBookable = !bookableOnly || c.bookingOpen;
    return matchSearch && matchDiscipline && matchBookable;
  });

  return (
    <div className="p-6 md:p-10 space-y-10">
      {/* Header */}
      <header className="pb-6 border-b border-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] uppercase tracking-widest mb-4">
          <Shield className="w-3.5 h-3.5" />
          AIMD Studio Ready™ Alumni
        </div>
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight mb-3">
          Creator & Guild Directory
        </h1>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl">
          Every creator listed here has completed the AIMD pipeline — daily discipline, workshop certification, and a reviewed portfolio. Commission work, request bookings, or connect directly.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, discipline, or city…"
            className="rounded-none border-border bg-card pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="h-10 px-3 bg-card border border-border text-sm font-mono text-foreground rounded-none focus:outline-none focus:border-primary"
          >
            {DISCIPLINE_FILTERS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <Button
            variant={bookableOnly ? 'default' : 'outline'}
            onClick={() => setBookableOnly((b) => !b)}
            className="rounded-none font-mono text-xs uppercase tracking-wider h-10"
          >
            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
            Open to Book
          </Button>
        </div>
      </div>

      {/* Stats bar + view toggle */}
      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{filtered.length} Studio Ready creators</span>
        {bookableOnly && (
          <span className="text-primary">· {filtered.filter((c) => c.bookingOpen).length} accepting bookings</span>
        )}
        <div className="ml-auto flex items-center border border-border">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-muted text-white' : 'text-muted-foreground hover:text-foreground/80'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'map' ? 'bg-muted text-white' : 'text-muted-foreground hover:text-foreground/80'}`}
            title="Map view"
          >
            <Map className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted/40 border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold font-display uppercase mb-2">No creators found</h3>
          <p className="text-muted-foreground font-mono text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'map' ? (
        <MapView creators={filtered} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((creator, i) => (
            <CreatorCard key={creator.id} creator={creator} idx={i} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="border-t border-border pt-6 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          All creators listed have earned AIMD Studio Ready™ certification. Bookings are handled directly between clients and creators.
          <br />Questions? <a href="mailto:info@artismydrug.org" className="text-primary underline">info@artismydrug.org</a>
        </p>
      </div>
    </div>
  );
}
