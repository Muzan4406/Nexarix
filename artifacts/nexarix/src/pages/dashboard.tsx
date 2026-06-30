import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDashboard, useGetPublicSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet, ArrowDownCircle, Copy, CheckCircle, Users,
  Zap, Sparkles, TrendingUp, ArrowRight, Gift,
  BadgeDollarSign, ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const fadeUp = (i: number) => ({
  hidden: { opacity: 0, y: 18 },
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1565C0] border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const balance       = stats?.balance || 0;
  const totalWithdrawn = stats?.totalWithdrawn || 0;
  const totalBalance  = stats?.totalBalance || 0;
  const points        = stats?.points || 0;
  const completedTasks = (stats as any)?.completedTasks || 0;
  const mlm1 = stats?.earnings?.mlmLevel1 || 0;
  const mlm2 = stats?.earnings?.mlmLevel2 || 0;
  const mlm3 = stats?.earnings?.mlmLevel3 || 0;
  const totalMlm = mlm1 + mlm2 + mlm3;

  return (
    <AppLayout>
      <div className="space-y-4 pb-4">

        {/* ── Hero Banner ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #060d1f 0%, #0d1b3e 40%, #1565C0 100%)" }}
        >
          {/* Décoration */}
          <div className="pointer-events-none absolute -top-14 -right-14 h-52 w-52 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-6 right-24 h-5 w-5 rounded-full bg-yellow-400/20" />
          <div className="pointer-events-none absolute top-16 right-10 h-3 w-3 rounded-full bg-yellow-400/30" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute bottom-8 right-8 h-16 w-16 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,200,50,0.12) 0%, transparent 70%)" }} />

          <div className="relative z-10 p-5">
            {/* User row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-13 w-13 h-[52px] w-[52px] rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg ring-2 ring-white/20"
                style={{ background: "linear-gradient(135deg, #1e3a8a, #1565C0)" }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-300 text-[11px] font-bold uppercase tracking-widest">Bienvenue</p>
                <p className="font-black text-xl leading-tight truncate">{user?.username}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 shrink-0 border border-yellow-400/30"
                style={{ background: "rgba(234,179,8,0.15)" }}>
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span className="text-xs font-black text-yellow-200">Premium</span>
              </div>
            </div>

            {/* Solde principal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Wallet className="h-3.5 w-3.5 text-yellow-300" />
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Solde disponible</p>
                </div>
                <p className="font-black text-2xl leading-tight">{formatCurrency(balance, user?.country)}</p>
              </div>
              <div className="rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-yellow-300" />
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Total gagné</p>
                </div>
                <p className="font-black text-2xl leading-tight">{formatCurrency(totalBalance, user?.country)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Cartes de stats ──────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Solde disponible",
              value: formatCurrency(balance, user?.country),
              sub: "Retirable maintenant",
              icon: Wallet,
              iconColor: "text-[#1565C0]",
              iconBg: "bg-blue-50",
              accent: "#1565C0",
              border: "border-blue-100",
              bg: "bg-white",
              i: 1,
            },
            {
              label: "Total retiré",
              value: formatCurrency(totalWithdrawn, user?.country),
              sub: "Depuis votre inscription",
              icon: ArrowDownCircle,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-50",
              accent: "#d97706",
              border: "border-amber-100",
              bg: "bg-white",
              i: 2,
            },
            {
              label: "Commissions MLM",
              value: formatCurrency(totalMlm, user?.country),
              sub: `Réseau 3 niveaux`,
              icon: Users,
              iconColor: "text-[#0d1b3e]",
              iconBg: "bg-slate-100",
              accent: "#0d1b3e",
              border: "border-slate-100",
              bg: "bg-white",
              i: 3,
            },
            {
              label: "Mes Points",
              value: `${points.toLocaleString()} pts`,
              sub: "Convertibles en FCFA",
              icon: Zap,
              iconColor: "text-yellow-600",
              iconBg: "bg-yellow-50",
              accent: "#ca8a04",
              border: "border-yellow-100",
              bg: "bg-white",
              i: 4,
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp(s.i)}
              initial="hidden"
              animate="visible"
              className={cn("rounded-2xl border p-4 shadow-sm", s.bg, s.border)}
            >
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3 shadow-sm", s.iconBg)}>
                <s.icon className={cn("h-[18px] w-[18px]", s.iconColor)} />
              </div>
              <p className="text-gray-400 text-[11px] font-semibold mb-0.5">{s.label}</p>
              <p className="font-black text-base text-gray-900 leading-tight">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Tâches accomplies + statut ───────────── */}
        <motion.div variants={fadeUp(5)} initial="hidden" animate="visible"
          className="grid grid-cols-2 gap-3"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #0d1b3e, #1565C0)" }}>
              <BadgeDollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[11px] font-semibold">Tâches faites</p>
              <p className="font-black text-lg text-gray-900 leading-tight">{completedTasks.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #166534, #15803d)" }}>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[11px] font-semibold">Statut</p>
              <p className="font-black text-sm text-emerald-600 leading-tight">Compte actif</p>
            </div>
          </div>
        </motion.div>

        {/* ── Commissions MLM détail ───────────────── */}
        {totalMlm > 0 && (
          <motion.div variants={fadeUp(6)} initial="hidden" animate="visible"
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0d1b3e, #1565C0)" }}>
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="font-black text-gray-900 text-sm">Commissions MLM</span>
              </div>
              <Link href="/downline">
                <span className="text-xs font-bold text-[#1565C0] flex items-center gap-1 cursor-pointer hover:underline">
                  Voir <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Niveau 1", value: mlm1, dot: "#059669" },
                { label: "Niveau 2", value: mlm2, dot: "#1565C0" },
                { label: "Niveau 3", value: mlm3, dot: "#7c3aed" },
              ].map((lv) => (
                <div key={lv.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <div className="h-2 w-2 rounded-full mx-auto mb-2" style={{ background: lv.dot }} />
                  <p className="font-black text-sm text-gray-900">{formatCurrency(lv.value, user?.country)}</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{lv.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Lien de parrainage ───────────────────── */}
        <motion.div
          variants={fadeUp(7)}
          initial="hidden"
          animate="visible"
          className="rounded-3xl overflow-hidden shadow-sm border border-slate-100"
          style={{ background: "linear-gradient(135deg, #060d1f 0%, #0d1b3e 50%, #1a2f6e 100%)" }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border border-yellow-400/30"
                style={{ background: "rgba(234,179,8,0.15)" }}>
                <Gift className="h-5 w-5 text-yellow-300" />
              </div>
              <div>
                <p className="font-black text-white text-sm">Mon lien de parrainage</p>
                <p className="text-[10px] text-blue-300 font-medium">Gagnez jusqu'à 1 300 FCFA par filleul</p>
              </div>
            </div>
            <div className="rounded-2xl px-3 py-2.5 mb-3 border border-white/10"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <p className="font-mono text-xs text-blue-200 truncate">{stats?.referralLink || "Chargement…"}</p>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "w-full rounded-2xl h-11 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.98]",
                copied
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                  : "text-[#0d1b3e] shadow-lg shadow-yellow-900/20 hover:shadow-yellow-700/30"
              )}
              style={copied ? {} : { background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
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
