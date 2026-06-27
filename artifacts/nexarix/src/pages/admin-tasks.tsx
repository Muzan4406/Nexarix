import { useState } from "react";
import { motion } from "framer-motion";
import { useGetAdminTasks, useCreateAdminTask, useUpdateAdminTask, useDeleteAdminTask, getGetAdminTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ExternalLink, Zap, Video, Megaphone, Star, Users, Play, CheckSquare } from "lucide-react";

const CATEGORIES = ["TikTok", "YouTube", "Ads", "Sponsored", "Sponsored2"];

const CAT_CONFIG: Record<string, { icon: any; gradient: string; label: string }> = {
  TikTok:     { icon: Play,       gradient: "from-pink-500 to-rose-500",     label: "TikTok" },
  YouTube:    { icon: Video,      gradient: "from-red-500 to-orange-500",    label: "YouTube" },
  Ads:        { icon: Megaphone,  gradient: "from-blue-500 to-cyan-500",     label: "Publicité" },
  Sponsored:  { icon: Star,       gradient: "from-amber-500 to-yellow-500",  label: "Sponsorisé" },
  Sponsored2: { icon: Users,      gradient: "from-emerald-500 to-teal-500",  label: "Partenaire" },
};

const emptyForm = { category: "", description: "", targetUrl: "", points: "", isActive: true };

const card = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

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
    setForm({ category: task.category, description: task.description || "", targetUrl: task.targetUrl, points: task.points.toString(), isActive: task.isActive });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.category || !form.targetUrl || !form.points) {
      toast({ title: "Champs requis manquants", variant: "destructive" }); return;
    }
    const data: any = { category: form.category, description: form.description || null, targetUrl: form.targetUrl, points: parseInt(form.points), isActive: form.isActive };
    if (editTask) {
      updateTask.mutate({ taskId: editTask.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() }); toast({ title: "✅ Tâche mise à jour" }); setOpen(false); },
        onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
      });
    } else {
      createTask.mutate({ data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() }); toast({ title: "✅ Tâche créée" }); setOpen(false); },
        onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTask.mutate({ taskId: deleteId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() }); toast({ title: "🗑️ Tâche supprimée" }); setDeleteId(null); },
      onError: () => toast({ title: "Erreur de suppression", variant: "destructive" }),
    });
  };

  const activeTasks = (tasks || []).filter((t: any) => t.isActive).length;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tasks?.length || 0} tâches au total</span>
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="text-xs font-bold text-emerald-600">{activeTasks} actives</span>
            </div>
          </div>
          <Button onClick={openCreate} className="rounded-2xl h-10 font-bold shadow-md shadow-blue-200/50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0" data-testid="button-create-task">
            <Plus className="h-4 w-4 mr-1.5" />Nouvelle tâche
          </Button>
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : (tasks || []).length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucune tâche</p>
            <p className="text-sm text-gray-400">Cliquez "Nouvelle tâche" pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(tasks || []).map((task: any, i: number) => {
              const cfg = CAT_CONFIG[task.category] || { icon: Zap, gradient: "from-gray-400 to-gray-500", label: task.category };
              const Icon = cfg.icon;
              return (
                <motion.div key={task.id} custom={i} variants={card} initial="hidden" animate="visible"
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  data-testid={`card-task-${task.id}`}>
                  <div className="flex items-center gap-4 p-4">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-gray-500">{cfg.label}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${task.isActive ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {task.isActive ? "Actif" : "Inactif"}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-xl bg-gradient-to-r ${cfg.gradient} text-white`}>
                          <Zap className="h-2.5 w-2.5 fill-current" />{task.points} pts
                        </span>
                      </div>
                      {task.description && <p className="text-sm font-semibold text-gray-800 truncate">{task.description}</p>}
                      <a href={task.targetUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" />{task.targetUrl.substring(0, 45)}{task.targetUrl.length > 45 ? "…" : ""}
                      </a>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-gray-200"
                        onClick={() => openEdit(task)} data-testid={`button-edit-task-${task.id}`}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                        onClick={() => setDeleteId(task.id)} data-testid={`button-delete-task-${task.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">{editTask ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-gray-700">Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-2 rounded-2xl border-gray-200 h-11"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CAT_CONFIG[c]?.label || c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Description <span className="font-normal text-gray-400">(optionnel)</span></Label>
              <Textarea className="mt-2 rounded-2xl border-gray-200 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de la vidéo…" rows={2} />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">URL de la vidéo</Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.targetUrl} onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=… ou https://tiktok.com/…" data-testid="input-task-url" />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Points à gagner</Label>
              <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="100" data-testid="input-task-points" />
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="task-active" />
              <div>
                <Label htmlFor="task-active" className="text-sm font-bold text-gray-700 cursor-pointer">Tâche active</Label>
                <p className="text-xs text-gray-400">Les utilisateurs peuvent voir et compléter cette tâche</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-2xl flex-1 h-11 font-bold" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="rounded-2xl flex-1 h-11 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
              onClick={handleSave} disabled={createTask.isPending || updateTask.isPending} data-testid="button-save-task">
              {(createTask.isPending || updateTask.isPending) ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. La tâche sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl font-bold bg-red-500 hover:bg-red-600" onClick={handleDelete} data-testid="button-confirm-delete">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
