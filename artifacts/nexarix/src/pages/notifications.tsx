import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { Bell, CheckCheck, Clock, Inbox } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Notifications() {
  const { token } = useAuth() as any;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const authH = () => ({ Authorization: `Bearer ${token}` });

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", headers: authH() });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH", headers: authH() });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[22px] text-white"
          style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #60a5fa 100%)" }}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center relative">
                  <Bell className="h-5 w-5 text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Centre</p>
                  <p className="text-white font-black text-lg leading-tight">Notifications</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-3 py-1.5 text-xs font-bold"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-[22px] bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="py-20 text-center"
          >
            <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-8 w-8 text-blue-300" />
            </div>
            <p className="font-black text-gray-700">Aucune notification</p>
            <p className="text-sm text-gray-400 mt-1 font-medium">Vous êtes à jour !</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2.5">
              {notifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  onClick={() => !notif.read && markRead(notif.id)}
                  className={`rounded-[22px] border p-4 cursor-pointer transition-all ${
                    notif.read
                      ? "bg-white border-gray-100"
                      : "bg-blue-50 border-blue-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      notif.read ? "bg-gray-100" : "bg-blue-600"
                    }`}>
                      <Bell className={`h-4 w-4 ${notif.read ? "text-gray-400" : "text-white"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`font-black text-sm truncate ${notif.read ? "text-gray-700" : "text-gray-900"}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] font-medium">
                          {format(new Date(notif.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
}
