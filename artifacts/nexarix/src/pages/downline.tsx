import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Users, CheckCircle, XCircle, TrendingUp, Award,
  Copy, Share2, Gift, Trophy, Crown, Zap, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getCurrencyCode } from "@/lib/currency";

const LEVEL_CONFIG = [
  {
    key: "level1" as const,
    label: "Niveau 1",
    short: "Niv. 1",
    commission: 1300,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    earningsKey: "mlmEarningsL1" as const,
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
  },
  {
    key: "level2" as const,
    label: "Niveau 2",
    short: "Niv. 2",
    commission: 700,
    gradient: "from-blue-500 to-indigo-500",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    earningsKey: "mlmEarningsL2" as const,
    activeBg: "bg-gradient-to-br from-blue-500 to-indigo-500",
  },
  {
    key: "level3" as const,
    label: "Niveau 3",
    short: "Niv. 3",
    commission: 400,
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-200",
    earningsKey: "mlmEarningsL3" as const,
    activeBg: "bg-gradient-to-br from-violet-500 to-purple-500",
  },
];

const REFERRAL_BONUS_STEP = 10;
const REFERRAL_BONUS_AMOUNT = 1500;

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export default function Downline() {
  const { user } = useAuth();
  const { data: downline, isLoading } = useGetDownline();
  const { data: dashboard } = useGetDashboard();
  const [activeLevel, setActiveLevel] = useState<"level1" | "level2" | "level3" | "inactive">("level1");
  const { toast } = useToast();

  const counts = {
    level1: downline?.level1.length ?? 0,
    level2: downline?.level2.length ?? 0,
    level3: downline?.level3.length ?? 0,
    inactive: downline?.inactive.length ?? 0,
  };
  const totalActive = counts.level1 + counts.level2 + counts.level3;
  const totalAll = totalActive + counts.inactive;
  const totalEarnings =
    (downline?.mlmEarningsL1 ?? 0) +
    (downline?.mlmEarningsL2 ?? 0) +
    (downline?.mlmEarningsL3 ?? 0);

  const referralLink = dashboard?.referralLink ?? "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: "✅ Lien copié !", description: "Partagez-le pour recruter." });
  };

  const shareLink = () => {
    if (!referralLink) return;
    if (navigator.share) {
      navigator.share({ title: "Rejoins Nexarix", text: "Inscris-toi et gagne des FCFA !", url: referralLink });
    } else {
      copyLink();
    }
  };

  const activeUsers = downline?.[activeLevel] ?? [];
  const activeDirectCount = counts.level1;
  const bonusesEarned = Math.floor(activeDirectCount / REFERRAL_BONUS_STEP);
  const progress = activeDirectCount % REFERRAL_BONUS_STEP;
  const nextMilestone = (bonusesEarned + 1) * REFERRAL_BONUS_STEP;

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">

        {/* ── Hero ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl text-white"
          style={{ background: "linear-gradient(135deg, #0d1b3e 0%, #1a2f6e 40%, #1565C0 100%)" }}
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

          <div className="relative z-10 p-5">
            {/* Title */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-2 ring-white/10">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Réseau MLM</p>
                <p className="text-white font-black text-xl leading-tight">Mon Équipe</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-black text-white">{totalAll}</p>
                <p className="text-blue-300 text-xs font-semibold">membres</p>
              </div>
            </div>

            {/* Level breakdown */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {LEVEL_CONFIG.map(lv => (
                <div key={lv.key} className="rounded-2xl bg-white/10 border border-white/10 p-3 text-center">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1">{lv.short}</p>
                  <p className="text-xl font-black text-white">{counts[lv.key]}</p>
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-300" />
                    <p className="text-[11px] font-bold text-emerald-300">
                      {(downline?.[lv.earningsKey] ?? 0).toLocaleString()} F
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total commissions */}
            <div className="flex items-center justify-between rounded-2xl bg-white/10 border border-white/15 px-4 py-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-300" />
                <p className="text-sm font-bold text-white/90">Total commissions MLM</p>
              </div>
              <p className="font-black text-yellow-300 text-base">{totalEarnings.toLocaleString()} {getCurrencyCode(user?.country)}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Referral Link ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">Lien de parrainage</p>
              <p className="text-[10px] text-gray-400 font-medium">Partagez pour gagner jusqu'à 1 300 F/filleul</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
              <p className="text-xs font-mono text-gray-600 truncate">{referralLink || "Chargement…"}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100 active:scale-95"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={shareLink}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100 active:scale-95"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* ── Bonus filleuls ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl overflow-hidden border border-amber-200 shadow-sm"
          style={{ background: "linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)" }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-yellow-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-200 text-[10px] font-bold uppercase tracking-widest">Bonus Parrainage</p>
                <p className="text-white font-black text-sm leading-tight">
                  +{REFERRAL_BONUS_AMOUNT.toLocaleString()} F tous les {REFERRAL_BONUS_STEP} filleuls actifs
                </p>
              </div>
              {bonusesEarned > 0 && (
                <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2.5 py-1.5 border border-white/20 shrink-0">
                  <Crown className="h-3.5 w-3.5 text-yellow-200" />
                  <span className="text-white font-black text-sm">{(bonusesEarned * REFERRAL_BONUS_AMOUNT).toLocaleString()} F</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <p className="text-white/80 text-xs font-semibold">{progress}/{REFERRAL_BONUS_STEP} filleuls actifs</p>
                <p className="text-yellow-200 text-xs font-black">Palier {nextMilestone}</p>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress / REFERRAL_BONUS_STEP) * 100}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-200"
                />
              </div>
              <p className="text-white/70 text-[10px] font-medium">
                Encore <span className="font-black text-yellow-200">{REFERRAL_BONUS_STEP - progress}</span> filleul{REFERRAL_BONUS_STEP - progress > 1 ? "s" : ""} pour débloquer <span className="font-black text-yellow-200">{REFERRAL_BONUS_AMOUNT.toLocaleString()} F</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Commission Cards ─────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {LEVEL_CONFIG.map((lv, i) => (
            <motion.div
              key={lv.key}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={cn("rounded-2xl border p-3 text-center", lv.bg, lv.border)}
            >
              <div className={cn("h-1.5 w-8 rounded-full bg-gradient-to-r mx-auto mb-2", lv.gradient)} />
              <p className={cn("text-lg font-black", lv.text)}>{lv.commission.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-gray-500">{getCurrencyCode(user?.country)} / {lv.short}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Level Tabs ───────────────────────────── */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            ...LEVEL_CONFIG,
            { key: "inactive" as const, label: "Inactifs", short: "Inactifs", gradient: "from-gray-400 to-gray-500", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", activeBg: "bg-gradient-to-br from-gray-400 to-gray-500" },
          ].map(lv => {
            const isAct = activeLevel === lv.key;
            return (
              <button
                key={lv.key}
                onClick={() => setActiveLevel(lv.key as any)}
                className={cn(
                  "rounded-2xl py-2.5 px-1 text-center border transition-all duration-200 active:scale-95",
                  isAct
                    ? `${lv.activeBg} text-white border-transparent shadow-md`
                    : `bg-white ${lv.text} ${lv.border} hover:shadow-sm`
                )}
              >
                <p className={cn("text-lg font-black", isAct ? "text-white" : lv.text)}>
                  {counts[lv.key as keyof typeof counts]}
                </p>
                <p className={cn("text-[10px] font-bold leading-tight mt-0.5", isAct ? "text-white/80" : "text-gray-500")}>
                  {lv.short}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Member List ──────────────────────────── */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : activeUsers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center"
            >
              <div className="h-16 w-16 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-black text-gray-400 text-base">Aucun membre ici</p>
              <p className="text-sm text-gray-400 mt-1">Partagez votre lien pour recruter</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeLevel}
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-2.5"
            >
              {(activeUsers as any[]).map((u) => {
                const lvCfg = LEVEL_CONFIG.find(l => l.key === activeLevel);
                return (
                  <motion.div
                    key={u.id}
                    variants={itemAnim}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md transition-shadow"
                  >
                    <div className={cn(
                      "h-11 w-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md",
                      `bg-gradient-to-br ${lvCfg?.gradient ?? "from-gray-400 to-gray-500"}`
                    )}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{u.username}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-gray-400 font-medium">{u.country}</span>
                        {u.joinedAt && (
                          <>
                            <span className="text-gray-200 text-xs">·</span>
                            <span className="text-[11px] text-gray-400">
                              {format(new Date(u.joinedAt), "dd/MM/yyyy")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className={cn(
                        "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border",
                        u.status === "active"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        {u.status === "active"
                          ? <><CheckCircle className="h-3 w-3" /> Actif</>
                          : <><XCircle className="h-3 w-3" /> Inactif</>
                        }
                      </div>

                      {activeLevel !== "inactive" && lvCfg && u.status === "active" && (
                        <div className={cn(
                          "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border",
                          lvCfg.bg, lvCfg.text, lvCfg.border
                        )}>
                          <Zap className="h-3 w-3" />
                          +{lvCfg.commission.toLocaleString()} F
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer Summary ───────────────────────── */}
        {totalActive > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 flex items-center gap-3"
          >
            <ChevronRight className="h-5 w-5 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 font-semibold">
              <span className="font-black">{totalActive}</span> membre{totalActive > 1 ? "s" : ""} actif{totalActive > 1 ? "s" : ""} — <span className="font-black">{totalEarnings.toLocaleString()} {getCurrencyCode(user?.country)}</span> de commissions générées
            </p>
          </motion.div>
        )}

      </div>
    </AppLayout>
  );
}
