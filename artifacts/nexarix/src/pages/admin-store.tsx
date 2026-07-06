import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, ShoppingBag, Upload, Download, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["app", "game", "tool", "other"];
const FILE_TYPES = ["apk", "pdf", "zip", "exe", "other"];

const emptyForm = {
  title: "", category: "app", price: "0", isFree: true,
  fileType: "apk", fileSize: "",
  isActive: true, isPremium: true,
};

const card = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

export default function AdminStore() {
  const { token } = useAuth() as any;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-store"],
    queryFn: async () => {
      const res = await fetch("/api/admin/store", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });

  const openCreate = () => {
    setEditItem(null); setForm(emptyForm);
    setFile(null); setThumbnail(null); setThumbnailPreview(null);
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title, category: item.category,
      price: String(item.price || 0), isFree: item.isFree,
      fileType: item.fileType || "apk", fileSize: item.fileSize || "",
      isActive: item.isActive, isPremium: item.isPremium,
    });
    setFile(null);
    setThumbnail(null);
    setThumbnailPreview(item.thumbnailUrl || null);
    setOpen(true);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnail(f);
    setThumbnailPreview(URL.createObjectURL(f));
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
      const totalFiles = (file ? 1 : 0) + (thumbnail ? 1 : 0);
      let doneFiles = 0;

      const makeProgress = (pct: number) => {
        // Overall progress: each file counts equally
        const base = totalFiles > 0 ? (doneFiles / totalFiles) * 100 : 0;
        const chunk = totalFiles > 0 ? pct / totalFiles : pct;
        setUploadProgress(Math.round(base + chunk));
      };

      let downloadUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      if (file) {
        downloadUrl = await uploadFileDirect(file, "store-files", (pct) => makeProgress(pct));
        doneFiles++;
        setUploadProgress(Math.round((doneFiles / Math.max(totalFiles, 1)) * 100));
      }

      if (thumbnail) {
        thumbnailUrl = await uploadFileDirect(thumbnail, "store-files", (pct) => makeProgress(pct));
        doneFiles++;
        setUploadProgress(Math.round((doneFiles / Math.max(totalFiles, 1)) * 100));
      }

      // Now submit the form metadata (no file — just URLs)
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("price", form.price);
      fd.append("isFree", String(form.isFree));
      fd.append("fileType", form.fileType);
      fd.append("fileSize", form.fileSize);
      fd.append("isActive", String(form.isActive));
      fd.append("isPremium", String(form.isPremium));
      if (downloadUrl) fd.append("downloadUrl", downloadUrl);
      if (thumbnailUrl) fd.append("thumbnailUrl", thumbnailUrl);

      const url = editItem ? `/api/admin/store/${editItem.id}` : "/api/admin/store";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });

      if (!res.ok) {
        let errorMsg = "Erreur serveur";
        try { const e = await res.json() as any; errorMsg = e.error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-store"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast({ title: editItem ? "✅ Article mis à jour" : "✅ Article créé" });
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
      await fetch(`/api/admin/store/${deleteId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ["admin-store"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast({ title: "🗑️ Article supprimé" });
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
            {items?.length || 0} article(s) au total
          </span>
          <Button onClick={openCreate} className="rounded-2xl h-10 font-bold shadow-md shadow-purple-200/50 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 border-0">
            <Plus className="h-4 w-4 mr-1.5" />Nouvel article
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : !items?.length ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucun article</p>
            <p className="text-sm text-gray-400">Ajoutez votre premier article au store.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <motion.div key={item.id} custom={i} variants={card} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 p-4">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                    {item.thumbnailUrl
                      ? <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                      : <ShoppingBag className="h-5 w-5 text-white" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-black text-gray-900 truncate">{item.title}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", item.isActive ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
                        {item.isActive ? "Actif" : "Inactif"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                        {item.fileType?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{item.isFree ? "Gratuit" : `${item.price?.toLocaleString()} FCFA`}</span>
                      {item.fileSize && <span>{item.fileSize}</span>}
                      {item.downloadUrl && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Download className="h-3 w-3" />Fichier configuré
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-gray-200" onClick={() => openEdit(item)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(item.id)}>
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
            <DialogTitle className="font-black text-lg">{editItem ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Cover image upload */}
            <div>
              <Label className="text-sm font-bold text-gray-700">Image de couverture</Label>
              <div className="mt-2">
                <input ref={thumbInputRef} type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-all overflow-hidden group"
                >
                  {thumbnailPreview ? (
                    <div className="relative">
                      <img src={thumbnailPreview} alt="Couverture" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImagePlus className="h-6 w-6 text-white" />
                        <span className="text-white text-xs font-bold ml-2">Changer</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <ImagePlus className="h-8 w-8 text-gray-300 group-hover:text-purple-400 transition-colors" />
                      <span className="text-xs font-semibold text-gray-400">Cliquez pour ajouter une image</span>
                      <span className="text-[10px] text-gray-300">JPG, PNG, WebP</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Titre</Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom de l'application…" />
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
                <Label className="text-sm font-bold text-gray-700">Type de fichier</Label>
                <Select value={form.fileType} onValueChange={v => setForm(f => ({ ...f, fileType: v }))}>
                  <SelectTrigger className="mt-2 rounded-2xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {FILE_TYPES.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Taille du fichier <span className="font-normal text-gray-400">(ex: 45 MB)</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.fileSize}
                onChange={e => setForm(f => ({ ...f, fileSize: e.target.value }))} placeholder="45 MB" />
            </div>

            {/* File upload only */}
            <div>
              <Label className="text-sm font-bold text-gray-700">Fichier à télécharger</Label>
              <div className="mt-2">
                <input ref={fileInputRef} type="file" className="hidden" accept=".apk,.pdf,.zip,.exe,*"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-2xl py-4 flex flex-col items-center gap-2 transition-all group">
                  <Upload className="h-6 w-6 text-gray-300 group-hover:text-purple-400 transition-colors" />
                  <span className="text-xs font-semibold text-gray-400">
                    {file ? file.name : editItem?.downloadUrl ? "Fichier déjà uploadé — cliquer pour remplacer" : "Cliquez pour choisir un fichier (APK, PDF, ZIP…)"}
                  </span>
                  {file && <span className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <Switch checked={form.isFree} onCheckedChange={v => setForm(f => ({ ...f, isFree: v }))} id="is-free" />
                <Label htmlFor="is-free" className="text-sm font-bold text-gray-700 cursor-pointer">Gratuit</Label>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="is-active" />
                <Label htmlFor="is-active" className="text-sm font-bold text-gray-700 cursor-pointer">Actif</Label>
              </div>
            </div>

            {!form.isFree && (
              <div>
                <Label className="text-sm font-bold text-gray-700">Prix (FCFA)</Label>
                <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="5000" />
              </div>
            )}
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
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300"
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
            <Button className="rounded-2xl flex-1 h-11 font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 border-0"
              onClick={handleSave} disabled={saving}>
              {saving ? (uploadProgress < 100 ? `${uploadProgress}%` : "Finalisation…") : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Supprimer cet article ?</AlertDialogTitle>
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
