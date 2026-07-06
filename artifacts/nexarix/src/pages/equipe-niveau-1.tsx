import { motion } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { MemberList } from "@/components/equipe/member-list";
import { Crown, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencyCode } from "@/lib/currency";

const CONFIG = {
  key: "level1" as const,
  label: "Niveau 1",
  commission: 1300,
  color: "#10b981",
  lightBg: "bg-emerald-50",
  lightText: "text-emerald-600",
  lightBorder: "border-emerald-200",
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function EquipeNiveau1() {
  const { user } = useAuth();
  const { data: downline, isLoading } = useGetDownline();
  const currency = getCurrencyCode(user?.country);

  const members = downline?.level1 ?? [];
  const earnings = downline?.mlmEarningsL1 ?? 0;
  const count = members.length;

  return (
    <AppLayout>
      <div className="space-y-4 pb-10">

        {/* Hero */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #10b981 100%)" }}
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/5" />
          <div className="relative z-10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/15 ring-1 ring-white/20">
                  <Crown className="h-5 w-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">Mon Équipe</p>
                  <p className="text-white font-black text-lg leading-tight">Niveau 1</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-3xl leading-none">{count}</p>
                <p className="text-emerald-200 text-[11px] font-semibold mt-0.5">filleul{count > 1 ? "s" : ""} direct{count > 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 p-3 text-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <TrendingUp className="h-3.5 w-3.5 mx-auto mb-1.5 text-yellow-300" />
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">Commission</p>
                <p className="text-white font-black text-xl leading-none">{CONFIG.commission.toLocaleString()}</p>
                <p className="text-emerald-300 text-[10px] font-semibold mt-1">{currency} / filleul actif</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-3 text-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <Users className="h-3.5 w-3.5 mx-auto mb-1.5 text-yellow-300" />
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">Gains générés</p>
                <p className="text-white font-black text-xl leading-none">{earnings.toLocaleString()}</p>
                <p className="text-emerald-300 text-[10px] font-semibold mt-1">{currency} au total</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Liste */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
            {count} membre{count > 1 ? "s" : ""} — Niveau 1
          </p>
          <MemberList
            members={members}
            isLoading={isLoading}
            levelConfig={CONFIG}
            emptyMessage="Parrainez votre premier filleul pour commencer"
          />
        </motion.div>

      </div>
    </AppLayout>
  );
}
