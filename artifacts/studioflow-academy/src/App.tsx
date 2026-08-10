import { Shell } from "@/components/layout/Shell";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Habits from "@/pages/Habits";
import StudioLog from "@/pages/StudioLog";
import Workshops from "@/pages/Workshops";
import WorkshopDetail from "@/pages/WorkshopDetail";
import Enrollments from "@/pages/Enrollments";
import SkillTracks from "@/pages/SkillTracks";
import JobBoard from "@/pages/JobBoard";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/habits" component={Habits} />
          <Route path="/studio-log" component={StudioLog} />
          <Route path="/workshops" component={Workshops} />
          <Route path="/workshops/:id" component={WorkshopDetail} />
          <Route path="/enrollments" component={Enrollments} />
          <Route path="/skill-tracks" component={SkillTracks} />
          <Route path="/job-board" component={JobBoard} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
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
