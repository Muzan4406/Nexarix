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
import { Plus, Edit, Trash2, ShoppingBag, Upload, Download, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["app", "game", "tool", "other"];
const FILE_TYPES = ["apk", "pdf", "zip", "exe", "other"];

const emptyForm = {
  title: "", description: "", category: "app", price: "0", isFree: true,
  thumbnailUrl: "", downloadUrl: "", fileType: "apk", version: "", fileSize: "",
  isActive: true, isPremium: true, order: "0",
};

const card = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
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
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-store"],
    queryFn: async () => {
      const res = await fetch("/api/admin/store", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setFile(null); setUploadMode("url"); setOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title, description: item.description || "", category: item.category,
      price: String(item.price || 0), isFree: item.isFree, thumbnailUrl: item.thumbnailUrl || "",
      downloadUrl: item.downloadUrl || "", fileType: item.fileType || "apk",
      version: item.version || "", fileSize: item.fileSize || "",
      isActive: item.isActive, isPremium: item.isPremium, order: String(item.order || 0),
    });
    setFile(null);
    setUploadMode(item.downloadUrl?.startsWith("/api/") ? "file" : "url");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Le titre est requis", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append("file", file);

      const url = editItem ? `/api/admin/store/${editItem.id}` : "/api/admin/store";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur"); }

      queryClient.invalidateQueries({ queryKey: ["admin-store"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast({ title: editItem ? "✅ Article mis à jour" : "✅ Article créé" });
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
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {items?.length || 0} article(s) au total
            </span>
          </div>
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
                      {item.version && <span>v{item.version}</span>}
                      {item.downloadUrl && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Download className="h-3 w-3" />Lien configuré
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
            <div>
              <Label className="text-sm font-bold text-gray-700">Titre</Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom de l'application…" />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Description <span className="font-normal text-gray-400">(optionnel)</span></Label>
              <Textarea className="mt-2 rounded-2xl border-gray-200 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Décrivez l'application…" />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-bold text-gray-700">Version</Label>
                <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0.0" />
              </div>
              <div>
                <Label className="text-sm font-bold text-gray-700">Taille</Label>
                <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.fileSize} onChange={e => setForm(f => ({ ...f, fileSize: e.target.value }))} placeholder="45 MB" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Image miniature <span className="font-normal text-gray-400">(URL, optionnel)</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.thumbnailUrl} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://…" />
            </div>

            {/* Download link: URL or File upload */}
            <div>
              <Label className="text-sm font-bold text-gray-700">Fichier à télécharger</Label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setUploadMode("url")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all",
                    uploadMode === "url" ? "bg-purple-50 border-purple-300 text-purple-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" />Lien externe
                </button>
                <button
                  onClick={() => setUploadMode("file")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all",
                    uploadMode === "file" ? "bg-purple-50 border-purple-300 text-purple-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />Upload direct
                </button>
              </div>
              {uploadMode === "url" ? (
                <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.downloadUrl}
                  onChange={e => setForm(f => ({ ...f, downloadUrl: e.target.value }))}
                  placeholder="https://drive.google.com/… ou lien direct" />
              ) : (
                <div className="mt-2">
                  <input ref={fileInputRef} type="file" className="hidden" accept=".apk,.pdf,.zip,.exe,*"
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-2xl py-4 flex flex-col items-center gap-2 transition-all group">
                    <Upload className="h-6 w-6 text-gray-300 group-hover:text-purple-400 transition-colors" />
                    <span className="text-xs font-semibold text-gray-400">
                      {file ? file.name : "Cliquez pour choisir un fichier (APK, PDF, ZIP…)"}
                    </span>
                    {file && <span className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                  </button>
                </div>
              )}
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
                <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="5000" />
              </div>
            )}
            <div>
              <Label className="text-sm font-bold text-gray-700">Ordre d'affichage</Label>
              <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-2xl flex-1 h-11 font-bold" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="rounded-2xl flex-1 h-11 font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 border-0"
              onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
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
