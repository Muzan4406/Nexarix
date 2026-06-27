import { useState } from "react";
import { motion } from "framer-motion";
import { useGetAdminUsers, useUpdateAdminUser, useDeleteAdminUser, useRevokeAdminUserReferral, getGetAdminUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search, UserCheck, Ban, KeyRound, Wallet, GitBranch, ShieldAlert,
  Phone, Mail, MapPin, Calendar, Users, ChevronRight, Trash2, Unlink, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

type AdminUser = {
  id: number; username: string; email: string; phone: string; country: string;
  status: string; membership: string; balance: number; points: number;
  upline?: string | null; joinedAt: string; totalDownlines: number; isBanned?: boolean;
};

function StatusPill({ status, isBanned }: { status: string; isBanned?: boolean }) {
  if (isBanned) return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-200">Banni</span>;
  if (status === "active") return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">Actif</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Inactif</span>;
}

const card = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("compte");
  const [balanceInput, setBalanceInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [uplineInput, setUplineInput] = useState("");
  const [statusInput, setStatusInput] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading } = useGetAdminUsers({});
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const revokeReferral = useRevokeAdminUserReferral();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filtered = (users as AdminUser[]).filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
    const matchStatus = statusFilter === "all" || (statusFilter === "banned" ? u.isBanned : u.status === statusFilter && !u.isBanned);
    return matchSearch && matchStatus;
  });

  const openUser = (user: AdminUser) => {
    setSelectedUser(user); setActiveTab("compte");
    setBalanceInput(user.balance.toString()); setPointsInput(user.points.toString());
    setPasswordInput(""); setConfirmPasswordInput(""); setUplineInput(user.upline || ""); setStatusInput(user.status);
  };

  const mutate = (data: Record<string, unknown>, successMsg: string) => {
    if (!selectedUser) return;
    updateUser.mutate({ userId: selectedUser.id, data: data as any }, {
      onSuccess: (updated: any) => {
        queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
        setSelectedUser({ ...selectedUser, ...updated });
        toast({ title: "✅ " + successMsg });
      },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error || "Échec", variant: "destructive" }),
    });
  };

  const quickAction = (userId: number, data: Record<string, unknown>, msg: string) => {
    updateUser.mutate({ userId, data: data as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() }); toast({ title: msg }); },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error || "Échec", variant: "destructive" }),
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    deleteUser.mutate({ userId: user.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
        setSelectedUser(null);
        setConfirmDelete(null);
        toast({ title: "🗑️ Utilisateur supprimé définitivement" });
      },
      onError: (err: any) => {
        setConfirmDelete(null);
        toast({ title: "Erreur", description: err?.data?.error || "Échec de la suppression", variant: "destructive" });
      },
    });
  };

  const handleRevokeReferral = (user: AdminUser) => {
    revokeReferral.mutate({ userId: user.id }, {
      onSuccess: (updated: any) => {
        queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
        setSelectedUser({ ...selectedUser!, ...updated, upline: null });
        setConfirmRevoke(null);
        toast({ title: "✅ Parrainage révoqué — commissions annulées" });
      },
      onError: (err: any) => {
        setConfirmRevoke(null);
        toast({ title: "Erreur", description: err?.data?.error || "Échec", variant: "destructive" });
      },
    });
  };

  const counts = {
    all: (users as AdminUser[]).length,
    active: (users as AdminUser[]).filter(u => u.status === "active" && !u.isBanned).length,
    inactive: (users as AdminUser[]).filter(u => u.status === "inactive").length,
    banned: (users as AdminUser[]).filter(u => u.isBanned).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Actifs", value: counts.active, gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Inactifs", value: counts.inactive, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50 border-amber-100" },
            { label: "Bannis", value: counts.banned, gradient: "from-red-500 to-rose-600", bg: "bg-red-50 border-red-100" },
          ].map((s, i) => (
            <motion.div key={s.label} custom={i} variants={card} initial="hidden" animate="visible"
              className={`rounded-2xl border p-4 text-center ${s.bg}`}>
              <div className={`h-1.5 w-8 rounded-full bg-gradient-to-r ${s.gradient} mx-auto mb-3`} />
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-10 rounded-2xl border-gray-200 h-11 bg-white" placeholder="Rechercher par username, email ou téléphone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-38 rounded-2xl border-gray-200 h-11 bg-white font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Tous ({counts.all})</SelectItem>
              <SelectItem value="active">Actifs ({counts.active})</SelectItem>
              <SelectItem value="inactive">Inactifs ({counts.inactive})</SelectItem>
              <SelectItem value="banned">Bannis ({counts.banned})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((user, i) => (
              <motion.div key={user.id} custom={i} variants={card} initial="hidden" animate="visible"
                onClick={() => openUser(user)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Status bar */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${user.isBanned ? "bg-red-500" : user.status === "active" ? "bg-emerald-500" : "bg-gray-300"}`} />

                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm text-white shadow-md ${user.isBanned ? "bg-gradient-to-br from-red-500 to-rose-600" : user.status === "active" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-gray-400 to-gray-500"}`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{user.username}</span>
                      <StatusPill status={user.status} isBanned={user.isBanned} />
                      {user.upline && <span className="text-[11px] text-gray-400 flex items-center gap-1"><GitBranch className="h-3 w-3" />{user.upline}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                      <span className="hidden sm:flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-black text-gray-900">{user.balance.toLocaleString()} XOF</p>
                    <p className="text-xs text-gray-400">{user.points} pts · {user.totalDownlines} filleuls</p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {!user.isBanned && user.status !== "active" && (
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold"
                        onClick={() => quickAction(user.id, { status: "active", isBanned: false }, "✅ Compte activé")}
                        disabled={updateUser.isPending}>
                        <UserCheck className="h-3 w-3 mr-1" />Activer
                      </Button>
                    )}
                    {!user.isBanned && (
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs rounded-xl border-red-200 text-red-500 hover:bg-red-50 font-bold"
                        onClick={() => quickAction(user.id, { isBanned: true, status: "banned" }, "⛔ Compte banni")}
                        disabled={updateUser.isPending}>
                        <Ban className="h-3 w-3 mr-1" />Bannir
                      </Button>
                    )}
                    {user.isBanned && (
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold"
                        onClick={() => quickAction(user.id, { status: "active", isBanned: false }, "✅ Compte débanni")}
                        disabled={updateUser.isPending}>
                        <UserCheck className="h-3 w-3 mr-1" />Débannir
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300 ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* User modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl p-0">
          {selectedUser && (
            <>
              {/* Modal header */}
              <div className="p-6 bg-gradient-to-br from-[#0a0f1e] to-[#1565C0] text-white rounded-t-3xl">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg leading-tight">{selectedUser.username}</p>
                    <p className="text-blue-200 text-sm">{selectedUser.email}</p>
                  </div>
                  <StatusPill status={selectedUser.status} isBanned={selectedUser.isBanned} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-5">
                  <div className="bg-white/10 rounded-xl p-2.5 text-center">
                    <p className="font-black text-base">{selectedUser.balance.toLocaleString()}</p>
                    <p className="text-blue-300 text-xs">XOF</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 text-center">
                    <p className="font-black text-base">{selectedUser.points}</p>
                    <p className="text-blue-300 text-xs">Points</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 text-center">
                    <p className="font-black text-base">{selectedUser.totalDownlines}</p>
                    <p className="text-blue-300 text-xs">Filleuls</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Meta info */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4 p-3 bg-gray-50 rounded-2xl">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedUser.country}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedUser.phone}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(selectedUser.joinedAt), "dd/MM/yyyy")}</span>
                  {selectedUser.upline && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />Parrain: {selectedUser.upline}</span>}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full rounded-2xl bg-gray-100 p-1 h-auto">
                    <TabsTrigger value="compte" className="rounded-xl text-xs py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <ShieldAlert className="h-3 w-3 mr-1" />Compte
                    </TabsTrigger>
                    <TabsTrigger value="finances" className="rounded-xl text-xs py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Wallet className="h-3 w-3 mr-1" />Finances
                    </TabsTrigger>
                    <TabsTrigger value="securite" className="rounded-xl text-xs py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <KeyRound className="h-3 w-3 mr-1" />Sécu
                    </TabsTrigger>
                    <TabsTrigger value="parrainage" className="rounded-xl text-xs py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <GitBranch className="h-3 w-3 mr-1" />MLM
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="compte" className="space-y-4 pt-4">
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Statut du compte</Label>
                      <Select value={statusInput} onValueChange={setStatusInput}>
                        <SelectTrigger className="mt-2 rounded-2xl border-gray-200 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="inactive">Inactif</SelectItem>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="banned">Banni</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400 mt-1.5">Passer à "Actif" déclenche automatiquement les commissions MLM.</p>
                    </div>
                    <Button className="w-full rounded-2xl h-11 font-bold"
                      onClick={() => { const isBanned = statusInput === "banned"; mutate({ status: isBanned ? "banned" : statusInput, isBanned }, "Statut mis à jour"); }}
                      disabled={updateUser.isPending}>
                      {updateUser.isPending ? "Enregistrement…" : "Appliquer le statut"}
                    </Button>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1 rounded-2xl h-11 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold"
                        onClick={() => { setSelectedUser(null); quickAction(selectedUser.id, { status: "active", isBanned: false }, "✅ Compte activé"); }}
                        disabled={updateUser.isPending || selectedUser.status === "active"}>
                        <UserCheck className="h-4 w-4 mr-1" />Activer
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-2xl h-11 border-red-200 text-red-500 hover:bg-red-50 font-bold"
                        onClick={() => { setSelectedUser(null); quickAction(selectedUser.id, { isBanned: true, status: "banned" }, "⛔ Banni"); }}
                        disabled={updateUser.isPending || !!selectedUser.isBanned}>
                        <Ban className="h-4 w-4 mr-1" />Bannir
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="finances" className="space-y-4 pt-4">
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Solde (FCFA)</Label>
                      <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11"
                        value={balanceInput} onChange={e => setBalanceInput(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Points</Label>
                      <Input type="number" className="mt-2 rounded-2xl border-gray-200 h-11"
                        value={pointsInput} onChange={e => setPointsInput(e.target.value)} placeholder="0" />
                    </div>
                    <p className="text-xs text-gray-400">Modification directe — effet immédiat.</p>
                    <Button className="w-full rounded-2xl h-11 font-bold" disabled={updateUser.isPending}
                      onClick={() => { const updates: any = {}; const b = parseFloat(balanceInput); const p = parseInt(pointsInput); if (!isNaN(b)) updates.balance = b; if (!isNaN(p)) updates.points = p; mutate(updates, "Solde et points mis à jour"); }}>
                      {updateUser.isPending ? "Enregistrement…" : "Mettre à jour"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="securite" className="space-y-4 pt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0" />Le nouveau mot de passe sera appliqué immédiatement.
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Nouveau mot de passe</Label>
                      <Input type="password" className="mt-2 rounded-2xl border-gray-200 h-11"
                        value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Min. 6 caractères" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Confirmer</Label>
                      <Input type="password" className="mt-2 rounded-2xl border-gray-200 h-11"
                        value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)} placeholder="Répéter le mot de passe" />
                    </div>
                    <Button variant="destructive" className="w-full rounded-2xl h-11 font-bold" disabled={updateUser.isPending || !passwordInput}
                      onClick={() => {
                        if (!passwordInput) return;
                        if (passwordInput !== confirmPasswordInput) { toast({ title: "Erreur", description: "Mots de passe différents", variant: "destructive" }); return; }
                        if (passwordInput.length < 6) { toast({ title: "Erreur", description: "Min. 6 caractères", variant: "destructive" }); return; }
                        mutate({ password: passwordInput }, "Mot de passe réinitialisé");
                        setPasswordInput(""); setConfirmPasswordInput("");
                      }}>
                      <KeyRound className="h-4 w-4 mr-2" />{updateUser.isPending ? "Réinitialisation…" : "Réinitialiser"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="parrainage" className="space-y-4 pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-700 flex items-center gap-2">
                      <GitBranch className="h-4 w-4 shrink-0" />Changer le parrain reconstitue l'arbre MLM pour les commissions futures.
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Nom du parrain actuel</Label>
                      <div className="mt-2 rounded-2xl border border-gray-200 h-11 px-3 flex items-center bg-gray-50">
                        <span className="text-sm font-semibold text-gray-600">
                          {selectedUser.upline || <span className="text-gray-400 font-normal">Aucun parrain</span>}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Changer le parrain</Label>
                      <Input className="mt-2 rounded-2xl border-gray-200 h-11"
                        value={uplineInput} onChange={e => setUplineInput(e.target.value)} placeholder="Nouveau username du parrain…" />
                    </div>
                    <Button className="w-full rounded-2xl h-11 font-bold" disabled={updateUser.isPending}
                      onClick={() => mutate({ upline: uplineInput || null }, "Parrain mis à jour")}>
                      {updateUser.isPending ? "Enregistrement…" : "Sauvegarder le parrain"}
                    </Button>

                    {selectedUser.upline && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Actions avancées</p>
                        <Button
                          variant="outline"
                          className="w-full rounded-2xl h-11 border-amber-200 text-amber-600 hover:bg-amber-50 font-bold"
                          disabled={revokeReferral.isPending}
                          onClick={() => setConfirmRevoke(selectedUser)}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Révoquer le parrainage + commissions
                        </Button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-red-100">
                      <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">Zone dangereuse</p>
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl h-11 border-red-200 text-red-600 hover:bg-red-50 font-bold"
                        disabled={deleteUser.isPending}
                        onClick={() => setConfirmDelete(selectedUser)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer définitivement l'utilisateur
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-0 shadow-2xl p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">Supprimer définitivement ?</p>
              <p className="text-sm text-gray-500 mt-1">
                L'utilisateur <span className="font-bold text-gray-700">{confirmDelete?.username}</span> sera supprimé de la base de données. Cette action est <span className="font-bold text-red-500">irréversible</span>.
              </p>
              {confirmDelete?.status === "active" && confirmDelete?.upline && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 text-left">
                  ⚠️ Les commissions MLM générées par cet utilisateur seront annulées pour son parrain et sa chaîne.
                </div>
              )}
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 rounded-2xl h-11 font-bold" onClick={() => setConfirmDelete(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-2xl h-11 font-bold"
                disabled={deleteUser.isPending}
                onClick={() => confirmDelete && handleDeleteUser(confirmDelete)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleteUser.isPending ? "Suppression…" : "Supprimer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Revoke Referral Dialog */}
      <Dialog open={!!confirmRevoke} onOpenChange={() => setConfirmRevoke(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-0 shadow-2xl p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Unlink className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">Révoquer le parrainage ?</p>
              <p className="text-sm text-gray-500 mt-1">
                Le lien de parrainage de <span className="font-bold text-gray-700">{confirmRevoke?.username}</span> avec <span className="font-bold text-gray-700">{confirmRevoke?.upline}</span> sera supprimé.
              </p>
              {confirmRevoke?.status === "active" && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 text-left">
                  ⚠️ Les commissions reversées au parrain (L1 : 1 300 F), au grand-parrain (L2 : 700 F) et à l'arrière-grand-parrain (L3 : 400 F) seront annulées.
                </div>
              )}
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 rounded-2xl h-11 font-bold" onClick={() => setConfirmRevoke(null)}>
                Annuler
              </Button>
              <Button
                className="flex-1 rounded-2xl h-11 font-bold bg-amber-500 hover:bg-amber-600 text-white"
                disabled={revokeReferral.isPending}
                onClick={() => confirmRevoke && handleRevokeReferral(confirmRevoke)}
              >
                <Unlink className="h-4 w-4 mr-1" />
                {revokeReferral.isPending ? "Révocation…" : "Révoquer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
