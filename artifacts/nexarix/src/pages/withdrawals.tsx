import { useState } from "react";
import { useGetWithdrawals, useRequestWithdrawal, getGetWithdrawalsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, CheckCircle, XCircle, Wallet, Info } from "lucide-react";
import { format } from "date-fns";

const OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  "Togo": ["TMoney", "Moov Money"],
  "Bénin": ["MTN Mobile Money", "Moov Money"],
  "Côte d'Ivoire": ["Orange Money", "MTN", "Moov", "Wave"],
  "Cameroun": ["MTN MoMo", "Orange Money"],
  "Burkina Faso": ["Orange Money", "Moov Money"],
  "Mali": ["Orange Money", "Moov"],
  "Niger": ["Airtel Money", "Moov"],
  "Sénégal": ["Wave", "Orange Money", "Free Money"],
};

function formatFcfa(amount: number) { return `XOF ${amount.toLocaleString("fr-FR")}`; }

const STATUS_CONFIG = {
  pending: { label: "En attente", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", Icon: Clock },
  paid:    { label: "Payé",       bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", Icon: CheckCircle },
  rejected:{ label: "Rejeté",    bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", Icon: XCircle },
};

export default function Withdrawals() {
  const { user } = useAuth();
  const { data: withdrawals, isLoading } = useGetWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ operator: "", phone: "", amount: "" });

  const operators = user?.country ? (OPERATORS_BY_COUNTRY[user.country] || []) : [];

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!form.operator || !form.phone || !form.amount) {
      toast({ title: "Champs requis", description: "Tous les champs sont obligatoires", variant: "destructive" });
      return;
    }
    if (amount < 3000) {
      toast({ title: "Montant insuffisant", description: "Minimum 3 000 XOF requis", variant: "destructive" });
      return;
    }
    requestWithdrawal.mutate({ data: { type: "Balance", operator: form.operator, phone: form.phone, amount } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "✅ Demande envoyée", description: "Votre retrait est en cours de traitement" });
        setOpen(false);
        setForm({ operator: "", phone: "", amount: "" });
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Demande échouée", variant: "destructive" });
      },
    });
  };

  const feeEstimate = form.amount ? Math.round(parseFloat(form.amount) * 0.05) : 0;
  const netEstimate = form.amount ? Math.round(parseFloat(form.amount) - feeEstimate) : 0;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Retrait Solde</h1>
            <p className="text-muted-foreground text-sm">Min: 3 000 XOF · Frais plateforme: 5%</p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-semibold"
            data-testid="button-new-withdrawal"
          >
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
        </div>

        {/* Info règle */}
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Seul le solde disponible (FCFA) peut être retiré. Les points se convertissent en argent réel et sont ajoutés directement à votre solde.
          </p>
        </div>

        {/* Liste des retraits */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : !withdrawals?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <Wallet className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-400">Aucun retrait effectué</p>
            <p className="text-xs text-muted-foreground mt-1">Vos demandes de retrait apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Historique</h2>
            {withdrawals.map(w => {
              const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              return (
                <Card key={w.id} className="rounded-2xl border-0 shadow-sm" data-testid={`card-withdrawal-${w.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">{w.operator}</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg}`}>
                            <cfg.Icon className="h-3 w-3" />{cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{w.phone}</p>
                        {w.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1 font-medium">⚠ {w.rejectionReason}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(w.createdAt), "dd/MM/yyyy · HH:mm")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base">{formatFcfa(w.amountGross)}</p>
                        <p className="text-xs text-muted-foreground">Frais: {formatFcfa(w.fee)}</p>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Net: {formatFcfa(w.amountNet)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nouveau retrait */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              Retrait Solde
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Opérateur Mobile Money</Label>
              <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11" data-testid="select-operator">
                  <SelectValue placeholder="Choisir votre opérateur..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Numéro de téléphone</Label>
              <Input
                className="mt-1.5 rounded-xl h-11"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+228 90 00 00 00"
                data-testid="input-withdrawal-phone"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Montant (XOF)</Label>
              <Input
                type="number"
                min="3000"
                className="mt-1.5 rounded-xl h-11"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Minimum 3 000 XOF"
                data-testid="input-withdrawal-amount"
              />
            </div>
            {form.amount && parseFloat(form.amount) >= 3000 && (
              <div className="bg-muted rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant brut</span>
                  <span className="font-medium">{formatFcfa(parseFloat(form.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais plateforme (5%)</span>
                  <span className="font-medium text-red-500">- {formatFcfa(feeEstimate)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="font-semibold">Montant net reçu</span>
                  <span className="font-bold text-emerald-600">{formatFcfa(netEstimate)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-semibold"
              onClick={handleSubmit}
              disabled={requestWithdrawal.isPending}
              data-testid="button-submit-withdrawal"
            >
              {requestWithdrawal.isPending ? "Envoi..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
