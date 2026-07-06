import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetWithdrawals } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Clock, CheckCircle, XCircle, History, Wallet, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function formatFcfa(amount: number) { return `${amount.toLocaleString("fr-FR")} XOF`; }

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    gradient: "from-amber-400 to-orange-400",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-400",
    icon: Clock,
  },
  paid: {
    label: "Payé",
    gradient: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejeté",
    gradient: "from-red-400 to-rose-500",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600",
    dot: "bg-red-400",
    icon: XCircle,
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const FILTERS: { key: "all" | StatusKey; label: string }[] = [
  { key: "all",      label: "Tous" },
  { key: "pending",  label: "En attente" },
  { key: "paid",     label: "Payés" },
  { key: "rejected", label: "Rejetés" },
];

const card = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function WithdrawalHistory() {
  const { data: withdrawals, isLoading } = useGetWithdrawals();
  const [filter, setFilter] = useState<"all" | StatusKey>("all");

  const filtered = (withdrawals || []).filter(w =>
    filter === "all" ? true : w.status === filter
  );

  const counts = {
    all:      withdrawals?.length || 0,
    pending:  withdrawals?.filter(w => w.status === "pending").length  || 0,
    paid:     withdrawals?.filter(w => w.status === "paid").length     || 0,
    rejected: withdrawals?.filter(w => w.status === "rejected").length || 0,
  };

  const totalPaid = withdrawals
    ?.filter(w => w.status === "paid")
    .reduce((acc, w) => acc + w.amountNet, 0) || 0;

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="rounded-3xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 p-6 text-white relative overflow-hidden shadow-xl shadow-blue-300/30"
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute top-6 right-20 h-5 w-5 rounded-full bg-white/20" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <History className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Mobile Money</p>
                <h1 className="font-black text-2xl leading-tight">Historique</h1>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Total retraits</p>
                <p className="font-black text-xl">{counts.all}</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Total reçu</p>
                <p className="font-black text-xl">{formatFcfa(totalPaid)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(f => {
            const isActive = filter === f.key;
            const cfg = f.key !== "all" ? STATUS_CONFIG[f.key] : null;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-black whitespace-nowrap transition-all border shrink-0",
                  isActive
                    ? cfg
                      ? `bg-gradient-to-r ${cfg.gradient} text-white border-transparent shadow-md`
                      : "bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-transparent shadow-md"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
              >
                {cfg && (
                  <div className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-white/70" : cfg.dot)} />
                )}
                {f.label}
                <span className={cn(
                  "rounded-lg px-1.5 py-0.5 text-[10px] font-black",
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                )}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="font-black text-gray-700">Aucun retrait trouvé</p>
            <p className="text-xs text-gray-400 font-semibold mt-1">
              {filter === "all" ? "Votre historique apparaîtra ici" : "Aucune entrée pour ce filtre"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.map((w, i) => {
                const status = (w.status as StatusKey) in STATUS_CONFIG ? (w.status as StatusKey) : "pending";
                const cfg = STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;
                return (
                  <motion.div
                    key={w.id}
                    custom={i}
                    variants={card}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                    className={cn(
                      "bg-white rounded-3xl border shadow-sm overflow-hidden",
                      cfg.border
                    )}
                  >
                    {/* Status bar top */}
                    <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0",
                          cfg.bg
                        )}>
                          <StatusIcon className={cn("h-5 w-5", cfg.text)} />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-gray-900 text-sm">{w.operator}</span>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-xl border",
                              cfg.bg, cfg.text, cfg.border
                            )}>
                              <div className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-semibold mt-0.5">{w.phone}</p>
                          {w.rejectionReason && (
                            <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                              <XCircle className="h-3 w-3 shrink-0" />
                              {w.rejectionReason}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 font-semibold mt-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {format(new Date(w.createdAt), "dd MMM yyyy · HH:mm")}
                          </p>
                        </div>

                        {/* Amounts */}
                        <div className="text-right shrink-0">
                          <p className="font-black text-gray-900 text-base">{formatFcfa(w.amountGross)}</p>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Frais: {formatFcfa(w.fee)}</p>
                          <p className={cn("text-xs font-black mt-0.5", cfg.text)}>
                            Net: {formatFcfa(w.amountNet)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}

      </div>
    </AppLayout>
  );
}
