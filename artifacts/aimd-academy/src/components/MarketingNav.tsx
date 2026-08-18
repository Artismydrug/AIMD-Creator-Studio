import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { Flame, Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/tattoo', label: 'Tattoo Studio' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/app', label: 'Creator App' },
];

/** Shared top navigation for public marketing pages (Home, Tattoo, Gallery). */
export function MarketingNav() {
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const avatarUrl = user?.imageUrl;
  const displayName = user?.firstName || user?.username || 'You';

  return (
    <nav className="border-b border-border px-6 py-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Flame className="w-7 h-7 text-primary" />
          <span className="font-display font-black text-xl tracking-widest">AIMD</span>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Art Is My Drug
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Button
              key={l.href}
              asChild
              variant="ghost"
              className={`rounded-none uppercase font-mono text-xs ${
                location === l.href ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {isSignedIn ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 mr-1" aria-label="Your profile">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border border-border object-cover" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs group" asChild>
                <Link href="/dashboard">
                  Dashboard
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="rounded-none uppercase font-mono text-xs text-foreground/70 hover:text-foreground" asChild>
<Link href="/sign-in">
                  Sign In
                </Link>
</Button>
              <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs" asChild>
<Link href="/sign-up">
                  Sign Up
                </Link>
</Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-3 pb-2 flex flex-col gap-1 border-t border-border pt-3">
          {NAV_LINKS.map((l) => (
            <Button key={l.href} asChild variant="ghost" className="w-full justify-start rounded-none uppercase font-mono text-xs">
              <Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
            </Button>
          ))}
          {isSignedIn ? (
            <>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-muted"
                aria-label="Your profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border border-border object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-mono text-xs uppercase">Profile</span>
              </Link>
              <Button asChild className="w-full rounded-none bg-primary text-primary-foreground uppercase font-mono text-xs mt-1">
                <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
              </Button>
            </>
          ) : (
            <div className="flex gap-2 mt-1">
              <Button asChild variant="outline" className="flex-1 rounded-none uppercase font-mono text-xs">
                <Link href="/sign-in" onClick={() => setOpen(false)}>Sign In</Link>
              </Button>
              <Button asChild className="flex-1 rounded-none bg-primary text-primary-foreground uppercase font-mono text-xs">
                <Link href="/sign-up" onClick={() => setOpen(false)}>Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

/** Shared footer for public marketing pages. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border px-6 py-10 bg-card">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-display font-black tracking-widest">AIMD</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Art Is My Drug</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 font-mono text-xs uppercase text-muted-foreground">
          <Link href="/tattoo" className="hover:text-foreground">Tattoo Studio</Link>
          <Link href="/gallery" className="hover:text-foreground">Gallery</Link>
          <Link href="/app" className="hover:text-foreground">Creator App</Link>
          <Link href="/sign-up" className="hover:text-foreground">Join AIMD</Link>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Art Is My Drug
        </p>
      </div>
    </footer>
  );
}
