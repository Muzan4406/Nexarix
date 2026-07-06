import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingBag, Download, Lock, Star, Package, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<string, string> = {
  app:     "from-purple-500 to-fuchsia-500",
  game:    "from-blue-500 to-cyan-500",
  tool:    "from-emerald-500 to-teal-500",
  other:   "from-gray-400 to-gray-500",
};

const card = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

function useStoreItems() {
  const { token } = useAuth() as any;
  return useQuery({
    queryKey: ["store-items"],
    queryFn: async () => {
      const res = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });
}

export default function Store() {
  const { data: items, isLoading } = useStoreItems();
  const [filter, setFilter] = useState("all");

  const categories = ["all", ...Array.from(new Set((items || []).map((i: any) => i.category)))];
  const filtered = filter === "all" ? (items || []) : (items || []).filter((i: any) => i.category === filter);

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-purple-200">
              <ShoppingBag className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-xl leading-tight">Store Premium</h1>
              <p className="text-xs text-gray-400 font-medium">Applications & outils exclusifs</p>
            </div>
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
                    ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-200"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
                )}
              >
                {cat === "all" ? "Tout" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-3xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucun article disponible</p>
            <p className="text-sm text-gray-400">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((item: any, i: number) => {
              const gradient = LEVEL_COLORS[item.category] || LEVEL_COLORS.other;
              return (
                <motion.div
                  key={item.id}
                  custom={i}
                  variants={card}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Thumbnail or icon */}
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md overflow-hidden",
                      item.thumbnailUrl ? "" : `bg-gradient-to-br ${gradient}`
                    )}>
                      {item.thumbnailUrl
                        ? <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                        : <ShoppingBag className="h-7 w-7 text-white" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-lg border-purple-200 text-purple-600">
                              {item.fileType?.toUpperCase() || "APK"}
                            </Badge>
                            {item.version && (
                              <span className="text-[10px] text-gray-400 font-medium">v{item.version}</span>
                            )}
                            {item.fileSize && (
                              <span className="text-[10px] text-gray-400 font-medium">{item.fileSize}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {item.isFree ? (
                            <span className="text-xs font-black text-emerald-500">GRATUIT</span>
                          ) : (
                            <span className="text-sm font-black text-gray-800">{item.price?.toLocaleString()} FCFA</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        {item.downloadUrl ? (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 transition-all"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Télécharger
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-400">
                            <Lock className="h-3.5 w-3.5" />
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
