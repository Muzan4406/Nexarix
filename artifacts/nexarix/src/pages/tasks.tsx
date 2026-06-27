import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTasks, useCompleteTask, getGetTasksQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Zap, Video, Megaphone,
  Users, Star, Trophy, Sparkles, Lock, Play, Timer
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; light: string; label: string }> = {
  TikTok:     { icon: Play,      gradient: "from-pink-500 to-rose-500",        light: "bg-pink-50 text-pink-600 border-pink-200",        label: "TikTok" },
  YouTube:    { icon: Video,     gradient: "from-red-500 to-orange-500",       light: "bg-red-50 text-red-600 border-red-200",           label: "YouTube" },
  Ads:        { icon: Megaphone, gradient: "from-blue-500 to-cyan-500",        light: "bg-blue-50 text-blue-600 border-blue-200",        label: "Pub" },
  Sponsored:  { icon: Star,      gradient: "from-amber-400 to-yellow-500",     light: "bg-amber-50 text-amber-600 border-amber-200",     label: "Sponsorisé" },
  Sponsored2: { icon: Users,     gradient: "from-emerald-500 to-teal-500",     light: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Partenaire" },
};

function getEmbedUrl(url: string): string | null {
  // YouTube watch or short
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  // TikTok
  const tt = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;
  return null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

function VideoWatchModal({ task, onClaim, onClose, isPending }: {
  task: any; onClaim: () => void; onClose: () => void; isPending: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [canClaim, setCanClaim] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const embedUrl = getEmbedUrl(task.targetUrl);
  const cfg = CATEGORY_CONFIG[task.category] || { gradient: "from-gray-400 to-gray-600", label: task.category, icon: Play, light: "" };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setCanClaim(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-lg mx-auto p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <span className={`h-8 w-8 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
              <cfg.icon className="h-4 w-4 text-white" />
            </span>
            {task.description || cfg.label}
          </DialogTitle>
        </DialogHeader>

        {/* Video player */}
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
              <Play className="h-12 w-12 opacity-40" />
              <p className="text-sm opacity-60">Aperçu non disponible</p>
            </div>
          )}
        </div>

        {/* Timer + Claim */}
        <div className="px-5 pb-5 pt-4 space-y-3">
          {!canClaim ? (
            <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <Timer className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-bold text-amber-700">
                Regardez encore <span className="font-black text-amber-600 text-base">{secondsLeft}s</span> pour réclamer votre récompense
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-bold text-emerald-700">Vous pouvez maintenant réclamer votre récompense !</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-2xl font-bold h-11" onClick={onClose}>
              Fermer
            </Button>
            <Button
              disabled={!canClaim || isPending}
              onClick={onClaim}
              className={`rounded-2xl h-11 font-bold text-white border-0 bg-gradient-to-r ${cfg.gradient} disabled:opacity-40 disabled:cursor-not-allowed shadow-md`}
            >
              <Zap className="h-4 w-4 mr-1.5 fill-current" />
              {isPending ? "Validation…" : `Réclamer · ${task.points} pts`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskCard({ task, onWatch, index }: { task: any; onWatch: (t: any) => void; index: number }) {
  const cfg = CATEGORY_CONFIG[task.category] || { icon: Zap, gradient: "from-gray-400 to-gray-600", light: "bg-gray-50 text-gray-600 border-gray-200", label: task.category };
  const Icon = cfg.icon;
  const done = !!task.completedAt;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
      className={`relative rounded-2xl border overflow-hidden transition-shadow duration-300 ${
        done ? "opacity-60 bg-gray-50 border-gray-200" : "bg-white border-gray-100 shadow-sm hover:shadow-lg"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${cfg.gradient}`} />

      <div className="pl-5 pr-4 py-4 flex items-start gap-4">
        <div className={`shrink-0 h-11 w-11 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md`}>
          {done ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Icon className="h-5 w-5 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.light}`}>{cfg.label}</span>
            {done && <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Complété</span>}
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-gradient-to-r ${cfg.gradient} text-white shadow-sm`}>
              <Zap className="h-3 w-3 fill-current" />{task.points} pts
            </span>
          </div>
        </div>

        {!done && (
          <button
            onClick={() => onWatch(task)}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r ${cfg.gradient} rounded-xl px-3 py-2 shadow-md transition-opacity hover:opacity-90`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />Regarder
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const completeTask = useCompleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [watchTask, setWatchTask] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const handleClaim = () => {
    if (!watchTask) return;
    completeTask.mutate({ taskId: watchTask.id, data: { answer: null } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "🎉 Récompense reçue !", description: `+${res.pointsEarned} points crédités sur votre compte` });
        setWatchTask(null);
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Impossible de compléter", variant: "destructive" });
        setWatchTask(null);
      },
    });
  };

  const categories = tasks ? [...new Set(tasks.map((t: any) => t.category))] : [];
  const pending = tasks?.filter((t: any) => !t.completedAt) || [];
  const completed = tasks?.filter((t: any) => t.completedAt) || [];
  const filtered = activeCategory === "all" ? tasks || [] : (tasks || []).filter((t: any) => t.category === activeCategory);

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500">Chargement des tâches…</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-[#1565C0] via-[#1976D2] to-[#0D47A1] p-6 text-white text-center relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 mx-auto shadow-lg">
              <Trophy className="h-7 w-7 text-yellow-300" />
            </div>
            <h1 className="font-black text-2xl tracking-tight mb-1">Tâches rémunérées</h1>
            <p className="text-blue-200 text-sm mb-5">Regarde des vidéos et gagne des points convertibles en FCFA</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                <p className="text-3xl font-black tabular-nums">{pending.length}</p>
                <p className="text-blue-200 text-xs font-medium mt-0.5">Disponibles</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                <p className="text-3xl font-black tabular-nums text-emerald-300">{completed.length}</p>
                <p className="text-blue-200 text-xs font-medium mt-0.5">Complétées</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category pills */}
        {categories.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
          >
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 text-xs font-bold px-4 py-2 rounded-2xl transition-all ${
                activeCategory === "all"
                  ? "bg-[#1565C0] text-white shadow-md shadow-blue-200"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0]"
              }`}
            >
              Toutes · {tasks?.length || 0}
            </button>
            {categories.map((cat: any) => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = (tasks || []).filter((t: any) => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 text-xs font-bold px-4 py-2 rounded-2xl transition-all ${
                    activeCategory === cat
                      ? "bg-[#1565C0] text-white shadow-md shadow-blue-200"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0]"
                  }`}
                >
                  {cfg?.label || cat} · {count}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
              <Sparkles className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-900 text-lg mb-1">Aucune tâche disponible</p>
            <p className="text-sm text-gray-400">De nouvelles vidéos arriveront bientôt.</p>
          </motion.div>
        )}

        {/* Task list */}
        {filtered.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.filter((t: any) => !t.completedAt).map((task: any, i: number) => (
                <TaskCard key={task.id} task={task} index={i} onWatch={setWatchTask} />
              ))}
            </AnimatePresence>

            {filtered.filter((t: any) => t.completedAt).length > 0 && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 pt-2"
                >
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                    <Lock className="h-3 w-3" />Complétées
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </motion.div>
                <AnimatePresence>
                  {filtered.filter((t: any) => t.completedAt).map((task: any, i: number) => (
                    <TaskCard key={task.id} task={task} index={i + pending.length} onWatch={() => {}} />
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </div>

      {/* Video Watch Modal */}
      {watchTask && (
        <VideoWatchModal
          task={watchTask}
          onClaim={handleClaim}
          onClose={() => setWatchTask(null)}
          isPending={completeTask.isPending}
        />
      )}
    </AppLayout>
  );
}
