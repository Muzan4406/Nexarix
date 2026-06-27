import { useGetAdminDashboard } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, DollarSign, Zap, Clock, CheckCircle, TrendingUp } from "lucide-react";

function formatFcfa(v: number) { return `XOF ${v.toLocaleString("fr-FR")}`; }

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminDashboard();

  if (isLoading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>
    </AdminLayout>
  );

  const statCards = [
    { label: "Total membres", value: stats?.totalUsers || 0, Icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Membres actifs", value: stats?.activeUsers || 0, Icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Membres inactifs", value: stats?.inactiveUsers || 0, Icon: UserX, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Frais activation", value: formatFcfa(stats?.totalActivationFees || 0), Icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Points generes", value: (stats?.totalPointsGenerated || 0).toLocaleString(), Icon: Zap, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Retraits en attente", value: formatFcfa(stats?.pendingWithdrawals || 0), Icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { label: "Retraits payes", value: formatFcfa(stats?.paidWithdrawals || 0), Icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Inscrits (7j)", value: stats?.recentRegistrations || 0, Icon: TrendingUp, color: "text-primary", bg: "bg-primary/5" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground text-sm">Vue d'ensemble de la plateforme Nexarix</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(item => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${item.bg}`}>
                  <item.Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <p className="text-lg font-bold" data-testid={`stat-${item.label.toLowerCase().replace(/\s/g, "-")}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <p className="text-sm opacity-80">Taux d'activation</p>
              <p className="text-3xl font-bold mt-1">
                {stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Revenu par activation</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{formatFcfa(3000)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Conversion points</p>
              <p className="text-2xl font-bold mt-1">1000 = 500 XOF</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
