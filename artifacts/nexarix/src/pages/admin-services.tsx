import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, LayoutGrid, ImagePlus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const emptyForm = { title: "", description: "", linkUrl: "", isActive: true, order: "0" };

const card = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

export default function AdminServices() {
  const { token } = useAuth() as any;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setImage(null);
    setImagePreview(null);
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      linkUrl: item.linkUrl,
      isActive: item.isActive,
      order: String(item.order ?? 0),
    });
    setImage(null);
    setImagePreview(item.imageUrl || null);
    setOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImage(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Le titre est requis", variant: "destructive" }); return; }
    if (!form.linkUrl) { toast({ title: "Le lien est requis", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("linkUrl", form.linkUrl);
      fd.append("isActive", String(form.isActive));
      fd.append("order", form.order);
      if (image) fd.append("image", image);

      const url = editItem ? `/api/admin/services/${editItem.id}` : "/api/admin/services";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Erreur serveur");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: editItem ? "✅ Service mis à jour" : "✅ Service créé" });
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
      await fetch(`/api/admin/services/${deleteId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "🗑️ Service supprimé" });
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
            {items?.length || 0} service(s) au total
          </span>
          <Button onClick={openCreate} className="rounded-2xl h-10 font-bold shadow-md shadow-sky-200/50 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-0">
            <Plus className="h-4 w-4 mr-1.5" />Nouveau service
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : !items?.length ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucun service</p>
            <p className="text-sm text-gray-400">Ajoutez votre premier service Divers.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <motion.div key={item.id} custom={i} variants={card} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 p-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                      : <LayoutGrid className="h-6 w-6 text-white" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-black text-gray-900 truncate">{item.title}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", item.isActive ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
                        {item.isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 truncate">{item.description}</p>
                    )}
                    <a href={item.linkUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-sky-500 font-semibold mt-0.5 hover:underline">
                      <ExternalLink className="h-3 w-3" />{item.linkUrl}
                    </a>
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
            <DialogTitle className="font-black text-lg">{editItem ? "Modifier le service" : "Nouveau service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Image upload */}
            <div>
              <Label className="text-sm font-bold text-gray-700">Image</Label>
              <div className="mt-2">
                <input ref={imgInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-gray-200 hover:border-sky-300 transition-all overflow-hidden group"
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Image" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImagePlus className="h-6 w-6 text-white" />
                        <span className="text-white text-xs font-bold ml-2">Changer</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <ImagePlus className="h-8 w-8 text-gray-300 group-hover:text-sky-400 transition-colors" />
                      <span className="text-xs font-semibold text-gray-400">Cliquez pour ajouter une image</span>
                      <span className="text-[10px] text-gray-300">JPG, PNG, WebP</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Titre <span className="text-red-400">*</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom du service…" />
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Description <span className="font-normal text-gray-400">(optionnel)</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Courte description…" />
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700">Lien <span className="text-red-400">*</span></Label>
              <Input className="mt-2 rounded-2xl border-gray-200 h-11" value={form.linkUrl}
                onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://…" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="svc-active" />
                <Label htmlFor="svc-active" className="text-sm font-bold text-gray-700 cursor-pointer">Actif</Label>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500">Ordre d'affichage</Label>
                <Input type="number" className="mt-1 rounded-2xl border-gray-200 h-10" value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: e.target.value }))} placeholder="0" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-2xl flex-1 h-11 font-bold" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="rounded-2xl flex-1 h-11 font-bold bg-gradient-to-r from-sky-500 to-blue-600 border-0"
              onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Supprimer ce service ?</AlertDialogTitle>
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
