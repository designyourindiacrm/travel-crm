import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Pipeline from "@/pages/pipeline";
import LeadDetail from "@/pages/lead-detail";
import FollowUps from "@/pages/follow-ups";
import Bookings from "@/pages/bookings";
import BookingDetail from "@/pages/booking-detail";
import Payments from "@/pages/payments";
import Team from "@/pages/team";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function useAuthGate(): { token: string | null; ready: boolean } {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setToken(localStorage.getItem("crm_token"));
    setReady(true);
    const onStorage = () => setToken(localStorage.getItem("crm_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return { token, ready };
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token, ready } = useAuthGate();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (ready && !token) {
      setLocation("/login");
    }
  }, [ready, token, setLocation]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/leads">{() => <ProtectedRoute component={Leads} />}</Route>
      <Route path="/pipeline">{() => <ProtectedRoute component={Pipeline} />}</Route>
      <Route path="/leads/:id">{() => <ProtectedRoute component={LeadDetail} />}</Route>
      <Route path="/follow-ups">{() => <ProtectedRoute component={FollowUps} />}</Route>
      <Route path="/bookings">{() => <ProtectedRoute component={Bookings} />}</Route>
      <Route path="/bookings/:id">{() => <ProtectedRoute component={BookingDetail} />}</Route>
      <Route path="/payments">{() => <ProtectedRoute component={Payments} />}</Route>
      <Route path="/team">{() => <ProtectedRoute component={Team} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;