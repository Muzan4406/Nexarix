import { useGetAdminDashboard } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Users, UserCheck, UserX, DollarSign, Zap, Clock, CheckCircle, TrendingUp, Activity } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("fr-FR"); }
function fmtXof(v: number) { return `${v.toLocaleString("fr-FR")} XOF`; }

function StatCard({ label, value, icon: Icon, color, bg, border }: {
  label: string; value: string | number; icon: any;
  color: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-2xl border ${border} ${bg} p-4`}>
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color} mb-3`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-xl font-black text-gray-900 dark:text-white leading-none mb-1">{value}</p>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: s, isLoading } = useGetAdminDashboard();

  const activation = s?.totalUsers ? Math.round(((s.activeUsers || 0) / s.totalUsers) * 100) : 0;

  if (isLoading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#1E3A5F] p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <Activity className="h-5 w-5 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Vue d'ensemble</span>
          </div>
          <h1 className="text-2xl font-black mb-4">Tableau de bord</h1>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-black">{fmt(s?.totalUsers || 0)}</p>
              <p className="text-blue-300 text-xs mt-0.5">Membres</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-emerald-400">{activation}%</p>
              <p className="text-blue-300 text-xs mt-0.5">Taux activation</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="text-lg font-black text-amber-400">{fmtXof(s?.totalActivationFees || 0)}</p>
              <p className="text-blue-300 text-xs mt-0.5">Revenus</p>
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total membres"   value={fmt(s?.totalUsers || 0)}  icon={Users}     color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"    bg="bg-white dark:bg-gray-900"   border="border-gray-100 dark:border-gray-800" />
          <StatCard label="Actifs"          value={fmt(s?.activeUsers || 0)} icon={UserCheck}  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" bg="bg-white dark:bg-gray-900" border="border-gray-100 dark:border-gray-800" />
          <StatCard label="Inactifs"        value={fmt(s?.inactiveUsers || 0)} icon={UserX}   color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"  bg="bg-white dark:bg-gray-900"   border="border-gray-100 dark:border-gray-800" />
          <StatCard label="7 derniers jours" value={fmt(s?.recentRegistrations || 0)} icon={TrendingUp} color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" bg="bg-white dark:bg-gray-900" border="border-gray-100 dark:border-gray-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Withdrawals */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Retraits</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">En attente</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtXof(s?.pendingWithdrawals || 0)}</span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payés</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtXof(s?.paidWithdrawals || 0)}</span>
              </div>
            </div>
          </div>

          {/* Taux & conversion */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Plateforme</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Points générés</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(s?.totalPointsGenerated || 0)} pts</span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conversion</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">1 000 pts = 500 XOF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activation rate bar */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Taux d'activation</p>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{activation}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000"
              style={{ width: `${activation}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">{fmt(s?.activeUsers || 0)} actifs</span>
            <span className="text-xs text-gray-400">{fmt(s?.totalUsers || 0)} total</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
