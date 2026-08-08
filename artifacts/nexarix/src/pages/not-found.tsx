import { motion } from "framer-motion";
import { Link } from "wouter";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(145deg, #f0fdf9 0%, #ecfeff 40%, #eff6ff 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm text-center"
      >
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="h-24 w-24 rounded-[28px] flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #dc2626 100%)" }}
          >
            <AlertTriangle className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Text */}
        <p className="text-orange-500 font-black text-sm uppercase tracking-widest mb-1">Erreur 404</p>
        <h1 className="font-black text-[32px] text-gray-900 leading-tight mb-2">Page introuvable</h1>
        <p className="text-gray-400 text-sm font-medium mb-8">
          Cette page n'existe pas ou a été déplacée.
        </p>

        {/* CTA */}
        <Link href="/dashboard">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-black text-sm shadow-lg shadow-blue-200"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)" }}
          >
            <Home className="h-4 w-4" />
            Retour au tableau de bord
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
