import { useState } from "react";
import { motion } from "framer-motion";
import { useGetAdminWithdrawals, useApproveWithdrawal, useRejectWithdrawal, getGetAdminWithdrawalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, User, Wallet } from "lucide-react";
import { format } from "date-fns";

function formatFcfa(v: number) { return `${(v || 0).toLocaleString("fr-FR")} XOF`; }

const STATUS_CONFIG = {
  pending:  { label: "En attente", bg: "bg-amber-50 border-amber-100",  pill: "bg-amber-100 text-amber-700",    Icon: Clock },
  paid:     { label: "Payé",       bg: "bg-emerald-50 border-emerald-100", pill: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  rejected: { label: "Rejeté",    bg: "bg-red-50 border-red-100",       pill: "bg-red-100 text-red-600",         Icon: XCircle },
};

const card = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }),
};

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: withdrawals, isLoading } = useGetAdminWithdrawals({ status: statusFilter || undefined });
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectData, setRejectData] = useState<{ id: number; reason: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });

  const handleApprove = (id: number) => {
    approveWithdrawal.mutate({ withdrawalId: id }, {
      onSuccess: () => { invalidate(); toast({ title: "✅ Retrait validé comme payé" }); },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
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

        {/* Filter bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-400">{withdrawals?.length || 0} demande{(withdrawals?.length || 0) !== 1 ? "s" : ""}</p>
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
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
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
              return (
                <motion.div key={w.id} custom={i} variants={card} initial="hidden" animate="visible"
                  className={`rounded-2xl border ${cfg.bg} overflow-hidden shadow-sm`}
                  data-testid={`card-withdrawal-${w.id}`}>
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
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          <span>Type: <span className="font-bold text-gray-700">{w.type}</span></span>
                          <span>Opérateur: <span className="font-bold text-gray-700">{w.operator}</span></span>
                          <span>Tél: <span className="font-bold text-gray-700">{w.phone}</span></span>
                          <span>{format(new Date(w.createdAt), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                        {w.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />Motif: {w.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Amounts + Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right bg-white rounded-xl p-2.5 border border-gray-200 min-w-[110px]">
                          <p className="text-xs text-gray-400 font-medium">Brut</p>
                          <p className="text-sm font-bold text-gray-900">{formatFcfa(w.amountGross)}</p>
                          <p className="text-[11px] text-gray-400">Frais: {formatFcfa(w.fee)}</p>
                          <p className="text-sm font-black text-emerald-600">Net: {formatFcfa(w.amountNet)}</p>
                        </div>
                        {w.status === "pending" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline"
                              className="h-8 text-xs rounded-xl border-red-200 text-red-500 hover:bg-red-50 font-bold"
                              onClick={() => setRejectData({ id: w.id, reason: "" })}
                              data-testid={`button-reject-${w.id}`}>
                              <XCircle className="h-3 w-3 mr-1" />Rejeter
                            </Button>
                            <Button size="sm"
                              className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-0"
                              onClick={() => handleApprove(w.id)}
                              disabled={approveWithdrawal.isPending}
                              data-testid={`button-approve-${w.id}`}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Valider
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
              data-testid="input-reject-reason"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl flex-1 font-bold" onClick={() => setRejectData(null)}>Annuler</Button>
            <Button className="rounded-2xl flex-1 font-bold bg-red-500 hover:bg-red-600 border-0"
              onClick={handleReject} disabled={rejectWithdrawal.isPending} data-testid="button-confirm-reject">
              {rejectWithdrawal.isPending ? "Rejet…" : "Confirmer le rejet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
