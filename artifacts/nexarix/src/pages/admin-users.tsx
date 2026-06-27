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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search, UserCheck, Ban, KeyRound, Wallet, GitBranch, ShieldAlert,
  Phone, Mail, MapPin, Calendar, Users, TrendingUp, ChevronRight
} from "lucide-react";
import { format } from "date-fns";

type AdminUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  membership: string;
  balance: number;
  points: number;
  upline?: string | null;
  joinedAt: string;
  totalDownlines: number;
  isBanned?: boolean;
};

function StatusBadge({ status, isBanned }: { status: string; isBanned?: boolean }) {
  if (isBanned) return <Badge variant="destructive" className="text-xs">Banni</Badge>;
  if (status === "active") return <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600">Actif</Badge>;
  if (status === "inactive") return <Badge variant="secondary" className="text-xs">Inactif</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("compte");

  // Form states per tab
  const [balanceInput, setBalanceInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [uplineInput, setUplineInput] = useState("");
  const [statusInput, setStatusInput] = useState("");

  const { data: users = [], isLoading } = useGetAdminUsers({});
  const updateUser = useUpdateAdminUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filtered = (users as AdminUser[]).filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "banned" ? u.isBanned : u.status === statusFilter && !u.isBanned);
    return matchSearch && matchStatus;
  });

  const openUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActiveTab("compte");
    setBalanceInput(user.balance.toString());
    setPointsInput(user.points.toString());
    setPasswordInput("");
    setConfirmPasswordInput("");
    setUplineInput(user.upline || "");
    setStatusInput(user.status);
  };

  const mutate = (data: Record<string, unknown>, successMsg: string) => {
    if (!selectedUser) return;
    updateUser.mutate(
      { userId: selectedUser.id, data: data as any },
      {
        onSuccess: (updated: any) => {
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
          setSelectedUser({ ...selectedUser, ...updated });
          toast({ title: "✅ " + successMsg });
        },
        onError: (err: any) => {
          toast({ title: "Erreur", description: err?.data?.error || "Échec", variant: "destructive" });
        },
      }
    );
  };

  const handleActivate = (user: AdminUser) => {
    updateUser.mutate(
      { userId: user.id, data: { status: "active", isBanned: false } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
          toast({ title: "✅ Compte activé" });
        },
        onError: (err: any) => {
          toast({ title: "Erreur", description: err?.data?.error || "Échec", variant: "destructive" });
        },
      }
    );
  };

  const handleBan = (user: AdminUser) => {
    updateUser.mutate(
      { userId: user.id, data: { isBanned: true, status: "banned" } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
          toast({ title: "⛔ Compte banni" });
        },
        onError: (err: any) => {
          toast({ title: "Erreur", description: err?.data?.error || "Échec", variant: "destructive" });
        },
      }
    );
  };

  const handleSaveFinances = () => {
    const updates: Record<string, unknown> = {};
    const b = parseFloat(balanceInput);
    const p = parseInt(pointsInput);
    if (!isNaN(b)) updates.balance = b;
    if (!isNaN(p)) updates.points = p;
    mutate(updates, "Solde et points mis à jour");
  };

  const handleSavePassword = () => {
    if (!passwordInput) { toast({ title: "Erreur", description: "Mot de passe vide", variant: "destructive" }); return; }
    if (passwordInput !== confirmPasswordInput) { toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    if (passwordInput.length < 6) { toast({ title: "Erreur", description: "Min. 6 caractères", variant: "destructive" }); return; }
    mutate({ password: passwordInput }, "Mot de passe réinitialisé");
    setPasswordInput("");
    setConfirmPasswordInput("");
  };

  const handleSaveUpline = () => {
    mutate({ upline: uplineInput || null }, "Parrain mis à jour");
  };

  const handleSaveStatus = () => {
    const isBanned = statusInput === "banned";
    mutate({ status: isBanned ? "banned" : statusInput, isBanned }, "Statut mis à jour");
  };

  const counts = {
    all: (users as AdminUser[]).length,
    active: (users as AdminUser[]).filter(u => u.status === "active" && !u.isBanned).length,
    inactive: (users as AdminUser[]).filter(u => u.status === "inactive").length,
    banned: (users as AdminUser[]).filter(u => u.isBanned).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestion des utilisateurs</h1>
            <p className="text-muted-foreground text-sm mt-1">{counts.all} membres inscrits</p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{counts.active}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Actifs</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{counts.inactive}</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">Inactifs</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{counts.banned}</p>
              <p className="text-xs text-red-700 dark:text-red-400">Bannis</p>
            </CardContent>
          </Card>
        </div>

        {/* Recherche & Filtre */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher par username, email ou téléphone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous ({counts.all})</SelectItem>
              <SelectItem value="active">Actifs ({counts.active})</SelectItem>
              <SelectItem value="inactive">Inactifs ({counts.inactive})</SelectItem>
              <SelectItem value="banned">Bannis ({counts.banned})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-12 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <Card
                key={user.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{
                  borderLeftColor: user.isBanned
                    ? "rgb(239,68,68)"
                    : user.status === "active"
                    ? "rgb(16,185,129)"
                    : "rgb(156,163,175)",
                }}
                onClick={() => openUser(user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info principale */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{user.username}</span>
                        <StatusBadge status={user.status} isBanned={user.isBanned} />
                        {user.upline && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {user.upline}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                        <span className="flex items-center gap-1 hidden sm:flex"><Phone className="h-3 w-3" />{user.phone}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{user.balance.toLocaleString()} XOF</p>
                      <p className="text-xs text-muted-foreground">{user.points} pts · {user.totalDownlines} filleuls</p>
                    </div>

                    {/* Actions rapides */}
                    <div className="flex items-center gap-1 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                      {(!user.isBanned && user.status !== "active") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleActivate(user)}
                          disabled={updateUser.isPending}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />Activer
                        </Button>
                      )}
                      {!user.isBanned && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => handleBan(user)}
                          disabled={updateUser.isPending}
                        >
                          <Ban className="h-3 w-3 mr-1" />Bannir
                        </Button>
                      )}
                      {user.isBanned && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleActivate(user)}
                          disabled={updateUser.isPending}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />Débannir
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal profil utilisateur */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">{selectedUser?.username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-bold">{selectedUser?.username}</p>
                <p className="text-xs font-normal text-muted-foreground">{selectedUser?.email}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={selectedUser?.status || ""} isBanned={selectedUser?.isBanned} />
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Infos résumé */}
          <div className="grid grid-cols-3 gap-2 text-center py-2">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-sm font-bold">{selectedUser?.balance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XOF</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-sm font-bold">{selectedUser?.points}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-sm font-bold">{selectedUser?.totalDownlines}</p>
              <p className="text-xs text-muted-foreground">Filleuls</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pb-2">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedUser?.country}</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedUser?.phone}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
              {selectedUser ? format(new Date(selectedUser.joinedAt), "dd/MM/yyyy") : ""}
            </span>
            {selectedUser?.upline && (
              <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />Parrain: {selectedUser.upline}</span>
            )}
          </div>

          <Separator />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="compte" className="text-xs flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />Compte
              </TabsTrigger>
              <TabsTrigger value="finances" className="text-xs flex items-center gap-1">
                <Wallet className="h-3 w-3" />Finances
              </TabsTrigger>
              <TabsTrigger value="securite" className="text-xs flex items-center gap-1">
                <KeyRound className="h-3 w-3" />Sécurité
              </TabsTrigger>
              <TabsTrigger value="parrainage" className="text-xs flex items-center gap-1">
                <GitBranch className="h-3 w-3" />Parrainage
              </TabsTrigger>
            </TabsList>

            {/* Onglet Compte */}
            <TabsContent value="compte" className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-medium">Statut du compte</Label>
                <Select value={statusInput} onValueChange={setStatusInput}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="banned">Banni</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Passer à "Actif" déclenche automatiquement les commissions MLM si un parrain est défini.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleSaveStatus}
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? "Enregistrement..." : "Appliquer le statut"}
              </Button>
              <Separator />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => selectedUser && handleActivate(selectedUser)}
                  disabled={updateUser.isPending || selectedUser?.status === "active"}
                >
                  <UserCheck className="h-4 w-4 mr-2" />Activer le compte
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => selectedUser && handleBan(selectedUser)}
                  disabled={updateUser.isPending || !!selectedUser?.isBanned}
                >
                  <Ban className="h-4 w-4 mr-2" />Bannir le compte
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Finances */}
            <TabsContent value="finances" className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="balance">Solde (FCFA)</Label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="balance"
                    type="number"
                    className="pl-9"
                    value={balanceInput}
                    onChange={e => setBalanceInput(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={pointsInput}
                  onChange={e => setPointsInput(e.target.value)}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Modification directe du solde et des points. Ces changements sont immédiats.
              </p>
              <Button className="w-full" onClick={handleSaveFinances} disabled={updateUser.isPending}>
                {updateUser.isPending ? "Enregistrement..." : "Mettre à jour le solde"}
              </Button>
            </TabsContent>

            {/* Onglet Sécurité */}
            <TabsContent value="securite" className="space-y-4 pt-2">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                <KeyRound className="h-4 w-4 inline mr-1" />
                Le nouveau mot de passe sera appliqué immédiatement. L'utilisateur devra l'utiliser pour sa prochaine connexion.
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Minimum 6 caractères"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPasswordInput}
                  onChange={e => setConfirmPasswordInput(e.target.value)}
                  placeholder="Répéter le mot de passe"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSavePassword}
                disabled={updateUser.isPending || !passwordInput}
                variant="destructive"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {updateUser.isPending ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </Button>
            </TabsContent>

            {/* Onglet Parrainage */}
            <TabsContent value="parrainage" className="space-y-4 pt-2">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
                <GitBranch className="h-4 w-4 inline mr-1" />
                Changer le parrain reconstitue l'arbre MLM. Les commissions futures seront redistribuées vers le nouveau parrain. Les commissions passées ne sont pas affectées.
              </div>
              <div className="space-y-1">
                <Label htmlFor="upline">Username du parrain</Label>
                <Input
                  id="upline"
                  value={uplineInput}
                  onChange={e => setUplineInput(e.target.value)}
                  placeholder="Laisser vide pour supprimer le parrain"
                />
                {selectedUser?.upline && (
                  <p className="text-xs text-muted-foreground">Parrain actuel : <strong>{selectedUser.upline}</strong></p>
                )}
                {!selectedUser?.upline && (
                  <p className="text-xs text-muted-foreground">Aucun parrain actuellement défini</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveUpline} disabled={updateUser.isPending}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  {updateUser.isPending ? "Enregistrement..." : "Définir le parrain"}
                </Button>
                {uplineInput && (
                  <Button
                    variant="outline"
                    onClick={() => { setUplineInput(""); }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Supprimer
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
