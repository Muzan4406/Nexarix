import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LayoutGrid, ExternalLink, Sparkles } from "lucide-react";

const fadeUp = (i: number) => ({
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
});

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-100 rounded-full w-2/3" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-8 bg-gray-100 rounded-2xl w-1/2 mt-2" />
      </div>
    </div>
  );
}

export default function Services() {
  const { token } = useAuth() as any;

  const { data: items, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await fetch("/api/services", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });

  return (
    <AppLayout>
      <div className="space-y-5 pb-4">

        {/* ── Hero Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-sky-200"
        >
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute top-4 right-16 h-12 w-12 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
              <LayoutGrid className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="font-black text-2xl leading-tight tracking-tight">Divers</h1>
                <Sparkles className="h-4 w-4 text-sky-200" />
              </div>
              <p className="text-sky-100 text-sm font-medium">
                Services & ressources sélectionnés pour vous
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : !items?.length ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <LayoutGrid className="h-10 w-10 text-sky-300" />
            </div>
            <p className="font-black text-gray-700 text-xl mb-2">Bientôt disponible</p>
            <p className="text-sm text-gray-400 max-w-xs">
              L'administrateur n'a pas encore ajouté de services. Revenez bientôt !
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item: any, i: number) => {
              // Ensure URL has a protocol so browser opens it externally, not as a relative path
              const href = item.linkUrl && /^https?:\/\//i.test(item.linkUrl)
                ? item.linkUrl
                : `https://${item.linkUrl}`;
              return (
              <motion.a
                key={item.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                custom={i}
                variants={fadeUp(i)}
                initial="hidden"
                animate="visible"
                className="group block bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-sky-100 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Image zone */}
                <div className="relative h-36 overflow-hidden bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600">
                  {item.imageUrl ? (
                    <>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* subtle overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <>
                      {/* decorative pattern when no image */}
                      <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10" />
                      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LayoutGrid className="h-14 w-14 text-white/50" />
                      </div>
                    </>
                  )}

                  {/* Top-right chip */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-sky-600 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                      <ExternalLink className="h-2.5 w-2.5" />
                      Accéder
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-base leading-snug group-hover:text-sky-600 transition-colors truncate">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl group-hover:bg-sky-100 transition-colors">
                      <ExternalLink className="h-3 w-3" />
                      Ouvrir le service
                    </span>
                    <div className="h-7 w-7 rounded-xl bg-gray-50 group-hover:bg-sky-50 flex items-center justify-center transition-colors">
                      <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-sky-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
