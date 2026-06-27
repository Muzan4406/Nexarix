import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTasks, useCompleteTask, getGetTasksQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, ExternalLink, Zap, Video, Megaphone,
  HelpCircle, Users, Star, Trophy, Sparkles, Lock, Play
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; light: string; label: string }> = {
  Quiz:       { icon: HelpCircle, gradient: "from-violet-500 to-purple-600",   light: "bg-violet-50 text-violet-600 border-violet-200", label: "Quiz" },
  TikTok:     { icon: Play,       gradient: "from-pink-500 to-rose-500",        light: "bg-pink-50 text-pink-600 border-pink-200",        label: "TikTok" },
  YouTube:    { icon: Video,      gradient: "from-red-500 to-orange-500",       light: "bg-red-50 text-red-600 border-red-200",           label: "YouTube" },
  Ads:        { icon: Megaphone,  gradient: "from-blue-500 to-cyan-500",        light: "bg-blue-50 text-blue-600 border-blue-200",        label: "Pub" },
  Sponsored:  { icon: Star,       gradient: "from-amber-400 to-yellow-500",     light: "bg-amber-50 text-amber-600 border-amber-200",     label: "Sponsorisé" },
  Sponsored2: { icon: Users,      gradient: "from-emerald-500 to-teal-500",     light: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Partenaire" },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

function TaskCard({ task, onComplete, isPending, index }: { task: any; onComplete: (t: any) => void; isPending: boolean; index: number }) {
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
        done
          ? "opacity-60 bg-gray-50 border-gray-200"
          : "bg-white border-gray-100 shadow-sm hover:shadow-lg"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${cfg.gradient}`} />

      <div className="pl-5 pr-4 py-4 flex items-start gap-4">
        <div className={`shrink-0 h-11 w-11 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md`}>
          {done
            ? <CheckCircle2 className="h-5 w-5 text-white" />
            : <Icon className="h-5 w-5 text-white" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.light}`}>{cfg.label}</span>
            {done && <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Complété</span>}
          </div>
          <p className="font-bold text-sm text-gray-900 leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-gradient-to-r ${cfg.gradient} text-white shadow-sm`}>
              <Zap className="h-3 w-3 fill-current" />{task.points} pts
            </span>
            {task.question && !done && (
              <span className="text-[11px] text-violet-600 font-semibold flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />Quiz requis
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <a
            href={task.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-xl px-3 py-2 transition-all"
          >
            <ExternalLink className="h-3 w-3" />Voir
          </a>
          {!done && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => onComplete(task)}
              className={`text-xs h-8 px-3 bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white border-0 rounded-xl shadow-sm font-bold`}
            >
              Valider
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const completeTask = useCompleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quizTask, setQuizTask] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const handleComplete = (task: any, ans?: string) => {
    completeTask.mutate({ taskId: task.id, data: { answer: ans || null } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "🎉 Tâche complétée !", description: `+${res.pointsEarned} points crédités sur votre compte` });
        setQuizTask(null);
        setAnswer("");
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Impossible de compléter", variant: "destructive" });
        setQuizTask(null);
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
            <p className="text-blue-200 text-sm mb-5">Complète des tâches et gagne des points convertibles en FCFA</p>
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
            <p className="text-sm text-gray-400">De nouvelles tâches arriveront bientôt.</p>
          </motion.div>
        )}

        {/* Task list */}
        {filtered.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.filter((t: any) => !t.completedAt).map((task: any, i: number) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onComplete={(t) => t.question ? setQuizTask(t) : handleComplete(t)}
                  isPending={completeTask.isPending}
                />
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={i + pending.length}
                      onComplete={() => {}}
                      isPending={false}
                    />
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quiz Dialog */}
      <Dialog open={!!quizTask} onOpenChange={() => { setQuizTask(null); setAnswer(""); }}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <span className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <HelpCircle className="h-4 w-4 text-violet-600" />
              </span>
              Question requise
            </DialogTitle>
          </DialogHeader>
          {quizTask && (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-gray-900 leading-relaxed">{quizTask.question}</p>
              </div>
              <Input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Votre réponse…"
                className="rounded-2xl border-gray-200 h-11 font-medium"
                onKeyDown={e => e.key === "Enter" && answer && handleComplete(quizTask, answer)}
                autoFocus
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl flex-1" onClick={() => { setQuizTask(null); setAnswer(""); }}>
              Annuler
            </Button>
            <Button
              onClick={() => handleComplete(quizTask, answer)}
              disabled={!answer || completeTask.isPending}
              className="rounded-2xl flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 font-bold"
            >
              {completeTask.isPending ? "Validation…" : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
