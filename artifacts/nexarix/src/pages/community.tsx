import { motion } from "framer-motion";
import { useGetAdminSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { ExternalLink, Download, Users, Sparkles } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

const card = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Community() {
  const { data: settings } = useGetAdminSettings();

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white text-center relative overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 mx-auto">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-black text-2xl mb-1">Notre Communauté</h1>
            <p className="text-emerald-100 text-sm">Rejoignez-nous sur nos canaux officiels</p>
          </div>
        </motion.div>

        {/* Telegram */}
        <motion.a
          href={settings?.telegramLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          custom={0}
          variants={card}
          initial="hidden"
          animate="visible"
          data-testid="button-telegram"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          className="block rounded-3xl overflow-hidden shadow-lg shadow-blue-200/60 cursor-pointer"
        >
          <div className="bg-gradient-to-br from-[#0088cc] to-[#005580] p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <SiTelegram className="h-9 w-9 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-0.5">Canal officiel</p>
                <h2 className="font-black text-2xl leading-tight">Telegram</h2>
                <p className="text-blue-200 text-sm mt-1">Actualités · Alertes · Annonces officielles</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/20 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-300 shrink-0" />
              <p className="text-sm text-blue-100 font-bold">Rejoindre le canal Telegram →</p>
            </div>
          </div>
        </motion.a>

        {/* WhatsApp */}
        <motion.a
          href={settings?.whatsappLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          custom={1}
          variants={card}
          initial="hidden"
          animate="visible"
          data-testid="button-whatsapp"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          className="block rounded-3xl overflow-hidden shadow-lg shadow-green-200/60 cursor-pointer"
        >
          <div className="bg-gradient-to-br from-[#25D366] to-[#0e7a47] p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <SiWhatsapp className="h-9 w-9 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-green-100 text-[10px] font-black uppercase tracking-widest mb-0.5">Chaîne officielle</p>
                <h2 className="font-black text-2xl leading-tight">WhatsApp</h2>
                <p className="text-green-100 text-sm mt-1">Échanges · Entraide · Membres actifs</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/20 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-300 shrink-0" />
              <p className="text-sm text-green-100 font-bold">Rejoindre la chaîne WhatsApp →</p>
            </div>
          </div>
        </motion.a>

        {/* VCF optionnel */}
        {settings?.vcfLink && (
          <motion.a
            href={settings.vcfLink}
            target="_blank"
            rel="noopener noreferrer"
            custom={2}
            variants={card}
            initial="hidden"
            animate="visible"
            data-testid="button-download-vcf"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">Contacts VCF</p>
              <p className="text-xs text-gray-500 mt-0.5">Télécharger les contacts importants Nexarix</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
          </motion.a>
        )}

      </div>
    </AppLayout>
  );
}
