import { useState } from "react";
import { useGetAdminUsers, useUpdateAdminUser, getGetAdminUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { data: users, isLoading } = useGetAdminUsers({});
  const updateUser = useUpdateAdminUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ balance: "", points: "", status: "", upline: "", password: "" });

  const filtered = (users || []).filter(u => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({ balance: user.balance.toString(), points: user.points.toString(), status: user.status, upline: user.upline || "", password: "" });
  };

  const handleSave = () => {
    if (!editUser) return;
    const updates: any = {};
    if (editForm.balance !== "") updates.balance = parseFloat(editForm.balance);
    if (editForm.points !== "") updates.points = parseInt(editForm.points);
    if (editForm.status) updates.status = editForm.status;
    if (editForm.upline !== undefined) updates.upline = editForm.upline || null;
    if (editForm.password) updates.password = editForm.password;

    updateUser.mutate({ userId: editUser.id, data: updates }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
        toast({ title: "Utilisateur mis a jour" });
        setEditUser(null);
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Mise a jour echouee", variant: "destructive" });
      },
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{users?.length || 0} membres inscrits</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-users" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
              <SelectItem value="banned">Banni</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <Card key={user.id} data-testid={`card-user-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{user.username}</p>
                        <Badge variant={user.status === "active" ? "default" : user.status === "banned" ? "destructive" : "secondary"} className="text-xs">
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{user.country}</span>
                        <span>{format(new Date(user.joinedAt), "dd/MM/yyyy")}</span>
                        <span>{user.totalDownlines} filleuls</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">XOF {user.balance.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{user.points} pts</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => openEdit(user)} data-testid={`button-edit-user-${user.id}`}>
                        <Edit className="h-3 w-3 mr-1" />Modifier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Aucun utilisateur trouve</div>}
          </div>
        )}
      </div>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier: {editUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Solde (XOF)</Label>
                <Input type="number" value={editForm.balance} onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))} data-testid="input-edit-balance" />
              </div>
              <div>
                <Label>Points</Label>
                <Input type="number" value={editForm.points} onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))} data-testid="input-edit-points" />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="banned">Banni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parrain (Upline)</Label>
              <Input value={editForm.upline} onChange={e => setEditForm(f => ({ ...f, upline: e.target.value }))} placeholder="Nom du parrain" data-testid="input-edit-upline" />
            </div>
            <div>
              <Label>Nouveau mot de passe (optionnel)</Label>
              <Input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Laisser vide pour ne pas changer" data-testid="input-edit-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={updateUser.isPending} data-testid="button-save-user">
              {updateUser.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
