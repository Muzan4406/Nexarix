import { motion } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { MemberList } from "@/components/equipe/member-list";
import { UserX, AlertCircle } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function EquipeInactifs() {
  const { data: downline, isLoading } = useGetDownline();

  const members = downline?.inactive ?? [];
  const count = members.length;

  return (
    <AppLayout>
      <div className="space-y-4 pb-10">

        {/* Hero */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #1f2937 0%, #374151 55%, #6b7280 100%)" }}
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/5" />
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/15 ring-1 ring-white/20">
                  <UserX className="h-5 w-5 text-gray-300" />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Mon Équipe</p>
                  <p className="text-white font-black text-lg leading-tight">Membres Inactifs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-3xl leading-none">{count}</p>
                <p className="text-gray-400 text-[11px] font-semibold mt-0.5">inactif{count > 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conseil */}
        {count > 0 && (
          <motion.div
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-800">Membres non activés</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5 leading-snug">
                Ces membres ne génèrent pas encore de commissions. Encouragez-les à activer leur compte pour débloquer vos gains.
              </p>
            </div>
          </motion.div>
        )}

        {/* Liste */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
            {count} membre{count > 1 ? "s" : ""} inactif{count > 1 ? "s" : ""}
          </p>
          <MemberList
            members={members}
            isLoading={isLoading}
            emptyMessage="Tous vos filleuls sont actifs 🎉"
            showCommission={false}
          />
        </motion.div>

      </div>
    </AppLayout>
  );
}
