import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetAdminWithdrawals, useApproveWithdrawal, useRejectWithdrawal,
  useGetAdminSettings, getGetAdminWithdrawalsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Clock, Wallet, Zap, AlertTriangle,
  Phone, Calendar, ArrowRight, User, Ban,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function fmt(v: number) {
  return `${(v || 0).toLocaleString("fr-FR")} F`;
}

const STATUS_CONFIG = {
  pending:  { label: "En attente", pillCls: "bg-amber-100 text-amber-700 border-amber-200",   Icon: Clock,        topBar: "bg-amber-400"   },
  paid:     { label: "Payé",       pillCls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: CheckCircle2, topBar: "bg-emerald-500" },
  rejected: { label: "Rejeté",    pillCls: "bg-red-100 text-red-600 border-red-200",           Icon: Ban,          topBar: "bg-red-500"     },
};

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  queued:           { label: "En file",     cls: "bg-blue-100 text-blue-700 border-blue-200"       },
  processing:       { label: "En cours",    cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  provider_pending: { label: "Fournisseur", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  completed:        { label: "Confirmé ✓",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed:           { label: "Échoué ✗",    cls: "bg-red-100 text-red-700 border-red-200"          },
  reversed:         { label: "Remboursé",   cls: "bg-orange-100 text-orange-700 border-orange-200" },
  cancelled:        { label: "Annulé",      cls: "bg-gray-100 text-gray-500 border-gray-200"       },
};

const card = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: withdrawals, isLoading } = useGetAdminWithdrawals({ status: statusFilter || undefined });
  const { data: settings } = useGetAdminSettings();
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal  = useRejectWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rejectData, setRejectData] = useState<{ id: number; reason: string } | null>(null);
  const [confirmAutoId, setConfirmAutoId] = useState<number | null>(null);
  const [codeConfirm, setCodeConfirm] = useState<{ id: number; code: string } | null>(null);

  const isAutoMode = settings?.paymentMode === "auto";
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });

  const doApprove = (id: number, confirmationCode: string) => {
    approveWithdrawal.mutate({ withdrawalId: id, data: { confirmationCode } }, {
      onSuccess: (data: any) => {
        invalidate();
        if (data?.payoutError) {
          toast({ title: "⚠️ Payout échoué — retrait resté en attente", description: `${data.payoutError}. Rechargez votre solde Sendavapay puis réessayez.`, variant: "destructive" });
        } else if (isAutoMode) {
          toast({ title: "⚡ Payout automatique déclenché" });
        } else {
          toast({ title: "✅ Retrait validé" });
        }
        setConfirmAutoId(null);
        setCodeConfirm(null);
      },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  // Étape 1 : si mode auto, on demande d'abord confirmation ; étape 2 (toujours) : code secret
  const handleApproveClick = (id: number) => {
    if (isAutoMode) setConfirmAutoId(id);
    else setCodeConfirm({ id, code: "" });
  };

  const handleAutoConfirmed = () => {
    if (confirmAutoId === null) return;
    setCodeConfirm({ id: confirmAutoId, code: "" });
    setConfirmAutoId(null);
  };

  const handleCodeSubmit = () => {
    if (!codeConfirm) return;
    if (!codeConfirm.code.trim()) {
      toast({ title: "Code requis", variant: "destructive" });
      return;
    }
    doApprove(codeConfirm.id, codeConfirm.code.trim());
  };

  const handleReject = () => {
    if (!rejectData?.reason.trim()) {
      toast({ title: "Motif requis", variant: "destructive" });
      return;
    }
    rejectWithdrawal.mutate(
      { withdrawalId: rejectData.id, data: { reason: rejectData.reason } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "⛔ Retrait rejeté" });
          setRejectData(null);
        },
        onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
      },
    );
  };

  const list = withdrawals || [];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Barre de contrôle ─────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="font-black text-gray-900 text-xl">Retraits</h1>
            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">
              {list.length} demande{list.length !== 1 ? "s" : ""}
            </span>
            {isAutoMode && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">
                <Zap className="h-3 w-3" /> Auto
              </span>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-42 h-10 rounded-2xl border-gray-200 bg-white font-bold text-sm">
              <SelectValue placeholder="Filtrer…" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="">Tous</SelectItem>
              <SelectItem value="pending">⏳ En attente</SelectItem>
              <SelectItem value="paid">✅ Payés</SelectItem>
              <SelectItem value="rejected">⛔ Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Liste ─────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[180px] bg-white rounded-[20px] border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg">Aucun retrait</p>
            <p className="text-gray-400 text-sm mt-1">Changez le filtre pour voir d'autres statuts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((w: any, i: number) => {
              const cfg      = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const StatusIcon = cfg.Icon;
              const payoutCfg  = w.sendavapayStatus ? PAYOUT_STATUS[w.sendavapayStatus] : null;
              const isPending  = w.status === "pending";

              return (
                <motion.div
                  key={w.id}
                  custom={i}
                  variants={card}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Barre colorée selon statut */}
                  <div className={`h-1 w-full ${cfg.topBar}`} />

                  <div className="p-4 space-y-3">

                    {/* ── Ligne 1 : utilisateur + badges + date ── */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-[15px] leading-tight truncate">{w.username}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.pillCls}`}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {cfg.label}
                            </span>
                            {payoutCfg && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${payoutCfg.cls}`}>
                                <Zap className="h-2.5 w-2.5" />
                                {payoutCfg.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {w.createdAt && (
                        <div className="flex items-center gap-1 text-gray-400 shrink-0">
                          <Calendar className="h-3 w-3" />
                          <span className="text-[11px] font-medium">
                            {format(new Date(w.createdAt), "dd MMM, HH:mm", { locale: fr })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Ligne 2 : opérateur + téléphone ── */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                        <Wallet className="h-3 w-3 text-gray-400" />
                        <span className="text-[12px] font-semibold text-gray-700">{w.operator || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-[12px] font-semibold text-gray-700">{w.phone || "—"}</span>
                      </div>
                    </div>

                    {/* ── Ligne 3 : montants ── */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                      <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Brut</p>
                        <p className="font-black text-gray-700 text-[14px]">{fmt(w.amountGross)}</p>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                        <p className="text-[9px] font-bold text-red-400">−5%</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Frais</p>
                        <p className="font-black text-red-500 text-[14px]">{fmt(w.fee)}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Net envoyé</p>
                        <p className="font-black text-emerald-600 text-[16px]">{fmt(w.amountNet)}</p>
                      </div>
                    </div>

                    {/* Référence Sendavapay si présente */}
                    {w.sendavapayReference && (
                      <p className="text-[10px] text-gray-400 font-mono truncate px-1">
                        Réf: {w.sendavapayReference}
                      </p>
                    )}

                    {/* Motif de rejet si rejeté */}
                    {w.rejectionReason && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-600 font-medium">{w.rejectionReason}</p>
                      </div>
                    )}

                    {/* ── Boutons d'action (uniquement si en attente) ── */}
                    {isPending && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* REJETER */}
                        <button
                          onClick={() => setRejectData({ id: w.id, reason: "" })}
                          className="flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-black text-[13px] hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.97]"
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeter
                        </button>

                        {/* VALIDER */}
                        <button
                          onClick={() => handleApproveClick(w.id)}
                          disabled={approveWithdrawal.isPending}
                          className="flex items-center justify-center gap-2 h-11 rounded-2xl text-white font-black text-[13px] transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                          style={{
                            background: isAutoMode
                              ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                              : "linear-gradient(135deg, #10b981, #059669)",
                          }}
                        >
                          {approveWithdrawal.isPending ? (
                            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : isAutoMode ? (
                            <><Zap className="h-4 w-4" /> Valider auto</>
                          ) : (
                            <><CheckCircle2 className="h-4 w-4" /> Valider</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog : Rejeter ─────────────────────── */}
      <Dialog open={!!rejectData} onOpenChange={() => setRejectData(null)}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-[18px] flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </span>
              Rejeter le retrait
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              Motif de rejet <span className="text-red-500">*</span>
            </Label>
            <Input
              className="rounded-2xl border-gray-200 h-11"
              value={rejectData?.reason || ""}
              onChange={e => setRejectData(d => d ? { ...d, reason: e.target.value } : null)}
              onKeyDown={e => { if (e.key === "Enter") handleReject(); }}
              placeholder="Ex: Numéro incorrect, infos invalides…"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 pt-1">
            <button
              className="flex-1 h-11 rounded-2xl border border-gray-200 bg-white font-bold text-gray-700 text-sm hover:bg-gray-50 transition-all"
              onClick={() => setRejectData(null)}
            >
              Annuler
            </button>
            <button
              className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-all disabled:opacity-60 shadow-lg shadow-red-200"
              onClick={handleReject}
              disabled={rejectWithdrawal.isPending}
            >
              {rejectWithdrawal.isPending
                ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto" />
                : "Confirmer le rejet"
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Confirmation payout auto ────── */}
      <Dialog open={confirmAutoId !== null} onOpenChange={() => setConfirmAutoId(null)}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-[18px] flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-blue-600" />
              </span>
              Confirmer le payout auto
            </DialogTitle>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-relaxed">
              Le <strong>montant net</strong> sera envoyé directement sur le Mobile Money de l'utilisateur via Sendavapay.
              L'opération est <strong>irréversible</strong> une fois lancée.
            </p>
          </div>
          <DialogFooter className="gap-2 pt-1">
            <button
              className="flex-1 h-11 rounded-2xl border border-gray-200 bg-white font-bold text-gray-700 text-sm hover:bg-gray-50 transition-all"
              onClick={() => setConfirmAutoId(null)}
            >
              Annuler
            </button>
            <button
              className="flex-1 h-11 rounded-2xl text-white font-black text-sm transition-all disabled:opacity-60 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
              onClick={handleAutoConfirmed}
            >
              <Zap className="h-4 w-4" /> Continuer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Code de confirmation secret ─── */}
      <Dialog open={!!codeConfirm} onOpenChange={() => setCodeConfirm(null)}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-[18px] flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-indigo-600" />
              </span>
              Code de confirmation requis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Saisissez le code secret pour valider ce retrait{isAutoMode ? " et déclencher le payout automatique" : ""}.
            </p>
            <Label className="text-sm font-bold text-gray-700">
              Code secret <span className="text-red-500">*</span>
            </Label>
            <Input
              type="password"
              className="rounded-2xl border-gray-200 h-11 tracking-widest text-center font-bold"
              value={codeConfirm?.code || ""}
              onChange={e => setCodeConfirm(d => d ? { ...d, code: e.target.value } : null)}
              onKeyDown={e => { if (e.key === "Enter") handleCodeSubmit(); }}
              placeholder="••••••"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 pt-1">
            <button
              className="flex-1 h-11 rounded-2xl border border-gray-200 bg-white font-bold text-gray-700 text-sm hover:bg-gray-50 transition-all"
              onClick={() => setCodeConfirm(null)}
            >
              Annuler
            </button>
            <button
              className="flex-1 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm transition-all disabled:opacity-60 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              onClick={handleCodeSubmit}
              disabled={approveWithdrawal.isPending}
            >
              {approveWithdrawal.isPending
                ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><CheckCircle2 className="h-4 w-4" /> Confirmer</>
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
