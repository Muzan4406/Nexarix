import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { GraduationCap, Play, FileText, Clock, BookOpen, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  debutant:     { label: "Débutant",     color: "bg-emerald-100 text-emerald-600" },
  intermediaire:{ label: "Intermédiaire",color: "bg-amber-100 text-amber-600" },
  avance:       { label: "Avancé",       color: "bg-red-100 text-red-600" },
};

const CAT_GRADIENT: Record<string, string> = {
  general:   "from-orange-500 to-amber-500",
  marketing: "from-blue-500 to-cyan-500",
  finance:   "from-emerald-500 to-teal-500",
  technique: "from-violet-500 to-purple-500",
};

const card = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

function useFormations() {
  const { token } = useAuth() as any;
  return useQuery({
    queryKey: ["formations"],
    queryFn: async () => {
      const res = await fetch("/api/formations", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });
}

export default function Formations() {
  const { data: formations, isLoading } = useFormations();
  const [filter, setFilter] = useState("all");

  const categories = ["all", ...Array.from(new Set((formations || []).map((f: any) => f.category)))];
  const filtered = filter === "all" ? (formations || []) : (formations || []).filter((f: any) => f.category === filter);

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200">
            <GraduationCap className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-xl leading-tight">Formations</h1>
            <p className="text-xs text-gray-400 font-medium">Apprenez et progressez</p>
          </div>
        </div>

        {/* Filters */}
        {!isLoading && categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  filter === cat
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
                )}
              >
                {cat === "all" ? "Tout" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Formations */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-3xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucune formation disponible</p>
            <p className="text-sm text-gray-400">De nouvelles formations arrivent bientôt !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((formation: any, i: number) => {
              const gradient = CAT_GRADIENT[formation.category] || CAT_GRADIENT.general;
              const levelCfg = LEVEL_CONFIG[formation.level] || { label: formation.level, color: "bg-gray-100 text-gray-500" };
              return (
                <motion.div
                  key={formation.id}
                  custom={i}
                  variants={card}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Thumbnail */}
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md overflow-hidden",
                      formation.thumbnailUrl ? "" : `bg-gradient-to-br ${gradient}`
                    )}>
                      {formation.thumbnailUrl
                        ? <img src={formation.thumbnailUrl} alt={formation.title} className="h-full w-full object-cover" />
                        : <GraduationCap className="h-7 w-7 text-white" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{formation.title}</p>
                          {formation.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{formation.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg", levelCfg.color)}>
                              {levelCfg.label}
                            </span>
                            {formation.duration && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                <Clock className="h-3 w-3" />{formation.duration}
                              </span>
                            )}
                            {formation.isFree ? (
                              <span className="text-[10px] font-black text-emerald-500">GRATUIT</span>
                            ) : (
                              <span className="text-[10px] font-black text-amber-500">PREMIUM</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {/* Price button */}
                        {formation.price && formation.price > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                            <Tag className="h-3 w-3" />
                            {formation.price.toLocaleString("fr-FR")} FCFA
                          </span>
                        )}
                        {formation.videoUrl && (
                          <a
                            href={formation.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm hover:shadow-md transition-all"
                          >
                            <Play className="h-3 w-3" />
                            Vidéo
                          </a>
                        )}
                        {formation.contentUrl && (
                          <a
                            href={formation.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:shadow-md transition-all"
                          >
                            <FileText className="h-3 w-3" />
                            Document
                          </a>
                        )}
                        {!formation.videoUrl && !formation.contentUrl && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-400">
                            Bientôt disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
