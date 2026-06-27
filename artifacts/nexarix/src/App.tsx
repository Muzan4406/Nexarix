import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Activate from "@/pages/activate";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Withdrawals from "@/pages/withdrawals";
import Downline from "@/pages/downline";
import Profile from "@/pages/profile";
import Community from "@/pages/community";
import Contact from "@/pages/contact";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminTasks from "@/pages/admin-tasks";
import AdminWithdrawals from "@/pages/admin-withdrawals";
import AdminSettings from "@/pages/admin-settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to={adminOnly ? "/admin/login" : "/login"} />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  if (!adminOnly && !isAdmin && user.status === "inactive") {
    return <Redirect to="/activate" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, isAdmin } = useAuth();
  if (isLoading) return null;
  if (user) {
    if (isAdmin) return <Redirect to="/admin/dashboard" />;
    if (user.status === "inactive") return <Redirect to="/activate" />;
    return <Redirect to="/dashboard" />;
  }
  return <Component />;
}

function HomeRoute() {
  const { user, isLoading, isAdmin } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (isAdmin) return <Redirect to="/admin/dashboard" />;
  if (user.status === "inactive") return <Redirect to="/activate" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />

      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />
      <Route path="/register/:upline" component={() => <PublicRoute component={Register} />} />

      <Route path="/activate" component={Activate} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/withdrawals" component={() => <ProtectedRoute component={Withdrawals} />} />
      <Route path="/downline" component={() => <ProtectedRoute component={Downline} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/community" component={() => <ProtectedRoute component={Community} />} />
      <Route path="/contact" component={() => <ProtectedRoute component={Contact} />} />

      <Route path="/admin/login" component={() => <PublicRoute component={AdminLogin} />} />
      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboard} adminOnly />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} adminOnly />} />
      <Route path="/admin/tasks" component={() => <ProtectedRoute component={AdminTasks} adminOnly />} />
      <Route path="/admin/withdrawals" component={() => <ProtectedRoute component={AdminWithdrawals} adminOnly />} />
      <Route path="/admin/settings" component={() => <ProtectedRoute component={AdminSettings} adminOnly />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
