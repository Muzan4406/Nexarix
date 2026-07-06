import { motion } from "framer-motion";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Users, UserCheck, UserX, DollarSign, Zap, Clock, CheckCircle2, TrendingUp, ArrowUpRight } from "lucide-react";

function fmt(v: number) { return (v || 0).toLocaleString("fr-FR"); }
function fmtXof(v: number) { return `${(v || 0).toLocaleString("fr-FR")} XOF`; }

const card = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

function KpiCard({ label, value, sub, icon: Icon, gradient, index }: {
  label: string; value: string; sub?: string; icon: any; gradient: string; index: number;
}) {
  return (
    <motion.div custom={index} variants={card} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-gray-300" />
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
      <p className="text-sm font-semibold text-gray-500 mt-2">{label}</p>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data: s, isLoading } = useGetAdminDashboard();
  const activation = s?.totalUsers ? Math.round(((s.activeUsers || 0) / s.totalUsers) * 100) : 0;

  if (isLoading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Hero banner */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl text-white p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1565C0 60%, #0D47A1 100%)" }}>
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 right-24 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Résumé global</p>
            <h1 className="text-3xl font-black mb-5">Tableau de bord</h1>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
                <p className="text-3xl font-black">{fmt(s?.totalUsers || 0)}</p>
                <p className="text-blue-300 text-xs font-semibold mt-1">Membres</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
                <p className="text-3xl font-black text-emerald-400">{activation}%</p>
                <p className="text-blue-300 text-xs font-semibold mt-1">Taux activation</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
                <p className="text-xl font-black text-amber-400">{fmtXof(s?.totalActivationFees || 0)}</p>
                <p className="text-blue-300 text-xs font-semibold mt-1">Revenus</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard index={0} label="Total membres"     value={fmt(s?.totalUsers || 0)}          icon={Users}     gradient="from-blue-500 to-indigo-600" />
          <KpiCard index={1} label="Membres actifs"    value={fmt(s?.activeUsers || 0)}          icon={UserCheck} gradient="from-emerald-500 to-teal-500" />
          <KpiCard index={2} label="Inactifs"          value={fmt(s?.inactiveUsers || 0)}        icon={UserX}     gradient="from-amber-500 to-orange-500" />
          <KpiCard index={3} label="7 derniers jours"  value={fmt(s?.recentRegistrations || 0)}  icon={TrendingUp} gradient="from-violet-500 to-purple-600" />
        </div>

        {/* Withdrawals + Platform */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div custom={4} variants={card} initial="hidden" animate="visible"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Retraits</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">En attente</p>
                    <p className="text-xs text-gray-400">À traiter</p>
                  </div>
                </div>
                <p className="text-sm font-black text-orange-600">{fmtXof(s?.pendingWithdrawals || 0)}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Payés</p>
                    <p className="text-xs text-gray-400">Traités</p>
                  </div>
                </div>
                <p className="text-sm font-black text-emerald-600">{fmtXof(s?.paidWithdrawals || 0)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div custom={5} variants={card} initial="hidden" animate="visible"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Plateforme</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Points générés</p>
                    <p className="text-xs text-gray-400">Total cumulé</p>
                  </div>
                </div>
                <p className="text-sm font-black text-violet-600">{fmt(s?.totalPointsGenerated || 0)} pts</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Taux conversion</p>
                    <p className="text-xs text-gray-400">Points → FCFA</p>
                  </div>
                </div>
                <p className="text-sm font-black text-blue-600">1 000 pts = 500 XOF</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Activation progress */}
        <motion.div custom={6} variants={card} initial="hidden" animate="visible"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-gray-900">Taux d'activation</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmt(s?.activeUsers || 0)} actifs sur {fmt(s?.totalUsers || 0)} membres</p>
            </div>
            <span className="text-3xl font-black text-blue-600">{activation}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${activation}%` }}
              transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-semibold text-emerald-600">{fmt(s?.activeUsers || 0)} actifs</span>
            <span className="text-xs font-semibold text-gray-400">{fmt(s?.inactiveUsers || 0)} inactifs</span>
          </div>
        </motion.div>

      </div>
    </AdminLayout>
  );
}
