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

const slideUp = (i: number) => ({
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
});

const slideLeft = (i: number) => ({
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      type: "spring" as const,
      stiffness: 260,
      damping: 22,
    },
  },
});

const slideRight = (i: number) => ({
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      type: "spring" as const,
      stiffness: 260,
      damping: 22,
    },
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
          variants={slideUp(0)} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-[26px] text-white"
          style={{ background: "linear-gradient(145deg, #050d1f 0%, #0c1a3d 45%, #1248a8 100%)" }}
        >
          <div className="pointer-events-none absolute -top-14 -right-14 h-52 w-52 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(99,155,255,0.2) 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute top-8 right-28 h-2 w-2 rounded-full bg-yellow-400/50" />
          <div className="pointer-events-none absolute top-16 right-12 h-1.5 w-1.5 rounded-full bg-blue-300/60" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

          <div className="relative z-10 p-5">
            {/* Nom + badge */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <motion.div
                  variants={slideLeft(1)}
                  initial="hidden"
                  animate="visible"
                  className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-lg ring-2 ring-white/10"
                  style={{ background: "linear-gradient(135deg, #1e3a8a, #2563eb)" }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </motion.div>
                <motion.div variants={slideLeft(1.5)} initial="hidden" animate="visible">
                  <p className="text-blue-300/80 text-[10px] font-semibold uppercase tracking-[0.14em] mb-0.5">
                    Bienvenue sur Nexarix
                  </p>
                  <p className="font-bold text-[17px] leading-tight">{user?.username}</p>
                </motion.div>
              </div>
              <motion.div
                variants={slideRight(1)}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border border-yellow-400/25"
                style={{ background: "rgba(234,179,8,0.12)" }}
              >
                <Sparkles className="h-3 w-3 text-yellow-300" />
                <span className="text-[11px] font-bold text-yellow-200">Premium</span>
              </motion.div>
            </div>

            {/* Balance principale */}
            <motion.div
              variants={slideUp(1)}
              initial="hidden"
              animate="visible"
              className="mb-5"
            >
              <p className="text-blue-300/70 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1">Solde disponible</p>
              <p className="font-black text-[40px] leading-none tracking-tight">
                {formatCurrency(balance, user?.country)}
              </p>
            </motion.div>

            {/* 2 stats secondaires */}
            <div className="grid grid-cols-2 gap-2.5">
              <motion.div
                variants={slideLeft(2)}
                initial="hidden"
                animate="visible"
                className="rounded-2xl p-3.5 border border-white/8"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3 w-3 text-yellow-300/80" />
                  <p className="text-[9px] font-semibold text-blue-200/70 uppercase tracking-wider">Total gagné</p>
                </div>
                <p className="font-black text-[20px] leading-none">{formatCurrency(totalBalance, user?.country)}</p>
              </motion.div>
              <motion.div
                variants={slideRight(2)}
                initial="hidden"
                animate="visible"
                className="rounded-2xl p-3.5 border border-white/8"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-yellow-300/80" />
                  <p className="text-[9px] font-semibold text-blue-200/70 uppercase tracking-wider">Frais d'activation</p>
                </div>
                <p className="font-black text-[20px] leading-none">{activationFee.toLocaleString("fr-FR")} F</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Stat cards ────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Solde disponible",
              value: formatCurrency(balance, user?.country),
              sub: "Retirable maintenant",
              icon: Wallet,
              bg: "#dcfce7",
              iconBg: "#16a34a",
              labelColor: "#166534",
              valueColor: "#14532d",
              subColor: "#4ade80",
              i: 1,
            },
            {
              label: "Total retiré",
              value: formatCurrency(totalWithdrawn, user?.country),
              sub: "Depuis l'inscription",
              icon: ArrowDownCircle,
              bg: "#ffedd5",
              iconBg: "#ea580c",
              labelColor: "#9a3412",
              valueColor: "#7c2d12",
              subColor: "#fb923c",
              i: 2,
            },
            {
              label: "Mes Points",
              value: `${points.toLocaleString()} pts`,
              sub: "Convertibles en FCFA",
              icon: Zap,
              bg: "#f3e8ff",
              iconBg: "#7c3aed",
              labelColor: "#6b21a8",
              valueColor: "#4c1d95",
              subColor: "#a78bfa",
              i: 3,
            },
            {
              label: "Tâches faites",
              value: completedTasks.toLocaleString(),
              sub: "Tâches complétées",
              icon: BadgeDollarSign,
              bg: "#dbeafe",
              iconBg: "#2563eb",
              labelColor: "#1e40af",
              valueColor: "#1e3a8a",
              subColor: "#60a5fa",
              i: 4,
            },
          ].map((s, idx) => (
            <motion.div
              key={s.label}
              variants={idx % 2 === 0 ? slideLeft(s.i) : slideRight(s.i)}
              initial="hidden"
              animate="visible"
              className="rounded-[20px] overflow-hidden shadow-sm"
              style={{ background: s.bg }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: s.labelColor }}>
                    {s.label}
                  </p>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: s.iconBg }}
                  >
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="font-black text-[18px] leading-tight mb-0.5" style={{ color: s.valueColor }}>
                  {s.value}
                </p>
                <p className="text-[10px] font-medium" style={{ color: s.subColor }}>{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Lien de parrainage ───────────────── */}
        <motion.div
          variants={slideUp(5)}
          initial="hidden"
          animate="visible"
          className="rounded-[24px] overflow-hidden border border-gray-100 shadow-sm"
          style={{ background: "linear-gradient(145deg, #050d1f 0%, #0c1a3d 55%, #1a2f6e 100%)" }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                variants={slideLeft(5.5)}
                initial="hidden"
                animate="visible"
                className="h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0 border border-yellow-400/25"
                style={{ background: "rgba(234,179,8,0.15)" }}
              >
                <Gift className="h-4.5 w-4.5 text-yellow-300" />
              </motion.div>
              <motion.div variants={slideLeft(6)} initial="hidden" animate="visible">
                <p className="font-bold text-white text-[13px] leading-tight">Mon lien de parrainage</p>
                <p className="text-[10px] text-blue-300/80 font-medium">Jusqu'à 1 300 F par filleul direct</p>
              </motion.div>
              <ArrowUpRight className="h-4 w-4 text-blue-400/60 ml-auto shrink-0" />
            </div>

            <div
              className="rounded-xl px-3 py-2.5 mb-3 border border-white/8"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="font-mono text-[11px] text-blue-200/80 truncate">{stats?.referralLink || "Chargement…"}</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              className={cn(
                "w-full rounded-xl h-11 flex items-center justify-center gap-2 font-bold text-[13px] transition-colors",
                copied
                  ? "bg-emerald-500 text-white"
                  : "text-[#0d1b3e]"
              )}
              style={copied ? {} : { background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
            >
              {copied
                ? <><CheckCircle className="h-4 w-4" /> Copié !</>
                : <><Copy className="h-4 w-4" /> Copier mon lien de parrainage</>
              }
            </motion.button>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
