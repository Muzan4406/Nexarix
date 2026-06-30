import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Users, CheckCircle, XCircle, Crown, Star, Zap,
  UserX, TrendingUp, Trophy, Award, ChevronRight,
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
    color: "#10b981",
    bg: "bg-emerald-500",
    lightBg: "bg-emerald-50",
    lightText: "text-emerald-600",
    lightBorder: "border-emerald-200",
    earningsKey: "mlmEarningsL1" as const,
    icon: Crown,
  },
  {
    key: "level2" as const,
    label: "Niveau 2",
    short: "Niv. 2",
    commission: 600,
    color: "#3b82f6",
    bg: "bg-blue-500",
    lightBg: "bg-blue-50",
    lightText: "text-blue-600",
    lightBorder: "border-blue-200",
    earningsKey: "mlmEarningsL2" as const,
    icon: Star,
  },
  {
    key: "level3" as const,
    label: "Niveau 3",
    short: "Niv. 3",
    commission: 300,
    color: "#8b5cf6",
    bg: "bg-violet-500",
    lightBg: "bg-violet-50",
    lightText: "text-violet-600",
    lightBorder: "border-violet-200",
    earningsKey: "mlmEarningsL3" as const,
    icon: Zap,
  },
];

const BONUS_STEP = 10;
const BONUS_AMOUNT = 1500;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

const listStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const listItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
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

  const earningsL1    = downline?.mlmEarningsL1 ?? 0;
  const earningsL2    = downline?.mlmEarningsL2 ?? 0;
  const earningsL3    = downline?.mlmEarningsL3 ?? 0;
  const totalEarnings = earningsL1 + earningsL2 + earningsL3;
  const totalActive   = counts.level1 + counts.level2 + counts.level3;
  const totalAll      = totalActive + counts.inactive;
  const currency      = getCurrencyCode(user?.country);

  const bonusEarned   = Math.floor(counts.level1 / BONUS_STEP);
  const bonusProgress = counts.level1 % BONUS_STEP;

  const activeUsers  = downline?.[activeLevel] ?? [];
  const activeLvCfg  = LEVEL_CONFIG.find(l => l.key === activeLevel);

  const tabs = [
    ...LEVEL_CONFIG,
    {
      key: "inactive" as const,
      label: "Inactifs",
      short: "Inactifs",
      commission: 0,
      color: "#9ca3af",
      bg: "bg-gray-400",
      lightBg: "bg-gray-50",
      lightText: "text-gray-500",
      lightBorder: "border-gray-200",
      icon: UserX,
    },
  ];

  const levelEarnings = [earningsL1, earningsL2, earningsL3];

  return (
    <AppLayout>
      <div className="space-y-4 pb-10">

        {/* ══ HERO CARD ══════════════════════════════════════════════ */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #0a1628 0%, #112154 50%, #1a3a8f 100%)" }}
        >
          {/* Déco circles */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-6 right-28 h-3 w-3 rounded-full bg-yellow-400/40" />
          <div className="pointer-events-none absolute top-14 right-16 h-2 w-2 rounded-full bg-blue-300/50" />

          <div className="relative z-10 p-5 space-y-5">

            {/* Titre */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/10 ring-1 ring-white/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Réseau MLM</p>
                  <p className="text-white font-black text-lg leading-tight">Mon Équipe</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-3xl leading-none">{totalAll}</p>
                <p className="text-blue-300 text-[11px] font-semibold mt-0.5">membres au total</p>
              </div>
            </div>

            {/* Stats par niveau */}
            <div className="grid grid-cols-3 gap-2">
              {LEVEL_CONFIG.map((lv, i) => {
                const LvIcon = lv.icon;
                return (
                  <div key={lv.key} className="rounded-2xl border border-white/10 bg-white/8 p-3 text-center backdrop-blur-sm"
                    style={{ background: "rgba(255,255,255,0.07)" }}>
                    <LvIcon className="h-3.5 w-3.5 mx-auto mb-1.5 text-yellow-300" />
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider mb-1">{lv.short}</p>
                    <p className="text-white font-black text-2xl leading-none">{counts[lv.key]}</p>
                    <p className="text-emerald-300 text-[10px] font-bold mt-1.5">
                      {levelEarnings[i].toLocaleString()} F
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Total commissions */}
            <div className="flex items-center justify-between rounded-2xl border border-white/15 px-4 py-3"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-300" />
                <span className="text-white/85 text-sm font-bold">Total commissions MLM</span>
              </div>
              <span className="text-yellow-300 font-black text-base">
                {totalEarnings.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ══ BARÈME COMMISSIONS ═════════════════════════════════════ */}
        <motion.div
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0a1628, #1a3a8f)" }}>
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Barème des commissions</p>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2.5">
            {LEVEL_CONFIG.map((lv) => {
              const LvIcon = lv.icon;
              return (
                <div key={lv.key} className={cn("rounded-2xl border p-3.5 text-center", lv.lightBg, lv.lightBorder)}>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                    style={{ background: `${lv.color}20` }}>
                    <LvIcon className="h-4 w-4" style={{ color: lv.color }} />
                  </div>
                  <p className="font-black text-xl leading-none" style={{ color: lv.color }}>
                    {lv.commission.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{currency}</p>
                  <div className={cn("mt-2 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider", lv.lightText)}
                    style={{ background: `${lv.color}15` }}>
                    {lv.short}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ══ BONUS PROGRESSION ══════════════════════════════════════ */}
        <motion.div
          custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 55%, #ea580c 100%)" }}
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative z-10 p-4">
            <div className="flex items-start gap-3 mb-3.5">
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-white/20 shrink-0">
                <Trophy className="h-5 w-5 text-yellow-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-orange-200 text-[10px] font-bold uppercase tracking-widest">Bonus Parrainage</p>
                <p className="text-white font-black text-sm leading-snug">
                  +{BONUS_AMOUNT.toLocaleString()} {currency} tous les {BONUS_STEP} filleuls actifs
                </p>
              </div>
              {bonusEarned > 0 && (
                <div className="shrink-0 bg-white/20 border border-white/25 rounded-xl px-3 py-1.5 flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-yellow-200" />
                  <span className="text-white font-black text-sm">{(bonusEarned * BONUS_AMOUNT).toLocaleString()} F</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-white/75 text-xs font-semibold">{bonusProgress} / {BONUS_STEP} filleuls</p>
                <p className="text-yellow-200 text-xs font-black">Palier {(bonusEarned + 1) * BONUS_STEP}</p>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(bonusProgress / BONUS_STEP) * 100}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-200"
                />
              </div>
              <p className="text-white/65 text-[10px] font-medium">
                Plus que{" "}
                <span className="font-black text-yellow-200">{BONUS_STEP - bonusProgress}</span>
                {" "}filleul{BONUS_STEP - bonusProgress > 1 ? "s" : ""} pour débloquer{" "}
                <span className="font-black text-yellow-200">{BONUS_AMOUNT.toLocaleString()} {currency}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ══ ONGLETS NIVEAU ═════════════════════════════════════════ */}
        <motion.div
          custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="grid grid-cols-4 gap-2"
        >
          {tabs.map((lv) => {
            const isAct = activeLevel === lv.key;
            const TabIcon = lv.icon;
            return (
              <button
                key={lv.key}
                onClick={() => setActiveLevel(lv.key as any)}
                className={cn(
                  "rounded-2xl py-3 px-1 text-center border transition-all duration-200 active:scale-95 select-none",
                  isAct ? "border-transparent shadow-lg" : cn("bg-white", lv.lightBorder, "hover:shadow-sm")
                )}
                style={isAct ? { background: `linear-gradient(135deg, ${lv.color}ee, ${lv.color}aa)` } : {}}
              >
                <TabIcon className={cn("h-4 w-4 mx-auto mb-1", isAct ? "text-white/90" : lv.lightText)} />
                <p className={cn("text-lg font-black leading-none", isAct ? "text-white" : lv.lightText)}>
                  {counts[lv.key as keyof typeof counts]}
                </p>
                <p className={cn("text-[9px] font-bold mt-0.5 uppercase tracking-wide", isAct ? "text-white/70" : "text-gray-400")}>
                  {lv.short}
                </p>
              </button>
            );
          })}
        </motion.div>

        {/* ══ LISTE MEMBRES ══════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : activeUsers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center"
            >
              <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-black text-gray-700 text-base">Aucun membre ici</p>
              <p className="text-sm text-gray-400 mt-1.5 font-medium">
                {activeLevel === "inactive"
                  ? "Tous vos filleuls sont actifs 🎉"
                  : "Votre réseau de ce niveau est vide pour l'instant"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeLevel}
              variants={listStagger}
              initial="hidden"
              animate="visible"
              className="space-y-2.5"
            >
              {(activeUsers as any[]).map((u) => {
                const isActive = u.status === "active";
                return (
                  <motion.div
                    key={u.id}
                    variants={listItem}
                    className="flex items-center gap-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Avatar initiale */}
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-sm"
                      style={
                        activeLvCfg
                          ? { background: `linear-gradient(135deg, ${activeLvCfg.color}, ${activeLvCfg.color}88)` }
                          : { background: "#9ca3af" }
                      }
                    >
                      {u.username?.[0]?.toUpperCase()}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{u.username}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {u.country && (
                          <span className="text-[11px] text-gray-400 font-medium">{u.country}</span>
                        )}
                        {u.joinedAt && (
                          <>
                            {u.country && <span className="text-gray-200 text-xs">·</span>}
                            <span className="text-[11px] text-gray-400">
                              {format(new Date(u.joinedAt), "dd/MM/yy")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Droite */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className={cn(
                        "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border",
                        isActive
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                      )}>
                        {isActive
                          ? <><CheckCircle className="h-3 w-3" /> Actif</>
                          : <><XCircle className="h-3 w-3" /> Inactif</>
                        }
                      </div>
                      {activeLevel !== "inactive" && activeLvCfg && isActive && (
                        <div
                          className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border"
                          style={{
                            background: `${activeLvCfg.color}10`,
                            color: activeLvCfg.color,
                            borderColor: `${activeLvCfg.color}30`,
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

        {/* ══ RÉSUMÉ BAS ═════════════════════════════════════════════ */}
        {totalActive > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="h-8 w-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-xs text-slate-600 font-semibold leading-snug">
              <span className="font-black text-slate-800">{totalActive}</span> membre{totalActive > 1 ? "s" : ""} actif{totalActive > 1 ? "s" : ""} dans votre réseau —{" "}
              <span className="font-black text-slate-800">{totalEarnings.toLocaleString()} {currency}</span> de commissions générées
            </p>
          </motion.div>
        )}

      </div>
    </AppLayout>
  );
}
