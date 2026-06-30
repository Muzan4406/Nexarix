import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDashboard, useGetPublicSettings, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet, ArrowDownCircle, Copy, CheckCircle, Users,
  Zap, Sparkles, CheckSquare, TrendingUp, ArrowRight,
  Gift, Star
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

const fadeUp = (i: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
});

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboard();
  const { data: publicSettings } = useGetPublicSettings();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      toast({ title: "Lien copié !", description: "Partagez-le pour gagner des commissions." });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const activationFee = publicSettings?.activationFee ?? 3000;
  const balance = stats?.balance || 0;
  const totalWithdrawn = stats?.totalWithdrawn || 0;
  const totalBalance = stats?.totalBalance || 0;
  const points = stats?.points || 0;
  const completedTasks = (stats as any)?.completedTasks || 0;
  const downlineCount = stats?.downlineCount || 0;
  const mlm1 = stats?.earnings?.mlmLevel1 || 0;
  const mlm2 = stats?.earnings?.mlmLevel2 || 0;
  const mlm3 = stats?.earnings?.mlmLevel3 || 0;
  const totalMlm = mlm1 + mlm2 + mlm3;

  const quickActions = [
    { label: "Mes Filleuls", icon: Users, href: "/downline", gradient: "from-cyan-500 to-teal-500" },
    { label: "Tâches", icon: CheckSquare, href: "/tasks", gradient: "from-violet-500 to-purple-600" },
    { label: "Retirer", icon: Wallet, href: "/withdrawals", gradient: "from-emerald-500 to-teal-600" },
    { label: "Roue", icon: Star, href: "/spin", gradient: "from-amber-400 to-orange-500" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4 pb-4">

        {/* ── Hero Banner ─── */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #0d1b3e 0%, #1a2f6e 45%, #1565C0 100%)" }}
        >
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-8 right-20 h-8 w-8 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-4 right-4 h-20 w-20 rounded-full bg-blue-400/10 pointer-events-none" />

          <div className="relative z-10 p-5">
            {/* User row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl shrink-0 shadow-inner ring-2 ring-white/20">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-200 text-[11px] font-bold uppercase tracking-widest">Bienvenue sur Nexarix</p>
                <p className="font-black text-xl leading-tight truncate">{user?.username}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/30 rounded-2xl px-3 py-1.5 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span className="text-xs font-black text-yellow-200">Premium</span>
              </div>
            </div>

            {/* Balance + total */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-3.5">
                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1">Solde disponible</p>
                <p className="font-black text-2xl leading-tight">{formatCurrency(balance, user?.country)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-3.5">
                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1">Total gagné</p>
                <p className="font-black text-2xl leading-tight">{formatCurrency(totalBalance, user?.country)}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/8 border border-white/10 p-2.5 text-center">
                <p className="font-black text-base text-white">{points.toLocaleString()}</p>
                <p className="text-[10px] text-blue-300 font-semibold mt-0.5">Points</p>
              </div>
              <div className="rounded-xl bg-white/8 border border-white/10 p-2.5 text-center">
                <p className="font-black text-base text-white">{downlineCount}</p>
                <p className="text-[10px] text-blue-300 font-semibold mt-0.5">Filleuls</p>
              </div>
              <div className="rounded-xl bg-white/8 border border-white/10 p-2.5 text-center">
                <p className="font-black text-base text-white">{completedTasks}</p>
                <p className="text-[10px] text-blue-300 font-semibold mt-0.5">Tâches</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Actions ─── */}
        <motion.div variants={fadeUp(1)} initial="hidden" animate="visible">
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((a) => (
              <Link key={a.href} href={a.href}>
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center shadow-md`}>
                    <a.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 text-center leading-tight">{a.label}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Stat Cards ─── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Solde disponible",
              value: formatCurrency(balance, user?.country),
              sub: "Retirable maintenant",
              icon: Wallet,
              gradient: "from-emerald-500 to-teal-500",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
              i: 2,
            },
            {
              label: "Total retiré",
              value: formatCurrency(totalWithdrawn, user?.country),
              sub: "Depuis votre inscription",
              icon: ArrowDownCircle,
              gradient: "from-orange-500 to-amber-500",
              bg: "bg-orange-50",
              border: "border-orange-100",
              i: 3,
            },
            {
              label: "Gains MLM",
              value: formatCurrency(totalMlm, user?.country),
              sub: `Niv.1: ${formatCurrency(mlm1, user?.country)}`,
              icon: TrendingUp,
              gradient: "from-blue-500 to-indigo-600",
              bg: "bg-blue-50",
              border: "border-blue-100",
              i: 4,
            },
            {
              label: "Mes Points",
              value: `${points.toLocaleString()} pts`,
              sub: "Convertibles en FCFA",
              icon: Zap,
              gradient: "from-amber-400 to-orange-500",
              bg: "bg-amber-50",
              border: "border-amber-100",
              i: 5,
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp(s.i)}
              initial="hidden"
              animate="visible"
              className={cn("rounded-2xl border p-4 shadow-sm", s.bg, s.border)}
            >
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-md`}>
                <s.icon className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
              </div>
              <p className="text-gray-500 text-[11px] font-semibold mb-0.5">{s.label}</p>
              <p className="font-black text-base text-gray-900 leading-tight">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── MLM Breakdown ─── */}
        {totalMlm > 0 && (
          <motion.div variants={fadeUp(6)} initial="hidden" animate="visible"
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="font-black text-gray-900 text-sm">Commissions MLM</span>
              </div>
              <Link href="/downline">
                <span className="text-xs font-bold text-blue-500 flex items-center gap-1 cursor-pointer hover:text-blue-700">
                  Voir <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Niveau 1", value: mlm1, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                { label: "Niveau 2", value: mlm2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                { label: "Niveau 3", value: mlm3, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
              ].map((lv) => (
                <div key={lv.label} className={cn("rounded-2xl border p-3 text-center", lv.bg, lv.border)}>
                  <p className={cn("font-black text-sm", lv.color)}>{formatCurrency(lv.value, user?.country)}</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{lv.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Referral Link ─── */}
        <motion.div
          variants={fadeUp(7)}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">Mon lien de parrainage</p>
                <p className="text-[10px] text-gray-400 font-medium">Partagez et gagnez jusqu'à 1 300 FCFA/filleul</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl px-3 py-2.5 mb-3 border border-gray-100">
              <p className="font-mono text-xs text-gray-500 truncate">{stats?.referralLink || "Chargement…"}</p>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "w-full rounded-2xl h-11 flex items-center justify-center gap-2 font-bold text-sm transition-all",
                copied
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 active:scale-[0.98]"
              )}
            >
              {copied
                ? <><CheckCircle className="h-4 w-4" /> Lien copié !</>
                : <><Copy className="h-4 w-4" /> Copier mon lien de parrainage</>
              }
            </button>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
