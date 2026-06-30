import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LayoutGrid, ExternalLink } from "lucide-react";

const card = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

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
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-200">
            <LayoutGrid className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-xl leading-tight">Divers</h1>
            <p className="text-xs text-gray-400 font-medium">Services & ressources disponibles</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-3xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !items?.length ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucun service disponible</p>
            <p className="text-sm text-gray-400">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item: any, i: number) => (
              <motion.a
                key={item.id}
                href={item.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                custom={i}
                variants={card}
                initial="hidden"
                animate="visible"
                className="flex gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all group cursor-pointer"
              >
                {/* Image or icon */}
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shrink-0 shadow-md overflow-hidden group-hover:scale-105 transition-transform">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    : <LayoutGrid className="h-7 w-7 text-white" />
                  }
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-black text-gray-900 text-sm truncate group-hover:text-sky-600 transition-colors">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-sky-500 font-semibold">
                    <ExternalLink className="h-3 w-3" />
                    Accéder au service
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <div className="h-8 w-8 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                    <ExternalLink className="h-4 w-4 text-sky-500" />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
