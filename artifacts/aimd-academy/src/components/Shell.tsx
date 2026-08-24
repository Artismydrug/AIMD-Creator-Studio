import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Award, Briefcase, Calendar, Flame, GraduationCap, HeartHandshake, ImagePlus, Menu, ShieldCheck, Sparkles, Timer, User, Users, X, Video, LayoutDashboard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGetCurrentUser, useGetInstructorSelf } from '@workspace/api-client-react';
import { useAuth, useClerk } from '@clerk/react';
import { LogIn, LogOut } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  highlight?: boolean;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

// ─── Nav structure ────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Creator Studio',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/community', label: 'Community & Practice', icon: Flame },
      { href: '/events', label: 'Events', icon: Calendar },
    ],
  },
  {
    heading: 'Workshops & Masterclasses',
    items: [
      { href: '/workshops',   label: 'Workshops & Masterclasses',         icon: GraduationCap },
      { href: '/plans',       label: 'Membership',                       icon: Sparkles },
      { href: '/badges',      label: 'Certifications & Badges',  icon: Award },
    ],
  },
  {
    heading: 'Career & Placement',
    items: [
      { href: '/job-board',   label: 'Open Chairs & Resident Board', icon: Briefcase },
      { href: '/directory',   label: 'Creator & Studio Directory', icon: Users },
    ],
  },
  {
    heading: 'Mission & Movement',
    items: [
      { href: '/mission', label: 'Our Mission',        icon: HeartHandshake },
      { href: '/sponsor', label: 'Sponsor a Creator',  icon: HeartHandshake, highlight: true },
    ],
  },
];

// Bottom nav tabs (mobile only)
const BOTTOM_TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/community', label: 'Community', icon: Flame },
  { href: '/workshops', label: 'Workshops', icon: GraduationCap },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/profile', label: 'Profile', icon: User },
];

// ─── Log Modal ────────────────────────────────────────────────────────────────

function LogModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();

  if (!open) return null;

  function go(path: string) {
    onClose();
    navigate(path);
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-card border border-border mb-20 mx-4 p-6 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-xs text-primary uppercase tracking-widest mb-1">
              Quick Log
            </p>
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
              What are you doing?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => go('/habits')}
            className="group flex flex-col items-center gap-3 p-5 border border-border bg-background hover:border-primary hover:bg-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-none bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Timer className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-display text-sm font-bold uppercase tracking-tight text-foreground">
                Studio Timer
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Start a session
              </p>
            </div>
          </button>

          <button
            onClick={() => go('/studio-log')}
            className="group flex flex-col items-center gap-3 p-5 border border-border bg-background hover:border-primary hover:bg-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-none bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <ImagePlus className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-display text-sm font-bold uppercase tracking-tight text-foreground">
                Post Artwork
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Share progress
              </p>
            </div>
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground font-mono mt-4 uppercase tracking-widest">
          Tap outside to close
        </p>
      </div>
    </div>
  );
}

// ─── Sidebar content (shared between desktop sidebar & mobile drawer) ─────────

function SidebarContent({
  location,
  user,
  isInstructor,
  onNav,
}: {
  location: string;
  user: { username?: string; avatarUrl?: string | null; tier?: string; studioReadyBadge?: boolean; isAdmin?: boolean } | undefined;
  isInstructor?: boolean;
  onNav?: () => void;
}) {
  let navSections = NAV_SECTIONS;
  if (user?.isAdmin || isInstructor) {
    navSections = [...navSections, {
      heading: 'Workspace',
      items: [
        ...(isInstructor || user?.isAdmin ? [{ href: '/instructor', label: 'Instructor Workspace', icon: Video }] : []),
        ...(user?.isAdmin ? [{ href: '/admin', label: 'Admin Dashboard', icon: ShieldCheck }] : []),
      ],
    }];
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Brand header */}
      <div className="mb-8 px-6 pt-6">
        <Link href="/" onClick={onNav}>
          <div className="flex items-center gap-2 cursor-pointer">
            <h1 className="text-xl font-black tracking-wider text-white">AIMD</h1>
            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
              NETWORK
            </span>
          </div>
          <p className="text-xs text-zinc-500 uppercase font-semibold tracking-widest mt-0.5">
            Art Is My Drug
          </p>
        </Link>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.heading}>
            <h3 className="text-[10px] font-bold text-zinc-500 tracking-wider mb-2 px-2 uppercase">
              {section.heading}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location === item.href ||
                  (item.href !== '/' && location.startsWith(`${item.href}/`));

                return (
                  <Link key={item.href} href={item.href} onClick={onNav}>
                    <div
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        item.highlight
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : isActive
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive || item.highlight ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Profile footer — auth-aware (sign in/sign out) */}
      <SidebarFooter user={user} onNav={onNav} />
    </div>
  );
}

function SidebarFooter({
  user,
  onNav,
}: {
  user: Parameters<typeof SidebarContent>[0]['user'];
  onNav?: () => void;
}) {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  if (!isSignedIn) {
    return (
      <div className="border-t border-sidebar-border pt-3 pb-4 px-6">
        <button
          onClick={() => navigate('/sign-in')}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold rounded-xl transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      </div>
    );
  }

  return (
      <div className="border-t border-sidebar-border pt-3 pb-4 px-6 flex items-center justify-between">
        <Link href="/profile" onClick={onNav}>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : (user?.username?.slice(0, 2).toUpperCase() ?? 'CR')
              }
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-sidebar-foreground leading-none truncate">
                {user?.username ?? 'Creator'}
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 mt-0.5 capitalize">
                {user?.tier ?? 'Community'}{user?.studioReadyBadge ? ' · Studio Ready' : ''}
              </span>
            </div>
          </div>
        </Link>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="p-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/80 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
  );
}
function MobileDrawer({
  open,
  onClose,
  location,
  user,
  isInstructor,
}: {
  open: boolean;
  onClose: () => void;
  location: string;
  user: Parameters<typeof SidebarContent>[0]['user'];
  isInstructor: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-[101] bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <SidebarContent location={location} user={user} isInstructor={isInstructor} onNav={onClose} />
      </div>
    </>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function MobileBottomNav({
  location,
}: {
  location: string;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-sidebar/95 backdrop-blur-md border-t border-border px-3 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">

        {/* Dashboard */}
        <BottomTab
          href="/dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
          active={location === '/dashboard'}
        />

        {/* Community */}
        <BottomTab
          href="/community"
          label="Community"
          icon={Flame}
          active={location === '/community'}
        />

        {/* Workshops */}
        <BottomTab
          href="/workshops"
          label="Workshops"
          icon={GraduationCap}
          active={location === '/workshops' || location.startsWith('/workshops/')}
        />

        {/* Events */}
        <BottomTab
          href="/events"
          label="Events"
          icon={Calendar}
          active={location === '/events'}
        />

        {/* Profile */}
        <BottomTab
          href="/profile"
          label="Profile"
          icon={User}
          active={location === '/profile'}
        />
      </div>
    </nav>
  );
}

function BottomTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
        {active && (
          <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
        )}
      </div>
    </Link>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: user } = useGetCurrentUser();
  const { data: instructorData } = useGetInstructorSelf({ query: { queryKey: ['getInstructorSelf'], retry: false } });
  const isInstructor = !!instructorData || !!user?.isAdmin;

  // Landing page renders full-bleed, no chrome
  if (location === '/') {
    return <>{children}</>;
  }

  return (
    <>
      {/* ── Mobile: slide-in sidebar drawer ── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        location={location}
        user={user}
        isInstructor={isInstructor}
      />

      {/* ── Root layout ── */}
      <div className="min-h-screen bg-background flex flex-row">

        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hidden md:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen bg-sidebar border-r border-border overflow-hidden shadow-sm">
          <SidebarContent location={location} user={user} isInstructor={isInstructor} />
        </aside>

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Mobile top bar */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card sticky top-0 z-50 flex-shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Center wordmark */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-6 h-6 bg-primary flex items-center justify-center">
                  <span className="font-mono font-bold text-primary-foreground text-xs">A</span>
                </div>
                <span className="font-display font-bold text-base uppercase tracking-widest text-foreground">
                  AIMD
                </span>
              </div>
            </Link>

            {/* Avatar shortcut */}
            <Link href="/profile">
              <Avatar className="w-8 h-8 border border-primary/30 rounded-none cursor-pointer">
                <AvatarImage src={user?.avatarUrl ?? ''} />
                <AvatarFallback className="bg-primary/10 text-primary rounded-none font-mono text-xs">
                  {user?.username?.[0]?.toUpperCase() ?? 'A'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </header>

          {/* Page content — extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 w-full pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <MobileBottomNav
        location={location}
      />
    </>
  );
}
