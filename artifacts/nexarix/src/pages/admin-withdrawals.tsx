import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetAdminWithdrawals, useApproveWithdrawal, useRejectWithdrawal,
  useGetAdminSettings, getGetAdminWithdrawalsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, User, Wallet, Zap, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

function formatFcfa(v: number) { return `${(v || 0).toLocaleString("fr-FR")} XOF`; }

const STATUS_CONFIG = {
  pending:  { label: "En attente", bg: "bg-amber-50 border-amber-100",     pill: "bg-amber-100 text-amber-700",     Icon: Clock },
  paid:     { label: "Payé",       bg: "bg-emerald-50 border-emerald-100", pill: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  rejected: { label: "Rejeté",    bg: "bg-red-50 border-red-100",          pill: "bg-red-100 text-red-600",         Icon: XCircle },
};

const PAYOUT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued:           { label: "En file",    color: "bg-blue-100 text-blue-700" },
  processing:       { label: "En cours",   color: "bg-indigo-100 text-indigo-700" },
  provider_pending: { label: "Fournisseur",color: "bg-purple-100 text-purple-700" },
  completed:        { label: "Confirmé ✓", color: "bg-emerald-100 text-emerald-700" },
  failed:           { label: "Échoué ✗",   color: "bg-red-100 text-red-700" },
  reversed:         { label: "Remboursé",  color: "bg-orange-100 text-orange-700" },
  cancelled:        { label: "Annulé",     color: "bg-gray-100 text-gray-600" },
};

const card = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: withdrawals, isLoading } = useGetAdminWithdrawals({ status: statusFilter || undefined });
  const { data: settings } = useGetAdminSettings();
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectData, setRejectData] = useState<{ id: number; reason: string } | null>(null);
  const [confirmAutoId, setConfirmAutoId] = useState<number | null>(null);

  const isAutoMode = settings?.paymentMode === "auto";
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });

  const doApprove = (id: number) => {
    approveWithdrawal.mutate({ withdrawalId: id }, {
      onSuccess: (data: any) => {
        invalidate();
        if (data?.payoutError) {
          toast({
            title: "⚠️ Retrait validé — payout échoué",
            description: data.payoutError,
            variant: "destructive",
          });
        } else if (isAutoMode) {
          toast({ title: "⚡ Payout automatique déclenché" });
        } else {
          toast({ title: "✅ Retrait validé comme payé" });
        }
        setConfirmAutoId(null);
      },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  const handleApproveClick = (id: number) => {
    if (isAutoMode) {
      setConfirmAutoId(id);
    } else {
      doApprove(id);
    }
  };

  const handleReject = () => {
    if (!rejectData || !rejectData.reason.trim()) { toast({ title: "Motif requis", variant: "destructive" }); return; }
    rejectWithdrawal.mutate({ withdrawalId: rejectData.id, data: { reason: rejectData.reason } }, {
      onSuccess: () => { invalidate(); toast({ title: "⛔ Retrait rejeté" }); setRejectData(null); },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-gray-400">{withdrawals?.length || 0} demande{(withdrawals?.length || 0) !== 1 ? "s" : ""}</p>
            {isAutoMode && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">
                <Zap className="h-3 w-3" />Payout automatique activé
              </span>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200 h-10 bg-white font-bold">
              <SelectValue placeholder="Filtrer…" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="paid">Payés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : (withdrawals || []).length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg">Aucun retrait</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(withdrawals || []).map((w: any, i: number) => {
              const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.Icon;
              const payoutCfg = w.sendavapayStatus ? PAYOUT_STATUS_CONFIG[w.sendavapayStatus] : null;
              return (
                <motion.div key={w.id} custom={i} variants={card} initial="hidden" animate="visible"
                  className={`rounded-2xl border ${cfg.bg} overflow-hidden shadow-sm`}>
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-11 w-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-black text-sm text-gray-900">{w.username}</span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.pill}`}>
                            <StatusIcon className="h-3 w-3" />{cfg.label}
                          </span>
                          {payoutCfg && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${payoutCfg.color}`}>
                              <Zap className="h-3 w-3" />{payoutCfg.label}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          <span>Opérateur: <span className="font-bold text-gray-700">{w.operator}</span></span>
                          <span>Téléphone: <span className="font-bold text-gray-700">{w.phone}</span></span>
                          {w.country && <span>Pays: <span className="font-bold text-gray-700">{w.country}</span></span>}
                          <span>{format(new Date(w.createdAt), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                        {w.sendavapayReference && (
                          <p className="text-[10px] text-gray-400 mt-1 font-mono truncate">
                            Réf: {w.sendavapayReference}
                          </p>
                        )}
                        {w.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />Motif: {w.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Amounts + Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right bg-white rounded-xl p-2.5 border border-gray-200 min-w-[120px]">
                          <p className="text-xs text-gray-400 font-medium">Brut</p>
                          <p className="text-sm font-semibold text-gray-600">{formatFcfa(w.amountGross)}</p>
                          <p className="text-[11px] text-gray-400">Frais 5%: -{formatFcfa(w.fee)}</p>
                          <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Envoyé</p>
                            <p className="text-base font-black text-emerald-600">{formatFcfa(w.amountNet)}</p>
                          </div>
                        </div>
                        {w.status === "pending" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline"
                              className="h-8 text-xs rounded-xl border-red-200 text-red-500 hover:bg-red-50 font-bold"
                              onClick={() => setRejectData({ id: w.id, reason: "" })}>
                              <XCircle className="h-3 w-3 mr-1" />Rejeter
                            </Button>
                            <Button size="sm"
                              className={`h-8 text-xs rounded-xl font-bold border-0 ${isAutoMode ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                              onClick={() => handleApproveClick(w.id)}
                              disabled={approveWithdrawal.isPending}>
                              {isAutoMode
                                ? <><Zap className="h-3 w-3 mr-1" />Valider auto</>
                                : <><CheckCircle2 className="h-3 w-3 mr-1" />Valider</>
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectData} onOpenChange={() => setRejectData(null)}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-500" />
              </span>
              Rejeter le retrait
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-sm font-bold text-gray-700">Motif de rejet <span className="text-red-500">*</span></Label>
            <Input
              className="mt-2 rounded-2xl border-gray-200 h-11"
              value={rejectData?.reason || ""}
              onChange={e => setRejectData(d => d ? { ...d, reason: e.target.value } : null)}
              placeholder="Ex: Numéro incorrect, solde insuffisant…"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl flex-1 font-bold" onClick={() => setRejectData(null)}>Annuler</Button>
            <Button className="rounded-2xl flex-1 font-bold bg-red-500 hover:bg-red-600 border-0"
              onClick={handleReject} disabled={rejectWithdrawal.isPending}>
              {rejectWithdrawal.isPending ? "Rejet…" : "Confirmer le rejet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-payout confirmation dialog */}
      <Dialog open={confirmAutoId !== null} onOpenChange={() => setConfirmAutoId(null)}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-600" />
              </span>
              Déclencher le payout automatique
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Ceci va envoyer le <strong>montant net</strong> directement sur le Mobile Money de l'utilisateur via Sendavapay. L'opération est irréversible une fois lancée.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl flex-1 font-bold" onClick={() => setConfirmAutoId(null)}>Annuler</Button>
            <Button
              className="rounded-2xl flex-1 font-bold bg-blue-600 hover:bg-blue-700 border-0"
              onClick={() => confirmAutoId !== null && doApprove(confirmAutoId)}
              disabled={approveWithdrawal.isPending}
            >
              {approveWithdrawal.isPending ? <><Zap className="h-4 w-4 mr-1 animate-pulse" />Envoi…</> : <><Zap className="h-4 w-4 mr-1" />Confirmer le payout</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
