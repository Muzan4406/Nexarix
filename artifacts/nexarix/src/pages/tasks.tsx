import { useState } from "react";
import { useGetTasks, useCompleteTask, getGetTasksQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ExternalLink, Zap, Video, Megaphone, HelpCircle, Users } from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  Quiz: HelpCircle,
  TikTok: Video,
  YouTube: Video,
  Ads: Megaphone,
  Sponsored: Users,
  Sponsored2: Users,
};

const CATEGORY_COLORS: Record<string, string> = {
  Quiz: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  TikTok: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  YouTube: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Ads: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Sponsored: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Sponsored2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const completeTask = useCompleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quizTask, setQuizTask] = useState<any>(null);
  const [answer, setAnswer] = useState("");

  const handleComplete = (task: any, ans?: string) => {
    completeTask.mutate({ taskId: task.id, data: { answer: ans || null } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Tache completee !", description: `+${res.pointsEarned} points gagnes` });
        setQuizTask(null);
        setAnswer("");
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Impossible de completer", variant: "destructive" });
        setQuizTask(null);
      },
    });
  };

  const categories = tasks ? [...new Set(tasks.map(t => t.category))] : [];

  if (isLoading) return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Taches</h1>
          <p className="text-muted-foreground text-sm">{tasks?.filter(t => !t.completedAt).length || 0} taches disponibles</p>
        </div>

        {categories.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Aucune tache disponible pour le moment.</p>
            </CardContent>
          </Card>
        )}

        {categories.map(cat => {
          const catTasks = tasks?.filter(t => t.category === cat) || [];
          const Icon = CATEGORY_ICONS[cat] || Zap;
          const colorClass = CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700";
          return (
            <div key={cat} className="space-y-3">
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
                <Icon className="h-3 w-3" />
                {cat}
              </div>
              <div className="grid gap-3">
                {catTasks.map(task => (
                  <Card key={task.id} className={task.completedAt ? "opacity-60" : ""} data-testid={`card-task-${task.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {task.completedAt && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />{task.points} pts
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={task.targetUrl} target="_blank" rel="noopener noreferrer" data-testid={`button-open-task-${task.id}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />Ouvrir
                            </a>
                          </Button>
                          {!task.completedAt && (
                            <Button size="sm" disabled={completeTask.isPending}
                              onClick={() => task.question ? setQuizTask(task) : handleComplete(task)}
                              data-testid={`button-complete-task-${task.id}`}>
                              Valider
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!quizTask} onOpenChange={() => { setQuizTask(null); setAnswer(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quiz requis</DialogTitle></DialogHeader>
          {quizTask && (
            <div className="space-y-4">
              <p className="text-sm">{quizTask.question}</p>
              <Input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Votre reponse..." data-testid="input-quiz-answer" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQuizTask(null); setAnswer(""); }}>Annuler</Button>
            <Button onClick={() => handleComplete(quizTask, answer)} disabled={!answer || completeTask.isPending} data-testid="button-submit-quiz">
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
