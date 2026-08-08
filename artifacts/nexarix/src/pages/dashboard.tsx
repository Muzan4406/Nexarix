import { motion } from "framer-motion";
import { useGetDashboard, useGetPublicSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import {
  CreditCard, TrendingUp, Users, Wallet, Clock, Trophy,
} from "lucide-react";

const fadeUp = (i: number) => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
});

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboard();
  const { data: publicSettings } = useGetPublicSettings();

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const totalWithdrawn = stats?.totalWithdrawn || 0;
  const totalBalance   = (stats as any)?.totalBalance || 0;
  const activationFee  = publicSettings?.activationFee ?? 3800;
  const totalDownlines = (stats as any)?.totalDownlineCount || 0;
  const level1Count    = (stats as any)?.downlineLevel1Count || 0;
  const level2Count    = (stats as any)?.downlineLevel2Count || 0;
  const level3Count    = (stats as any)?.downlineLevel3Count || 0;
  const mlmEarnings    = ((stats as any)?.earnings?.mlmLevel1 || 0) +
                         ((stats as any)?.earnings?.mlmLevel2 || 0) +
                         ((stats as any)?.earnings?.mlmLevel3 || 0);
  const completedTasks = (stats as any)?.completedTasks || 0;

  return (
    <AppLayout>
      <div className="space-y-4 pb-8">

        {/* ── Greeting ──────────────────────────── */}
        <motion.div variants={fadeUp(0)} initial="hidden" animate="visible">
          <h1 className="font-black text-[26px] text-gray-900 leading-tight">
            Bonjour, {user?.username} 👋
          </h1>
          <p className="text-gray-500 font-semibold text-sm mt-0.5">Bienvenue sur NEXARIX</p>
          <p className="text-blue-600 font-medium text-xs mt-1 italic">
            Chaque jour est une nouvelle opportunité d'avancer.
          </p>
        </motion.div>

        {/* ── 2×2 Stat Cards ────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Card 1 — Frais d'Activation */}
          <motion.div
            variants={fadeUp(1)} initial="hidden" animate="visible"
            className="bg-white rounded-[22px] border border-gray-100 shadow-sm p-4 flex flex-col justify-between min-h-[130px]"
          >
            <div className="flex items-start justify-between">
              <p className="text-gray-700 font-black text-[13px] leading-tight">Frais<br/>d'Activation</p>
              <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-semibold mb-0.5">Montant :</p>
              <p className="font-black text-[22px] leading-none text-gray-900">
                {activationFee.toLocaleString("fr-FR")} F
              </p>
            </div>
          </motion.div>

          {/* Card 2 — Total Gagné */}
          <motion.div
            variants={fadeUp(1)} initial="hidden" animate="visible"
            className="rounded-[22px] p-4 flex flex-col justify-between min-h-[130px] text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #c084fc 100%)" }}
          >
            <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-start justify-between relative z-10">
              <p className="font-black text-[13px] leading-tight">Total Gagné</p>
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-purple-200 text-[10px] font-semibold mb-0.5">Montant :</p>
              <p className="font-black text-[22px] leading-none">
                {totalBalance.toLocaleString("fr-FR")} F
              </p>
            </div>
          </motion.div>

          {/* Card 3 — Total Filleuls */}
          <motion.div
            variants={fadeUp(2)} initial="hidden" animate="visible"
            className="rounded-[22px] p-4 flex flex-col justify-between min-h-[130px] text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 60%, #7dd3fc 100%)" }}
          >
            <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-start justify-between relative z-10">
              <p className="font-black text-[13px] leading-tight">Total Filleuls</p>
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sky-200 text-[10px] font-semibold mb-0.5">Nombre :</p>
              <p className="font-black text-[30px] leading-none">{totalDownlines}</p>
            </div>
          </motion.div>

          {/* Card 4 — Total Retiré */}
          <motion.div
            variants={fadeUp(2)} initial="hidden" animate="visible"
            className="bg-white rounded-[22px] border border-gray-100 shadow-sm p-4 flex flex-col justify-between min-h-[130px]"
          >
            <div className="flex items-start justify-between">
              <p className="text-gray-700 font-black text-[13px] leading-tight">Total<br/>Retiré</p>
              <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-semibold mb-0.5">Montant :</p>
              <p className="font-black text-[22px] leading-none text-gray-900">
                {totalWithdrawn.toLocaleString("fr-FR")} F
              </p>
            </div>
          </motion.div>

          {/* Card 5 — Tâches Accomplies (full width) */}
          <motion.div
            variants={fadeUp(3)} initial="hidden" animate="visible"
            className="col-span-2 rounded-[22px] p-4 flex flex-col justify-between min-h-[110px] text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 60%, #0f766e 100%)" }}
          >
            <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-center justify-between relative z-10">
              <p className="font-black text-[13px] leading-tight">Tâches Accomplies</p>
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Trophy className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-teal-200 text-[10px] font-semibold mb-0.5">Total :</p>
              <p className="font-black text-[30px] leading-none">{completedTasks}</p>
            </div>
          </motion.div>
        </div>

        {/* ── Aperçu Parrainage ─────────────────── */}
        <motion.div variants={fadeUp(3)} initial="hidden" animate="visible"
          className="bg-white rounded-[22px] border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Users className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="font-black text-gray-900 text-sm uppercase tracking-wide">Aperçu du parrainage</p>
          </div>
          <div className="p-4 space-y-2">
            <p className="font-black text-gray-800 text-sm mb-3">Mon Réseau</p>
            {[
              { label: "Niveau 1", count: level1Count, icon: "👤", color: "text-emerald-600" },
              { label: "Niveau 2", count: level2Count, icon: "👥", color: "text-blue-600" },
              { label: "Niveau 3", count: level3Count, icon: "🤝", color: "text-violet-600" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{row.icon}</span>
                  <p className="text-sm font-semibold text-gray-700">{row.label} :</p>
                  <p className={`text-sm font-black ${row.color}`}>{row.count}</p>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">Gains Parrainage :</p>
              <p className="font-black text-emerald-600 text-sm">{mlmEarnings.toLocaleString("fr-FR")} F</p>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-medium pt-1">
              <Clock className="h-3 w-3" />
              <span>Mis à jour en temps réel</span>
            </div>
          </div>
        </motion.div>


      </div>
    </AppLayout>
  );
}
