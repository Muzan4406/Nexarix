import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Users, CheckCircle, XCircle, Award, Trophy,
  Crown, Zap, Star, TrendingUp, UserCheck, UserX,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencyCode } from "@/lib/currency";

const LEVEL_CONFIG = [
  {
    key: "level1" as const,
    label: "Niveau 1",
    short: "Niv. 1",
    commission: 1300,
    color: "#059669",
    gradient: "from-emerald-500 to-teal-500",
    softBg: "bg-emerald-50",
    softText: "text-emerald-700",
    softBorder: "border-emerald-200",
    earningsKey: "mlmEarningsL1" as const,
    icon: Crown,
  },
  {
    key: "level2" as const,
    label: "Niveau 2",
    short: "Niv. 2",
    commission: 600,
    color: "#1565C0",
    gradient: "from-blue-500 to-indigo-500",
    softBg: "bg-blue-50",
    softText: "text-blue-700",
    softBorder: "border-blue-200",
    earningsKey: "mlmEarningsL2" as const,
    icon: Star,
  },
  {
    key: "level3" as const,
    label: "Niveau 3",
    short: "Niv. 3",
    commission: 300,
    color: "#7c3aed",
    gradient: "from-violet-500 to-purple-500",
    softBg: "bg-violet-50",
    softText: "text-violet-700",
    softBorder: "border-violet-200",
    earningsKey: "mlmEarningsL3" as const,
    icon: Zap,
  },
];

const BONUS_STEP = 10;
const BONUS_AMOUNT = 1500;

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.055 } } };
const rowAnim = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

export default function Downline() {
  const { user } = useAuth();
  const { data: downline, isLoading } = useGetDownline();
  const [activeLevel, setActiveLevel] = useState<"level1" | "level2" | "level3" | "inactive">("level1");

  const counts = {
    level1:   downline?.level1.length   ?? 0,
    level2:   downline?.level2.length   ?? 0,
    level3:   downline?.level3.length   ?? 0,
    inactive: downline?.inactive.length ?? 0,
  };
  const totalActive   = counts.level1 + counts.level2 + counts.level3;
  const totalAll      = totalActive + counts.inactive;
  const earningsL1    = downline?.mlmEarningsL1 ?? 0;
  const earningsL2    = downline?.mlmEarningsL2 ?? 0;
  const earningsL3    = downline?.mlmEarningsL3 ?? 0;
  const totalEarnings = earningsL1 + earningsL2 + earningsL3;
  const currency      = getCurrencyCode(user?.country);

  const bonusEarned = Math.floor(counts.level1 / BONUS_STEP);
  const bonusProgress = counts.level1 % BONUS_STEP;

  const activeUsers = downline?.[activeLevel] ?? [];
  const activeLvCfg = LEVEL_CONFIG.find(l => l.key === activeLevel);

  const tabsAll = [
    ...LEVEL_CONFIG,
    {
      key: "inactive" as const,
      label: "Inactifs",
      short: "Inactifs",
      gradient: "from-gray-400 to-gray-500",
      softBg: "bg-gray-50",
      softText: "text-gray-500",
      softBorder: "border-gray-200",
      commission: 0,
      color: "#9ca3af",
      icon: UserX,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-4 pb-8">

        {/* ═══ HERO ════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl text-white"
          style={{ background: "linear-gradient(135deg, #060d1f 0%, #0d1b3e 45%, #1565C0 100%)" }}
        >
          {/* blobs déco */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-8 right-24 h-4 w-4 rounded-full bg-yellow-400/25" />
          <div className="pointer-events-none absolute top-20 right-12 h-2.5 w-2.5 rounded-full bg-yellow-400/35" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-white/5" />

          <div className="relative z-10 p-5">

            {/* Titre + compteur global */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ring-2 ring-white/15"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Réseau MLM</p>
                <p className="font-black text-xl text-white leading-tight">Mon Équipe</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-3xl text-white leading-none">{totalAll}</p>
                <p className="text-blue-300 text-[11px] font-semibold mt-0.5">membres</p>
              </div>
            </div>

            {/* Cards par niveau */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {LEVEL_CONFIG.map(lv => {
                const LvIcon = lv.icon;
                return (
                  <div key={lv.key}
                    className="rounded-2xl p-3 text-center border border-white/10"
                    style={{ background: "rgba(255,255,255,0.09)" }}>
                    <div className="flex items-center justify-center gap-1 mb-1.5">
                      <LvIcon className="h-3 w-3 text-yellow-300" />
                      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">{lv.short}</p>
                    </div>
                    <p className="text-2xl font-black text-white">{counts[lv.key]}</p>
                    <p className="text-emerald-300 text-[11px] font-bold mt-1">
                      {(lv.key === "level1" ? earningsL1 : lv.key === "level2" ? earningsL2 : earningsL3).toLocaleString()} F
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Barre total gains */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-3 border border-white/15"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-300" />
                <p className="text-sm font-bold text-white/90">Total commissions MLM</p>
              </div>
              <p className="font-black text-yellow-300 text-base">{totalEarnings.toLocaleString()} {currency}</p>
            </div>
          </div>
        </motion.div>

        {/* ═══ BARÈME COMMISSIONS ══════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0d1b3e, #1565C0)" }}>
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Barème des commissions</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_CONFIG.map((lv, i) => {
              const LvIcon = lv.icon;
              return (
                <div key={lv.key}
                  className={cn("rounded-2xl border p-3 text-center", lv.softBg, lv.softBorder)}>
                  <div className="flex items-center justify-center mb-2">
                    <LvIcon className="h-4 w-4" style={{ color: lv.color }} />
                  </div>
                  <p className="font-black text-lg leading-none" style={{ color: lv.color }}>
                    {lv.commission.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">{currency} · {lv.short}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ BONUS PROGRESSION ═══════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl text-white"
          style={{ background: "linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)" }}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 bg-white/20">
                <Trophy className="h-5 w-5 text-yellow-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-200 text-[10px] font-bold uppercase tracking-widest">Bonus Parrainage</p>
                <p className="text-white font-black text-sm leading-snug">
                  +{BONUS_AMOUNT.toLocaleString()} F tous les {BONUS_STEP} filleuls actifs
                </p>
              </div>
              {bonusEarned > 0 && (
                <div className="flex items-center gap-1 bg-white/20 border border-white/25 rounded-xl px-2.5 py-1.5 shrink-0">
                  <Crown className="h-3.5 w-3.5 text-yellow-200" />
                  <span className="text-white font-black text-sm">{(bonusEarned * BONUS_AMOUNT).toLocaleString()} F</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-white/80 text-xs font-semibold">{bonusProgress}/{BONUS_STEP} filleuls actifs</p>
                <p className="text-yellow-200 text-xs font-black">Palier {(bonusEarned + 1) * BONUS_STEP}</p>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(bonusProgress / BONUS_STEP) * 100}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-200"
                />
              </div>
              <p className="text-white/70 text-[10px] font-medium">
                Encore{" "}
                <span className="font-black text-yellow-200">{BONUS_STEP - bonusProgress}</span>
                {" "}filleul{BONUS_STEP - bonusProgress > 1 ? "s" : ""} pour débloquer{" "}
                <span className="font-black text-yellow-200">{BONUS_AMOUNT.toLocaleString()} F</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══ ONGLETS ═════════════════════════════════════ */}
        <div className="grid grid-cols-4 gap-1.5">
          {tabsAll.map(lv => {
            const isAct = activeLevel === lv.key;
            const TabIcon = lv.icon;
            return (
              <button
                key={lv.key}
                onClick={() => setActiveLevel(lv.key as any)}
                className={cn(
                  "rounded-2xl py-2.5 px-1 text-center border transition-all duration-200 active:scale-95 select-none",
                  isAct
                    ? "text-white border-transparent shadow-md"
                    : cn("bg-white", lv.softText, lv.softBorder, "hover:shadow-sm")
                )}
                style={isAct ? { background: `linear-gradient(135deg, ${lv.color}, ${lv.color}cc)` } : {}}
              >
                <TabIcon className={cn("h-4 w-4 mx-auto mb-0.5", isAct ? "text-white/90" : lv.softText)} />
                <p className={cn("text-base font-black leading-none", isAct ? "text-white" : lv.softText)}>
                  {counts[lv.key as keyof typeof counts]}
                </p>
                <p className={cn("text-[10px] font-bold mt-0.5 leading-tight", isAct ? "text-white/75" : "text-gray-400")}>
                  {lv.short}
                </p>
              </button>
            );
          })}
        </div>

        {/* ═══ LISTE MEMBRES ════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[72px] rounded-2xl bg-white border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : activeUsers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center"
            >
              <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-black text-gray-400 text-base">Aucun membre ici</p>
              <p className="text-sm text-gray-400 mt-1 font-medium">
                {activeLevel === "inactive"
                  ? "Tous vos filleuls sont actifs 🎉"
                  : "Recrutez via votre lien sur le tableau de bord"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeLevel}
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {(activeUsers as any[]).map((u) => {
                const isActive = u.status === "active";
                return (
                  <motion.div
                    key={u.id}
                    variants={rowAnim}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md transition-all"
                  >
                    {/* Avatar */}
                    <div
                      className="h-11 w-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-sm"
                      style={
                        activeLvCfg
                          ? { background: `linear-gradient(135deg, ${activeLvCfg.color}, ${activeLvCfg.color}99)` }
                          : { background: "#9ca3af" }
                      }
                    >
                      {u.username?.[0]?.toUpperCase()}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{u.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {u.country && (
                          <span className="text-[11px] text-gray-400 font-medium">{u.country}</span>
                        )}
                        {u.joinedAt && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-[11px] text-gray-400">
                              {format(new Date(u.joinedAt), "dd/MM/yy")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges droite */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Statut */}
                      <div className={cn(
                        "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border",
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        {isActive
                          ? <><CheckCircle className="h-3 w-3" /> Actif</>
                          : <><XCircle className="h-3 w-3" /> Inactif</>
                        }
                      </div>

                      {/* Commission */}
                      {activeLevel !== "inactive" && activeLvCfg && isActive && (
                        <div
                          className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border"
                          style={{
                            background: `${activeLvCfg.color}12`,
                            color: activeLvCfg.color,
                            borderColor: `${activeLvCfg.color}35`,
                          }}
                        >
                          <Zap className="h-3 w-3" />
                          +{activeLvCfg.commission.toLocaleString()} F
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ RÉSUMÉ BAS ══════════════════════════════════ */}
        {totalActive > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3"
          >
            <UserCheck className="h-5 w-5 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-600 font-semibold">
              <span className="font-black text-slate-800">{totalActive}</span> membre{totalActive > 1 ? "s" : ""} actif{totalActive > 1 ? "s" : ""} dans votre réseau —{" "}
              <span className="font-black text-slate-800">{totalEarnings.toLocaleString()} {currency}</span> de commissions générées
            </p>
          </motion.div>
        )}

      </div>
    </AppLayout>
  );
}
