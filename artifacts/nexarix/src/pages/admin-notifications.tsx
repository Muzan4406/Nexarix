import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Bell, Plus, Trash2, Send, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const { token } = useAuth() as any;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [form, setForm] = useState({ title: "", message: "" });
  const [showForm, setShowForm] = useState(false);

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: "Champs requis", description: "Remplissez le titre et le message.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const created = await res.json();
        setNotifications(prev => [created, ...prev]);
        setForm({ title: "", message: "" });
        setShowForm(false);
        toast({ title: "✅ Notification envoyée !", description: "Tous les membres peuvent la voir maintenant." });
      } else {
        const data = await res.json();
        toast({ title: "Erreur", description: data.error || "Échec", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible d'envoyer.", variant: "destructive" });
    }
    setIsSending(false);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({ title: "Supprimée" });
      }
    } catch {}
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-2xl text-gray-900">Notifications</h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">Envoyez des messages à tous les membres</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white shadow-md transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle
          </button>
        </div>

        {/* New Notification Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <p className="font-black text-gray-900">Nouvelle notification</p>
            </div>

            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-semibold leading-snug">
                Cette notification sera visible par <strong>tous les membres</strong> de la plateforme.
              </p>
            </div>

            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">Titre</label>
              <input
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ex: Mise à jour importante"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">Message</label>
              <textarea
                className="w-full h-28 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                placeholder="Écrivez votre message ici…"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-black text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                {isSending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <><Send className="h-4 w-4" /> Envoyer à tous</>
                )}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}

        {/* Stats bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">{notifications.length} notification{notifications.length !== 1 ? "s" : ""} envoyée{notifications.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-gray-400 font-medium">Visibles par tous les membres</p>
          </div>
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
            <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-500">Aucune notification envoyée</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3"
              >
                <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {format(new Date(n.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="h-8 w-8 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
