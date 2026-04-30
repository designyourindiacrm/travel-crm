import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useEffect } from "react";

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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("crm_token") : null;

  useEffect(() => {
    if (!token && location !== "/login" && location !== "/register") {
      setLocation("/login");
    }
  }, [token, location, setLocation]);

  if (!token) return null;

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
      <Route path="/" render={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/leads" render={() => <ProtectedRoute component={Leads} />} />
      <Route path="/pipeline" render={() => <ProtectedRoute component={Pipeline} />} />
      <Route path="/leads/:id" render={() => <ProtectedRoute component={LeadDetail} />} />
      <Route path="/follow-ups" render={() => <ProtectedRoute component={FollowUps} />} />
      <Route path="/bookings" render={() => <ProtectedRoute component={Bookings} />} />
      <Route path="/bookings/:id" render={() => <ProtectedRoute component={BookingDetail} />} />
      <Route path="/payments" render={() => <ProtectedRoute component={Payments} />} />
      <Route path="/team" render={() => <ProtectedRoute component={Team} />} />
      <Route path="/settings" render={() => <ProtectedRoute component={Settings} />} />
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