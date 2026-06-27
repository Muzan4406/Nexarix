import { useState } from "react";
import { useGetAdminTasks, useCreateAdminTask, useUpdateAdminTask, useDeleteAdminTask, getGetAdminTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ExternalLink, Zap } from "lucide-react";

const CATEGORIES = ["Quiz", "TikTok", "YouTube", "Ads", "Sponsored", "Sponsored2"];

const emptyForm = { category: "", title: "", description: "", targetUrl: "", points: "", isActive: true, question: "", correctAnswer: "" };

export default function AdminTasks() {
  const { data: tasks, isLoading } = useGetAdminTasks();
  const createTask = useCreateAdminTask();
  const updateTask = useUpdateAdminTask();
  const deleteTask = useDeleteAdminTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => { setEditTask(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (task: any) => {
    setEditTask(task);
    setForm({ category: task.category, title: task.title, description: task.description || "", targetUrl: task.targetUrl, points: task.points.toString(), isActive: task.isActive, question: task.question || "", correctAnswer: task.correctAnswer || "" });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.category || !form.title || !form.targetUrl || !form.points) {
      toast({ title: "Champs requis", variant: "destructive" });
      return;
    }
    const data = { category: form.category, title: form.title, description: form.description || null, targetUrl: form.targetUrl, points: parseInt(form.points), isActive: form.isActive, question: form.question || null, correctAnswer: form.correctAnswer || null };
    if (editTask) {
      updateTask.mutate({ taskId: editTask.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() }); toast({ title: "Tache mise a jour" }); setOpen(false); },
        onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
      });
    } else {
      createTask.mutate({ data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() }); toast({ title: "Tache creee" }); setOpen(false); },
        onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTask.mutate({ taskId: deleteId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() }); toast({ title: "Tache supprimee" }); setDeleteId(null); },
      onError: () => toast({ title: "Erreur de suppression", variant: "destructive" }),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Taches</h1>
            <p className="text-muted-foreground text-sm">{tasks?.length || 0} taches configurees</p>
          </div>
          <Button onClick={openCreate} data-testid="button-create-task"><Plus className="h-4 w-4 mr-1" />Nouvelle tache</Button>
        </div>

        {isLoading ? <div className="text-center py-12 text-muted-foreground">Chargement...</div> : (
          <div className="space-y-3">
            {(tasks || []).map(task => (
              <Card key={task.id} data-testid={`card-task-${task.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
                        <Badge variant={task.isActive ? "default" : "secondary"} className="text-xs">{task.isActive ? "Actif" : "Inactif"}</Badge>
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><Zap className="h-3 w-3" />{task.points} pts</span>
                      </div>
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                      {task.question && <p className="text-xs text-blue-600 mt-1">Quiz: {task.question}</p>}
                      <a href={task.targetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" />{task.targetUrl.substring(0, 50)}...
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(task)} data-testid={`button-edit-task-${task.id}`}><Edit className="h-3 w-3" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteId(task.id)} data-testid={`button-delete-task-${task.id}`}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks?.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Aucune tache. Cliquez "Nouvelle tache" pour commencer.</div>}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTask ? "Modifier la tache" : "Nouvelle tache"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categorie</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titre</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la tache" data-testid="input-task-title" />
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={2} />
            </div>
            <div>
              <Label>URL cible</Label>
              <Input value={form.targetUrl} onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))} placeholder="https://..." data-testid="input-task-url" />
            </div>
            <div>
              <Label>Points a gagner</Label>
              <Input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="100" data-testid="input-task-points" />
            </div>
            {form.category === "Quiz" && (
              <>
                <div>
                  <Label>Question du Quiz</Label>
                  <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Quelle est la question ?" />
                </div>
                <div>
                  <Label>Reponse correcte</Label>
                  <Input value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))} placeholder="La bonne reponse" />
                </div>
              </>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="task-active" />
              <Label htmlFor="task-active">Tache active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={createTask.isPending || updateTask.isPending} data-testid="button-save-task">
              {(createTask.isPending || updateTask.isPending) ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la tache ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} data-testid="button-confirm-delete">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
