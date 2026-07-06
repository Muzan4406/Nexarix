import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MaintenancePage from "@/pages/maintenance";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useGetPublicSettings } from "@workspace/api-client-react";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Activate from "@/pages/activate";
import PaymentStatus from "@/pages/payment-status";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Withdrawals from "@/pages/withdrawals";
import WithdrawalHistory from "@/pages/withdrawal-history";
import Points from "@/pages/points";
import Downline from "@/pages/downline";
import EquipeNiveau1 from "@/pages/equipe-niveau-1";
import EquipeNiveau2 from "@/pages/equipe-niveau-2";
import EquipeNiveau3 from "@/pages/equipe-niveau-3";
import EquipeInactifs from "@/pages/equipe-inactifs";
import EquipeBonus from "@/pages/equipe-bonus";
import EquipeParrainage from "@/pages/equipe-parrainage";
import Profile from "@/pages/profile";
import Contact from "@/pages/contact";
import SpinWheel from "@/pages/spin-wheel";
import Store from "@/pages/store";
import Formations from "@/pages/formations";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminTasks from "@/pages/admin-tasks";
import AdminWithdrawals from "@/pages/admin-withdrawals";
import AdminSettings from "@/pages/admin-settings";
import AdminStore from "@/pages/admin-store";
import AdminFormations from "@/pages/admin-formations";
import Services from "@/pages/services";
import AdminServices from "@/pages/admin-services";

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
      <Route path="/payment-status" component={PaymentStatus} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/withdrawals" component={() => <ProtectedRoute component={Withdrawals} />} />
      <Route path="/withdrawal-history" component={() => <ProtectedRoute component={WithdrawalHistory} />} />
      <Route path="/points" component={() => <ProtectedRoute component={Points} />} />
      <Route path="/downline" component={() => <ProtectedRoute component={Downline} />} />
      <Route path="/equipe/niveau-1" component={() => <ProtectedRoute component={EquipeNiveau1} />} />
      <Route path="/equipe/niveau-2" component={() => <ProtectedRoute component={EquipeNiveau2} />} />
      <Route path="/equipe/niveau-3" component={() => <ProtectedRoute component={EquipeNiveau3} />} />
      <Route path="/equipe/inactifs" component={() => <ProtectedRoute component={EquipeInactifs} />} />
      <Route path="/equipe/bonus"       component={() => <ProtectedRoute component={EquipeBonus}       />} />
      <Route path="/equipe/parrainage"  component={() => <ProtectedRoute component={EquipeParrainage}  />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/contact" component={() => <ProtectedRoute component={Contact} />} />
      <Route path="/spin" component={() => <ProtectedRoute component={SpinWheel} />} />
      <Route path="/store" component={() => <ProtectedRoute component={Store} />} />
      <Route path="/formations" component={() => <ProtectedRoute component={Formations} />} />
      <Route path="/divers" component={() => <ProtectedRoute component={Services} />} />

      <Route path="/admin/login" component={() => <PublicRoute component={AdminLogin} />} />
      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboard} adminOnly />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} adminOnly />} />
      <Route path="/admin/tasks" component={() => <ProtectedRoute component={AdminTasks} adminOnly />} />
      <Route path="/admin/withdrawals" component={() => <ProtectedRoute component={AdminWithdrawals} adminOnly />} />
      <Route path="/admin/settings" component={() => <ProtectedRoute component={AdminSettings} adminOnly />} />
      <Route path="/admin/store" component={() => <ProtectedRoute component={AdminStore} adminOnly />} />
      <Route path="/admin/formations" component={() => <ProtectedRoute component={AdminFormations} adminOnly />} />
      <Route path="/admin/services" component={() => <ProtectedRoute component={AdminServices} adminOnly />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { data: publicSettings, isLoading } = useGetPublicSettings();
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (isLoading || authLoading) return null;

  if ((publicSettings as any)?.maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <MaintenanceGate>
              <Router />
            </MaintenanceGate>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
