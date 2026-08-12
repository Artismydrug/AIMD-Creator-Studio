import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { Shell } from '@/components/Shell';

// Pages
import NotFound from '@/pages/not-found';
import Landing from '@/pages/Landing';
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
import Mission from '@/pages/Mission';
import CheckIn from '@/pages/CheckIn';
import Directory from '@/pages/Directory';
import Messages from '@/pages/Messages';
import Onboarding from '@/pages/Onboarding';

// ─── localStorage key ─────────────────────────────────────────────────────────
export const ONBOARDING_KEY = 'aimd_onboarding_done';

const queryClient = new QueryClient();

// ─── Guard: redirect first-time visitors to /onboarding ──────────────────────
function OnboardingGuard() {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      navigate('/onboarding');
    }
  // Run once on mount — intentionally no deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Shell routes (wrapped in sidebar nav) ────────────────────────────────────
function ShellRoutes() {
  return (
    <Shell>
      <OnboardingGuard />
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/"               component={Landing} />
          <Route path="/dashboard"      component={Dashboard} />
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
          <Route path="/mission"        component={Mission} />
          <Route path="/checkin"        component={CheckIn} />
          <Route path="/directory"      component={Directory} />
          <Route path="/messages"       component={Messages} />
          <Route                        component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

// ─── Top-level router ─────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* Full-screen onboarding — no Shell wrapper */}
      <Route path="/onboarding" component={Onboarding} />
      {/* Everything else */}
      <Route component={ShellRoutes} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
