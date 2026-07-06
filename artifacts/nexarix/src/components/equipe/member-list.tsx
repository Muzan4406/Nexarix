import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Users, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const listStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const listItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

interface LevelConfig {
  color: string;
  commission: number;
  key: string;
}

interface MemberListProps {
  members: any[];
  isLoading: boolean;
  levelConfig?: LevelConfig;
  emptyMessage?: string;
  showCommission?: boolean;
}

export function MemberList({
  members,
  isLoading,
  levelConfig,
  emptyMessage = "Votre réseau est vide pour l'instant",
  showCommission = true,
}: MemberListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-16 text-center"
      >
        <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-slate-300" />
        </div>
        <p className="font-black text-gray-700 text-base">Aucun membre ici</p>
        <p className="text-sm text-gray-400 mt-1.5 font-medium">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="list"
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="space-y-2.5"
      >
        {members.map((u: any) => {
          const isActive = u.status === "active";
          return (
            <motion.div
              key={u.id}
              variants={listItem}
              className="flex items-center gap-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-sm"
                style={
                  levelConfig
                    ? { background: `linear-gradient(135deg, ${levelConfig.color}, ${levelConfig.color}88)` }
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
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border",
                    isActive
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  )}
                >
                  {isActive ? (
                    <><CheckCircle className="h-3 w-3" /> Actif</>
                  ) : (
                    <><XCircle className="h-3 w-3" /> Inactif</>
                  )}
                </div>
                {showCommission && levelConfig && isActive && (
                  <div
                    className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border"
                    style={{
                      background: `${levelConfig.color}10`,
                      color: levelConfig.color,
                      borderColor: `${levelConfig.color}30`,
                    }}
                  >
                    <Zap className="h-3 w-3" />
                    +{levelConfig.commission.toLocaleString()} F
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
