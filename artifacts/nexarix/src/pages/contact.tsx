import { motion } from "framer-motion";
import { useGetAdminSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Mail, ExternalLink, Phone, Clock, Shield } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

const card = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Contact() {
  const { data: settings } = useGetAdminSettings();

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white relative overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 mb-4">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-black text-2xl mb-1">Assistance</h1>
            <p className="text-blue-200 text-sm">Notre équipe est là pour vous aider</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-200" />
                <span className="text-xs text-blue-100 font-semibold">Réponse sous 24h</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-200" />
                <span className="text-xs text-blue-100 font-semibold">Support officiel</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Email Support */}
        <motion.div custom={0} variants={card} initial="hidden" animate="visible">
          <a
            href={`mailto:${settings?.supportEmail || "support@nexarix.com"}`}
            data-testid="link-support-email"
            className="block bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                <Mail className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-0.5">Email</p>
                <h2 className="font-black text-lg text-gray-900 leading-tight">Support Email</h2>
                <p className="text-blue-600 font-semibold text-sm mt-0.5 truncate">
                  {settings?.supportEmail || "support@nexarix.com"}
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3 pl-[4.5rem]">
              Envoyez-nous un email pour toute demande de support ou question.
            </p>
          </a>
        </motion.div>

        {/* Support Telegram */}
        <motion.div custom={1} variants={card} initial="hidden" animate="visible">
          <a
            href={settings?.telegramLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-contact-telegram"
            className="block bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#005580] flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                <SiTelegram className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-0.5">Messagerie</p>
                <h2 className="font-black text-lg text-gray-900 leading-tight">Support Telegram</h2>
                <p className="text-[#0088cc] font-semibold text-sm mt-0.5">Réponse rapide garantie</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3 pl-[4.5rem]">
              Contactez notre support directement via Telegram pour une assistance prioritaire.
            </p>
          </a>
        </motion.div>

        {/* Canal Telegram */}
        <motion.div custom={2} variants={card} initial="hidden" animate="visible">
          <a
            href={settings?.telegramChannel || "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-contact-telegram-channel"
            className="block bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-[#0088cc] flex items-center justify-center shrink-0 shadow-lg shadow-cyan-200">
                <SiTelegram className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-0.5">Annonces</p>
                <h2 className="font-black text-lg text-gray-900 leading-tight">Canal Telegram</h2>
                <p className="text-cyan-600 font-semibold text-sm mt-0.5">Actualités & mises à jour</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3 pl-[4.5rem]">
              Rejoignez notre canal pour recevoir toutes les annonces et mises à jour officielles.
            </p>
          </a>
        </motion.div>

        {/* Chaîne WhatsApp */}
        <motion.div custom={3} variants={card} initial="hidden" animate="visible">
          <a
            href={settings?.whatsappLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-contact-whatsapp"
            className="block bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
                <SiWhatsapp className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-0.5">Communauté</p>
                <h2 className="font-black text-lg text-gray-900 leading-tight">Chaîne WhatsApp</h2>
                <p className="text-green-600 font-semibold text-sm mt-0.5">Rejoindre la communauté</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3 pl-[4.5rem]">
              Rejoignez notre chaîne WhatsApp pour rester connecté avec la communauté Nexarix.
            </p>
          </a>
        </motion.div>

      </div>
    </AppLayout>
  );
}
