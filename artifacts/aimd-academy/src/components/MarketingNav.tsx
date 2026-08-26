import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { SignInButton, useAuth, useUser } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight } from 'lucide-react';
import aimdLogo from '@assets/aimd-logo.jpg';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/artist-resort', label: 'Artist Resort' },
  { href: '/tattoo', label: 'Tattoo Studio' },
  { href: '/gallery', label: 'Gallery' },
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
        <Link href="/" className="flex items-center gap-2" aria-label="AIMD — Art Is My Drug, home">
          <img src={aimdLogo} alt="AIMD — Art Is My Drug" className="h-10 w-auto" />
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
                <Link href="/app">
                  Creator App
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <Button variant="outline" className="rounded-none uppercase font-mono text-xs">
                  Log In
                </Button>
              </SignInButton>
              <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs" asChild>
                <Link href="/app">Creator App</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile actions: keep sign-in available without opening the menu */}
        <div className="md:hidden flex items-center gap-1">
          {!isSignedIn && (
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button variant="outline" className="h-9 px-3 rounded-none uppercase font-mono text-[11px]">
                Log In
              </Button>
            </SignInButton>
          )}
          <button
            className="p-2"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="marketing-mobile-menu" className="md:hidden mt-3 pb-2 flex flex-col gap-1 border-t border-border pt-3">
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
                <Link href="/app" onClick={() => setOpen(false)}>Creator App</Link>
              </Button>
            </>
          ) : (
            <div className="flex gap-2 mt-1">
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <Button variant="outline" className="flex-1 rounded-none uppercase font-mono text-xs">
                  Log In
                </Button>
              </SignInButton>
              <Button asChild className="flex-1 rounded-none bg-primary text-primary-foreground uppercase font-mono text-xs">
                <Link href="/app" onClick={() => setOpen(false)}>Creator App</Link>
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
          <img src={aimdLogo} alt="AIMD — Art Is My Drug" className="h-9 w-auto" />
        </div>
        <div className="flex flex-wrap justify-center gap-4 font-mono text-xs uppercase text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
           <Link href="/artist-resort" className="hover:text-foreground">Artist Resort</Link>
          <Link href="/tattoo" className="hover:text-foreground">Tattoo Studio</Link>
          <Link href="/gallery" className="hover:text-foreground">Gallery</Link>
           <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/app" className="hover:text-foreground">Creator App</Link>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Art Is My Drug
        </p>
      </div>
    </footer>
  );
}
