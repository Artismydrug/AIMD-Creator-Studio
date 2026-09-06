import { useEffect, useRef, type ReactNode } from 'react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useAuth,
  useClerk,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { Shell } from '@/components/Shell';

// Pages
import NotFound from '@/pages/not-found';
import Landing from '@/pages/Landing';
import About from '@/pages/About';
import AppOnboarding from '@/pages/AppOnboarding';
import Dashboard from '@/pages/Dashboard';
import Habits from '@/pages/Habits';
import StudioLog from '@/pages/StudioLog';
import Events from '@/pages/Events';
import Workshops from '@/pages/Workshops';
import WorkshopDetail from '@/pages/WorkshopDetail';
import Enrollments from '@/pages/Enrollments';
import SkillTracks from '@/pages/SkillTracks';
import JobBoard from '@/pages/JobBoard';
import Sponsor from '@/pages/Sponsor';
import Plans from '@/pages/Plans';
import Profile from '@/pages/Profile';
import Badges from '@/pages/Badges';
import History from '@/pages/History';
import Mission from '@/pages/Mission';
import CheckIn from '@/pages/CheckIn';
import Directory from '@/pages/Directory';
import Messages from '@/pages/Messages';
import Notifications from '@/pages/Notifications';
import Community from '@/pages/Community';
import ChallengesHabits from '@/pages/ChallengesHabits';
import Admin from '@/pages/Admin';
import Onboarding from '@/pages/Onboarding';
import Tattoo from '@/pages/Tattoo';
import Gallery from '@/pages/Gallery';
import Instructor from '@/pages/Instructor';
import HQ from '@/pages/HQ';
import Privacy from '@/pages/Privacy';
import TextClub from '@/pages/TextClub';
import SmsTerms from '@/pages/SmsTerms';

// ─── Clerk setup ──────────────────────────────────────────────────────────────
// REQUIRED — resolves the publishable key from the request host so the same
// build can serve multiple Clerk custom domains. Do not inline the env var.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (Clerk hits FAPI directly), auto-set in prod.
// Do NOT gate on import.meta.env.PROD — the empty dev value is intentional.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

// ─── Clerk appearance — AIMD Open Studio warm gallery theme ──────────────────
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#C85A32',
    colorForeground: '#2C2623',
    colorMutedForeground: '#6E6660',
    colorDanger: '#dc2626',
    colorBackground: '#FFFFFF',
    colorInput: '#F7F4EF',
    colorInputForeground: '#2C2623',
    colorNeutral: '#E8E2D9',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    modalBackdrop: 'bg-black/20 backdrop-blur-[2px]',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_8px_30px_rgba(44,38,35,0.10)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-black uppercase tracking-tight text-[#2C2623]',
    headerSubtitle: 'text-[#6E6660]',
    socialButtonsBlockButtonText: 'text-[#2C2623] font-medium',
    formFieldLabel: 'text-[#2C2623] font-medium text-sm',
    footerActionLink: 'text-[#C85A32] font-semibold',
    footerActionText: 'text-[#6E6660]',
    dividerText: 'text-[#6E6660]',
    identityPreviewEditButton: 'text-[#C85A32]',
    formFieldSuccessText: 'text-green-600',
    alertText: 'text-[#2C2623]',
    logoBox: 'flex items-center justify-center py-2',
    logoImage: 'h-8',
    socialButtonsBlockButton: 'border border-[#E8E2D9] bg-[#F7F4EF] hover:bg-[#F2ECE1]',
    formButtonPrimary: 'bg-[#C85A32] hover:bg-[#b54f2c] text-white font-bold uppercase tracking-wide',
    formFieldInput: 'bg-[#F7F4EF] border-[#E8E2D9] text-[#2C2623]',
    footerAction: 'bg-[#FDFBF7]',
    dividerLine: 'bg-[#E8E2D9]',
    alert: 'bg-[#FDF0EA] border-[#C85A32]/20',
    otpCodeFieldInput: 'bg-[#F7F4EF] border-[#E8E2D9]',
    formFieldRow: 'gap-3',
    main: 'gap-4',
  },
};

// ─── Query client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient();

// ─── Cache invalidator on user change ────────────────────────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ─── localStorage key (onboarding) ───────────────────────────────────────────
export const ONBOARDING_KEY = 'aimd_onboarding_done';

function OnboardingGuard() {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      navigate('/onboarding');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Sign-in / sign-up pages ──────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/onboarding`}
      />
    </div>
  );
}

// ─── /app entry — creator app hub ─────────────────────────────────────────────
function AppEntryRoute() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><AppOnboarding /></Show>
    </>
  );
}

// ─── Protected shell — requires Clerk session ────────────────────────────────
function AuthenticatedShell() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#FDFBF7]" />;
  }
  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return (
    <Shell>
      <OnboardingGuard />
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/dashboard"      component={Dashboard} />
          <Route path="/community"      component={Community} />
          <Route path="/challenges-habits" component={ChallengesHabits} />
          <Route path="/habits"         component={Habits} />
          <Route path="/studio-log"     component={StudioLog} />
          <Route path="/events"         component={Events} />
          <Route path="/workshops"      component={Workshops} />
          <Route path="/workshops/:id"  component={WorkshopDetail} />
          <Route path="/enrollments"    component={Enrollments} />
          <Route path="/skill-tracks"   component={SkillTracks} />
          <Route path="/job-board"      component={JobBoard} />
          <Route path="/sponsor"        component={Sponsor} />
          <Route path="/plans"          component={Plans} />
          <Route path="/profile"        component={Profile} />
          <Route path="/profile/:id"    component={Profile} />
          <Route path="/badges"         component={Badges} />
          <Route path="/history"        component={History} />
          <Route path="/mission"        component={Mission} />
          <Route path="/checkin"        component={CheckIn} />
          <Route path="/directory"      component={Directory} />
          <Route path="/messages"       component={Messages} />
          <Route path="/notifications"  component={Notifications} />
          <Route path="/admin"          component={Admin} />
          <Route path="/instructor"     component={Instructor} />
          <Route path="/hq"              component={HQ} />
          <Route                        component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

// ─── Main router ──────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* REQUIRED — copy "/sign-in/*?" and "/sign-up/*?" verbatim */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      {/* Onboarding is public — accessible without shell */}
      <Route path="/onboarding" component={Onboarding} />
      {/* Public marketing pages — the AIMD hub */}
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      {/* Retired public concept page; keep its source for a future relaunch. */}
      <Route path="/artist-resort" component={NotFound} />
      <Route path="/tattoo" component={Tattoo} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/text-club" component={TextClub} />
      <Route path="/sms-terms" component={SmsTerms} />
      {/* Creator app entry: dashboard when signed in, sign-in otherwise */}
      <Route path="/app" component={AppEntryRoute} />
      {/* Everything else requires auth */}
      <Route component={AuthenticatedShell} />
    </Switch>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Discipline Eats Talent. Sign in to Creator Studio by AIMD',
          },
        },
        signUp: {
          start: {
            title: 'Creator Studio by AIMD',
            subtitle: 'Discipline Eats Talent. Join the community — free forever',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ScrollToTop />
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (anchor) {
      requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location]);
  return null;
}

export default App;
