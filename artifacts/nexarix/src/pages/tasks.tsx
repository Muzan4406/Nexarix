import { useState } from "react";
import { useGetTasks, useCompleteTask, getGetTasksQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, ExternalLink, Zap, Video, Megaphone,
  HelpCircle, Users, Star, Trophy, Sparkles, Lock
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; badge: string; label: string }> = {
  Quiz:       { icon: HelpCircle, gradient: "from-purple-500 to-violet-600",   badge: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300", label: "Quiz" },
  TikTok:     { icon: Video,      gradient: "from-pink-500 to-rose-600",       badge: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300",       label: "TikTok" },
  YouTube:    { icon: Video,      gradient: "from-red-500 to-orange-600",      badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",           label: "YouTube" },
  Ads:        { icon: Megaphone,  gradient: "from-blue-500 to-cyan-600",       badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",      label: "Publicité" },
  Sponsored:  { icon: Star,       gradient: "from-amber-500 to-yellow-600",    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",  label: "Sponsorisé" },
  Sponsored2: { icon: Users,      gradient: "from-emerald-500 to-teal-600",    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300", label: "Partenaire" },
};

function TaskCard({ task, onComplete, isPending }: { task: any; onComplete: (t: any) => void; isPending: boolean }) {
  const cfg = CATEGORY_CONFIG[task.category] || { icon: Zap, gradient: "from-gray-500 to-gray-600", badge: "bg-gray-100 text-gray-700 border-gray-200", label: task.category };
  const Icon = cfg.icon;
  const done = !!task.completedAt;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
        done
          ? "opacity-70 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${cfg.gradient}`} />

      <div className="pl-4 pr-4 py-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm`}>
            {done
              ? <CheckCircle className="h-5 w-5 text-white" />
              : <Icon className="h-5 w-5 text-white" />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{task.title}</p>
              {done && <span className="text-xs text-emerald-600 font-medium shrink-0">✓ Complété</span>}
            </div>
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${cfg.gradient} text-white`}>
                <Zap className="h-3 w-3" />
                {task.points} pts
              </div>
              {task.question && !done && (
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />Quiz requis
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <a
              href={task.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Ouvrir
            </a>
            {!done && (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => onComplete(task)}
                className={`text-xs h-7 px-3 bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white border-0 rounded-lg`}
              >
                Valider
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
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
        toast({
          title: "🎉 Tâche complétée !",
          description: `+${res.pointsEarned} points crédités sur votre compte`,
        });
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
  const filtered = activeCategory === "all"
    ? tasks || []
    : (tasks || []).filter((t: any) => t.category === activeCategory);

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-8 w-8 rounded-full border-4 border-[#1565C0] border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Chargement des tâches...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight">Tâches rémunérées</h1>
              <p className="text-blue-100 text-xs">Complétez des tâches et gagnez des points</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm text-center">
              <p className="text-2xl font-black">{pending.length}</p>
              <p className="text-blue-200 text-xs mt-0.5">Disponibles</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm text-center">
              <p className="text-2xl font-black">{completed.length}</p>
              <p className="text-blue-200 text-xs mt-0.5">Complétées</p>
            </div>
          </div>
        </div>

        {/* Category filter pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                activeCategory === "all"
                  ? "bg-[#1565C0] text-white border-[#1565C0]"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#1565C0] hover:text-[#1565C0]"
              }`}
            >
              Toutes ({tasks?.length || 0})
            </button>
            {categories.map((cat: any) => {
              const cfg = CATEGORY_CONFIG[cat];
              const catCount = (tasks || []).filter((t: any) => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    activeCategory === cat
                      ? "bg-[#1565C0] text-white border-[#1565C0]"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#1565C0] hover:text-[#1565C0]"
                  }`}
                >
                  {cfg?.label || cat} ({catCount})
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Aucune tâche disponible</p>
            <p className="text-sm text-gray-500">De nouvelles tâches seront ajoutées bientôt.</p>
          </div>
        )}

        {/* Tasks list */}
        {filtered.length > 0 && (
          <div className="space-y-2.5">
            {/* Pending first */}
            {filtered.filter((t: any) => !t.completedAt).map((task: any) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={(t) => t.question ? setQuizTask(t) : handleComplete(t)}
                isPending={completeTask.isPending}
              />
            ))}
            {/* Completed section */}
            {filtered.filter((t: any) => t.completedAt).length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Complétées
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>
                {filtered.filter((t: any) => t.completedAt).map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => {}}
                    isPending={false}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Quiz Dialog */}
      <Dialog open={!!quizTask} onOpenChange={() => { setQuizTask(null); setAnswer(""); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-500" />
              Question requise
            </DialogTitle>
          </DialogHeader>
          {quizTask && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{quizTask.question}</p>
              </div>
              <Input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Votre réponse..."
                className="rounded-xl"
                onKeyDown={e => e.key === "Enter" && answer && handleComplete(quizTask, answer)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setQuizTask(null); setAnswer(""); }}>
              Annuler
            </Button>
            <Button
              onClick={() => handleComplete(quizTask, answer)}
              disabled={!answer || completeTask.isPending}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0"
            >
              Valider la réponse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
