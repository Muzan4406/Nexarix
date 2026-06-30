import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, GraduationCap, Upload, Play, FileText, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["general", "marketing", "finance", "technique", "autre"];
const LEVELS = [
  { value: "debutant",     label: "Débutant" },
  { value: "intermediaire",label: "Intermédiaire" },
  { value: "avance",       label: "Avancé" },
];

const emptyForm = {
  title: "", description: "", category: "general", thumbnailUrl: "",
  videoUrl: "", contentUrl: "", duration: "", level: "debutant",
  isFree: true, isActive: true, order: "0",
};

const card = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

const LEVEL_COLORS: Record<string, string> = {
  debutant:     "bg-emerald-100 text-emerald-600",
  intermediaire:"bg-amber-100 text-amber-600",
  avance:       "bg-red-100 text-red-600",
};

export default function AdminFormations() {
  const { token } = useAuth() as any;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [contentMode, setContentMode] = useState<"url" | "file">("url");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: formations, isLoading } = useQuery({
    queryKey: ["admin-formations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/formations", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setFile(null); setContentMode("url"); setOpen(true); };
  const openEdit = (f: any) => {
    setEditItem(f);
    setForm({
      title: f.title, description: f.description || "", category: f.category,
      thumbnailUrl: f.thumbnailUrl || "", videoUrl: f.videoUrl || "",
      contentUrl: f.contentUrl || "", duration: f.duration || "",
      level: f.level, isFree: f.isFree, isActive: f.isActive, order: String(f.order || 0),
    });
    setFile(null);
    setContentMode(f.contentUrl?.startsWith("/api/") ? "file" : "url");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Le titre est requis", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append("file", file);

      const url = editItem ? `/api/admin/formations/${editItem.id}` : "/api/admin/formations";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur"); }

      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      toast({ title: editItem ? "✅ Formation mise à jour" : "✅ Formation créée" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/admin/formations/${deleteId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      toast({ title: "🗑️ Formation supprimée" });
      setDeleteId(null);
    } catch {
      toast({ title: "Erreur de suppression", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {formations?.length || 0} formation(s) au total
          </span>
          <Button onClick={openCreate} className="rounded-2xl h-10 font-bold shadow-md shadow-orange-200/50 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0">
            <Plus className="h-4 w-4 mr-1.5" />Nouvelle formation
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : !formations?.length ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucune formation</p>
            <p className="text-sm text-gray-400">Ajoutez votre première formation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formations.map((f: any, i: number) => (
              <motion.div key={f.id} custom={i} variants={card} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 p-4">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                    {f.thumbnailUrl
                      ? <img src={f.thumbnailUrl} alt={f.title} className="h-full w-full object-cover" />
                      : <GraduationCap className="h-5 w-5 text-white" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-black text-gray-900 truncate">{f.title}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", f.isActive ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
                        {f.isActive ? "Actif" : "Inactif"}
                      </span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", LEVEL_COLORS[f.level] || "bg-gray-100 text-gray-500")}>
                        {LEVELS.find(l => l.value === f.level)?.label || f.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{f.isFree ? "Gratuit" : "Premium"}</span>
                      {f.duration && <span>{f.duration}</span>}
                      {f.videoUrl && <span className="flex items-center gap-1 text-red-400"><Play className="h-3 w-3" />Vidéo</span>}
                      {f.contentUrl && <span className="flex items-center gap-1 text-orange-400"><FileText className="h-3 w-3" />Document</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-gray-200" onClick={() => openEdit(f)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">{editItem ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-gray-700">Titre</Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la formation…" />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Description <span className="font-normal text-gray-400">(optionnel)</span></Label>
              <Textarea className="mt-2 rounded-2xl border-gray-200 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Décrivez cette formation…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-bold text-gray-700">Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-2 rounded-2xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold text-gray-700">Niveau</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger className="mt-2 rounded-2xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-bold text-gray-700">Durée</Label>
                <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="2h30" />
              </div>
              <div>
                <Label className="text-sm font-bold text-gray-700">Ordre</Label>
                <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Image miniature <span className="font-normal text-gray-400">(URL, optionnel)</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.thumbnailUrl} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Lien vidéo <span className="font-normal text-gray-400">(YouTube, TikTok…)</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=…" />
            </div>

            {/* Content: URL or File */}
            <div>
              <Label className="text-sm font-bold text-gray-700">Document / Fichier</Label>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setContentMode("url")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all",
                    contentMode === "url" ? "bg-orange-50 border-orange-300 text-orange-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  )}>
                  <LinkIcon className="h-3.5 w-3.5" />Lien externe
                </button>
                <button onClick={() => setContentMode("file")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all",
                    contentMode === "file" ? "bg-orange-50 border-orange-300 text-orange-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  )}>
                  <Upload className="h-3.5 w-3.5" />Upload direct
                </button>
              </div>
              {contentMode === "url" ? (
                <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.contentUrl}
                  onChange={e => setForm(f => ({ ...f, contentUrl: e.target.value }))}
                  placeholder="https://drive.google.com/… ou lien PDF" />
              ) : (
                <div className="mt-2">
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.zip,*"
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 hover:border-orange-300 rounded-2xl py-4 flex flex-col items-center gap-2 transition-all group">
                    <Upload className="h-6 w-6 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    <span className="text-xs font-semibold text-gray-400">
                      {file ? file.name : "Cliquez pour choisir un fichier (PDF, Word, ZIP…)"}
                    </span>
                    {file && <span className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <Switch checked={form.isFree} onCheckedChange={v => setForm(f => ({ ...f, isFree: v }))} id="f-is-free" />
                <Label htmlFor="f-is-free" className="text-sm font-bold text-gray-700 cursor-pointer">Gratuit</Label>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="f-is-active" />
                <Label htmlFor="f-is-active" className="text-sm font-bold text-gray-700 cursor-pointer">Actif</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-2xl flex-1 h-11 font-bold" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="rounded-2xl flex-1 h-11 font-bold bg-gradient-to-r from-orange-500 to-amber-500 border-0"
              onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Supprimer cette formation ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl font-bold bg-red-500 hover:bg-red-600" onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
