import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, GraduationCap, Upload, Play, FileText, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const emptyForm = {
  title: "", description: "", videoUrl: "",
  isFree: true, isActive: true, price: "",
};

const card = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
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
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
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

  const openCreate = () => {
    setEditItem(null); setForm(emptyForm);
    setFile(null); setOpen(true);
  };

  const openEdit = (f: any) => {
    setEditItem(f);
    setForm({
      title: f.title, description: f.description || "",
      videoUrl: f.videoUrl || "",
      isFree: f.isFree, isActive: f.isActive,
      price: f.price ? String(f.price) : "",
    });
    setFile(null);
    setOpen(true);
  };

  // Upload a file directly to Supabase via presigned URL, with XHR progress
  const uploadFileDirect = (
    fileObj: File,
    bucket: string,
    onProgress: (pct: number) => void,
  ): Promise<string> =>
    new Promise(async (resolve, reject) => {
      try {
        const presignRes = await fetch("/api/admin/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bucket, originalName: fileObj.name }),
        });
        if (!presignRes.ok) {
          const e = await presignRes.json() as any;
          reject(new Error(e.error || "Presign échoué"));
          return;
        }
        const { signedUrl, publicUrl } = await presignRes.json() as any;

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", fileObj.type || "application/octet-stream");
        xhr.setRequestHeader("x-upsert", "true");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(publicUrl);
          else reject(new Error(`Upload échoué (${xhr.status}): ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload"));
        xhr.send(fileObj);
      } catch (e: any) {
        reject(e);
      }
    });

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Le titre est requis", variant: "destructive" }); return; }
    setSaving(true);
    setUploadProgress(0);

    try {
      let contentUrl: string | undefined;

      if (file) {
        contentUrl = await uploadFileDirect(file, "formation-files", (pct) => setUploadProgress(pct));
        setUploadProgress(100);
      }

      // Submit form metadata with URL (no file)
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("videoUrl", form.videoUrl);
      fd.append("isFree", String(form.isFree));
      fd.append("isActive", String(form.isActive));
      fd.append("price", form.price || "");
      if (contentUrl) fd.append("contentUrl", contentUrl);

      const url = editItem ? `/api/admin/formations/${editItem.id}` : "/api/admin/formations";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });

      if (!res.ok) {
        let errorMsg = "Erreur serveur";
        try { const e = await res.json() as any; errorMsg = e.error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-formations"] });
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      toast({ title: editItem ? "✅ Formation mise à jour" : "✅ Formation créée" });
      setOpen(false);
      setUploadProgress(0);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      setUploadProgress(0);
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
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shrink-0">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-black text-gray-900 truncate">{f.title}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", f.isActive ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
                        {f.isActive ? "Actif" : "Inactif"}
                      </span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", f.isFree ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                        {f.isFree ? "Gratuit" : "Premium"}
                      </span>
                      {f.price && f.price > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5" />{Number(f.price).toLocaleString("fr-FR")} FCFA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
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
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la formation…" />
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Description <span className="font-normal text-gray-400">(optionnel)</span></Label>
              <Textarea className="mt-2 rounded-2xl border-gray-200 resize-none" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Décrivez cette formation…" />
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Lien vidéo <span className="font-normal text-gray-400">(YouTube, TikTok…)</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.videoUrl}
                onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                placeholder="https://youtube.com/watch?v=…" />
            </div>

            {/* File upload */}
            <div>
              <Label className="text-sm font-bold text-gray-700">Document / Fichier <span className="font-normal text-gray-400">(optionnel)</span></Label>
              <div className="mt-2">
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.zip,*"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-orange-300 rounded-2xl py-4 flex flex-col items-center gap-2 transition-all group">
                  <Upload className="h-6 w-6 text-gray-300 group-hover:text-orange-400 transition-colors" />
                  <span className="text-xs font-semibold text-gray-400">
                    {file ? file.name : editItem?.contentUrl ? "Fichier déjà uploadé — cliquer pour remplacer" : "Cliquez pour choisir un fichier (PDF, Word, ZIP…)"}
                  </span>
                  {file && <span className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                </button>
              </div>
            </div>

            {/* Price */}
            <div>
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-emerald-500" />
                Prix (FCFA) <span className="font-normal text-gray-400">— laisser vide si gratuit</span>
              </Label>
              <Input
                type="number"
                min="0"
                className="mt-2 rounded-2xl border-gray-200 h-11"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="ex: 5000"
              />
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

          {/* Progress bar */}
          {saving && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>{uploadProgress < 100 ? "Envoi du fichier…" : "Traitement sur le serveur…"}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {uploadProgress === 100 && (
                <p className="text-[10px] text-gray-400 text-center">Upload terminé — finalisation en cours…</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-2xl flex-1 h-11 font-bold" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button className="rounded-2xl flex-1 h-11 font-bold bg-gradient-to-r from-orange-500 to-amber-500 border-0"
              onClick={handleSave} disabled={saving}>
              {saving ? (uploadProgress < 100 ? `${uploadProgress}%` : "Finalisation…") : "Enregistrer"}
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
