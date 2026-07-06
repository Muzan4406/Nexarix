import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDashboard, useGetPublicSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet, ArrowDownCircle, Copy, CheckCircle,
  Zap, Sparkles, TrendingUp, Gift,
  BadgeDollarSign, ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

const rise = (i: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
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
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const balance        = stats?.balance || 0;
  const totalWithdrawn = stats?.totalWithdrawn || 0;
  const totalBalance   = stats?.totalBalance || 0;
  const points         = stats?.points || 0;
  const activationFee  = publicSettings?.activationFee ?? 3000;
  const completedTasks = (stats as any)?.completedTasks || 0;

  return (
    <AppLayout>
      <div className="space-y-3.5 pb-6">

        {/* ── Hero ──────────────────────────────── */}
        <motion.div
          variants={rise(0)} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-[28px] text-white"
          style={{ background: "linear-gradient(145deg, #050d1f 0%, #0c1a3d 45%, #1248a8 100%)" }}
        >
          {/* déco */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(99,155,255,0.18) 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
          <div className="pointer-events-none absolute top-8 right-32 h-2 w-2 rounded-full bg-yellow-400/50" />
          <div className="pointer-events-none absolute top-16 right-14 h-1.5 w-1.5 rounded-full bg-blue-300/60" />

          <div className="relative z-10 p-5">
            {/* Nom + badge */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-lg ring-1 ring-white/15"
                  style={{ background: "linear-gradient(135deg, #1e3a8a, #2563eb)" }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-blue-300/80 text-[10px] font-semibold uppercase tracking-[0.12em]">Bonjour 👋</p>
                  <p className="font-bold text-[17px] leading-tight">{user?.username}</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 border border-yellow-400/25"
                style={{ background: "rgba(234,179,8,0.12)" }}
              >
                <Sparkles className="h-3 w-3 text-yellow-300" />
                <span className="text-[11px] font-bold text-yellow-200">Premium</span>
              </div>
            </div>

            {/* Balance principale */}
            <div className="mb-5">
              <p className="text-blue-300/70 text-[10px] font-semibold uppercase tracking-[0.12em] mb-1">Solde disponible</p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="font-black text-[38px] leading-none tracking-tight"
              >
                {formatCurrency(balance, user?.country)}
              </motion.p>
            </div>

            {/* 2 stats secondaires */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="rounded-2xl p-3.5 border border-white/8"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3 w-3 text-yellow-300/80" />
                  <p className="text-[9px] font-semibold text-blue-200/70 uppercase tracking-wider">Total gagné</p>
                </div>
                <p className="font-black text-[20px] leading-none">{formatCurrency(totalBalance, user?.country)}</p>
              </div>
              <div
                className="rounded-2xl p-3.5 border border-white/8"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-yellow-300/80" />
                  <p className="text-[9px] font-semibold text-blue-200/70 uppercase tracking-wider">Frais d'activation</p>
                </div>
                <p className="font-black text-[20px] leading-none">{activationFee.toLocaleString("fr-FR")} F</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stat cards ────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Total retiré",
              value: formatCurrency(totalWithdrawn, user?.country),
              sub: "Depuis l'inscription",
              icon: ArrowDownCircle,
              topColor: "#f59e0b",
              iconBg: "bg-amber-50",
              iconColor: "text-amber-500",
              i: 1,
            },
            {
              label: "Mes Points",
              value: `${points.toLocaleString()}`,
              sub: "pts convertibles",
              icon: Zap,
              topColor: "#8b5cf6",
              iconBg: "bg-violet-50",
              iconColor: "text-violet-500",
              i: 2,
            },
            {
              label: "Tâches faites",
              value: completedTasks.toLocaleString(),
              sub: "Tâches complétées",
              icon: BadgeDollarSign,
              topColor: "#10b981",
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
              i: 3,
            },
            {
              label: "Total gagné",
              value: formatCurrency(totalBalance, user?.country),
              sub: "MLM + tâches + bonus",
              icon: TrendingUp,
              topColor: "#2563eb",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
              i: 4,
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={rise(s.i)}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-[20px] border border-gray-100/80 shadow-sm overflow-hidden"
            >
              {/* Accent bar */}
              <div className="h-[3px] w-full" style={{ background: s.topColor }} />
              <div className="p-3.5">
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mb-3", s.iconBg)}>
                  <s.icon className={cn("h-4 w-4", s.iconColor)} />
                </div>
                <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className="font-black text-[17px] text-gray-900 leading-tight">{s.value}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Lien de parrainage ───────────────── */}
        <motion.div
          variants={rise(6)}
          initial="hidden"
          animate="visible"
          className="rounded-[24px] overflow-hidden border border-gray-100 shadow-sm"
          style={{ background: "linear-gradient(145deg, #050d1f 0%, #0c1a3d 55%, #1a2f6e 100%)" }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-9 w-9 rounded-[14px] flex items-center justify-center shrink-0 border border-yellow-400/25"
                style={{ background: "rgba(234,179,8,0.15)" }}
              >
                <Gift className="h-4 w-4 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold text-white text-[13px] leading-tight">Mon lien de parrainage</p>
                <p className="text-[10px] text-blue-300/80 font-medium">Jusqu'à 1 300 F par filleul direct</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-blue-400/60 ml-auto shrink-0" />
            </div>

            {/* Lien */}
            <div
              className="rounded-xl px-3 py-2 mb-3 border border-white/8"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="font-mono text-[11px] text-blue-200/80 truncate">{stats?.referralLink || "Chargement…"}</p>
            </div>

            <button
              onClick={handleCopy}
              className={cn(
                "w-full rounded-xl h-10 flex items-center justify-center gap-2 font-bold text-[13px] transition-all active:scale-[0.97]",
                copied
                  ? "bg-emerald-500 text-white"
                  : "text-[#0d1b3e]"
              )}
              style={copied ? {} : { background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
            >
              {copied
                ? <><CheckCircle className="h-4 w-4" /> Copié !</>
                : <><Copy className="h-4 w-4" /> Copier le lien</>
              }
            </button>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
