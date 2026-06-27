import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Users, MapPin, CheckCircle, XCircle, Network } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LEVELS = [
  { key: "level1", label: "Niveau 1", short: "Niv. 1", gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  { key: "level2", label: "Niveau 2", short: "Niv. 2", gradient: "from-blue-500 to-indigo-500",  bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200" },
  { key: "level3", label: "Niveau 3", short: "Niv. 3", gradient: "from-violet-500 to-purple-500", bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
  { key: "inactive", label: "Inactifs", short: "Inactifs", gradient: "from-gray-400 to-gray-500", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
] as const;

type LevelKey = typeof LEVELS[number]["key"];

function DownlineList({ users, level }: { users: any[]; level: typeof LEVELS[number] }) {
  if (users.length === 0) return (
    <div className="py-10 text-center">
      <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <Users className="h-7 w-7 text-gray-300" />
      </div>
      <p className="text-gray-400 text-sm font-semibold">Aucun membre dans ce niveau</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {users.map((u, i) => (
        <motion.div
          key={u.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          data-testid={`card-downline-${u.id}`}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
        >
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${level.gradient} flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md`}>
            {u.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">{u.username}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 font-semibold">{u.country}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{format(new Date(u.joinedAt), "dd/MM/yyyy")}</span>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border",
            u.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
          )}>
            {u.status === "active"
              ? <><CheckCircle className="h-3 w-3" />Actif</>
              : <><XCircle className="h-3 w-3" />Inactif</>
            }
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Downline() {
  const { data: downline, isLoading } = useGetDownline();
  const [active, setActive] = useState<LevelKey>("level1");

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const counts: Record<LevelKey, number> = {
    level1: downline?.level1.length || 0,
    level2: downline?.level2.length || 0,
    level3: downline?.level3.length || 0,
    inactive: downline?.inactive.length || 0,
  };

  const total = counts.level1 + counts.level2 + counts.level3;
  const activeLevel = LEVELS.find(l => l.key === active)!;
  const users: Record<LevelKey, any[]> = {
    level1: downline?.level1 || [],
    level2: downline?.level2 || [],
    level3: downline?.level3 || [],
    inactive: downline?.inactive || [],
  };

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 p-6 text-white relative overflow-hidden shadow-xl shadow-teal-300/30"
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <Network className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-cyan-100 text-xs font-bold uppercase tracking-wider">Réseau MLM</p>
                <p className="font-black text-2xl leading-tight">Mes Filleuls</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Niveau 1", count: counts.level1, color: "text-emerald-300" },
                { label: "Niveau 2", count: counts.level2, color: "text-blue-300" },
                { label: "Niveau 3", count: counts.level3, color: "text-violet-300" },
              ].map(s => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center backdrop-blur-sm">
                  <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                  <p className="text-white/70 text-xs font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-cyan-100 text-sm font-semibold text-center mt-3">
              {total} membre{total > 1 ? "s" : ""} au total dans votre réseau
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {LEVELS.map(lv => {
            const isActive = active === lv.key;
            return (
              <button
                key={lv.key}
                onClick={() => setActive(lv.key)}
                className={cn(
                  "rounded-2xl p-2.5 text-center transition-all border",
                  isActive
                    ? `bg-gradient-to-br ${lv.gradient} text-white border-transparent shadow-lg`
                    : `bg-white ${lv.text} border-gray-100 hover:border-gray-200`
                )}
              >
                <p className={cn("text-lg font-black", isActive ? "text-white" : lv.text)}>{counts[lv.key]}</p>
                <p className={cn("text-[10px] font-bold", isActive ? "text-white/80" : "text-gray-500")}>{lv.short}</p>
              </button>
            );
          })}
        </div>

        {/* List */}
        <DownlineList users={users[active]} level={activeLevel} />

      </div>
    </AppLayout>
  );
}
