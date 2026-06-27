import { useState } from "react";
import { useGetWithdrawals, useRequestWithdrawal, getGetWithdrawalsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const WITHDRAWAL_TYPES = ["Balance", "TikTok", "YouTube", "Publicites", "Instagram"];
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
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", Icon: Clock },
  paid: { label: "Paye", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", Icon: CheckCircle },
  rejected: { label: "Rejete", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", Icon: XCircle },
};

export default function Withdrawals() {
  const { user } = useAuth();
  const { data: withdrawals, isLoading } = useGetWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "", operator: "", phone: "", amount: "" });

  const operators = user?.country ? (OPERATORS_BY_COUNTRY[user.country] || []) : [];

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!form.type || !form.operator || !form.phone || !form.amount) {
      toast({ title: "Champs requis", description: "Tous les champs sont obligatoires", variant: "destructive" });
      return;
    }
    if (amount < 3000) {
      toast({ title: "Montant insuffisant", description: "Minimum 3 000 XOF", variant: "destructive" });
      return;
    }
    requestWithdrawal.mutate({ data: { type: form.type, operator: form.operator, phone: form.phone, amount } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Demande envoyee", description: "Votre retrait est en cours de traitement" });
        setOpen(false);
        setForm({ type: "", operator: "", phone: "", amount: "" });
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Demande echouee", variant: "destructive" });
      },
    });
  };

  const feeEstimate = form.amount ? Math.round(parseFloat(form.amount) * 0.05) : 0;
  const netEstimate = form.amount ? Math.round(parseFloat(form.amount) - feeEstimate) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Retraits</h1>
            <p className="text-muted-foreground text-sm">Min: 3 000 XOF — Frais: 5%</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="button-new-withdrawal">
            <Plus className="h-4 w-4 mr-1" /> Nouveau retrait
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Chargement...</div>
        ) : withdrawals?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>Aucun retrait effectue.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {withdrawals?.map(w => {
              const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              return (
                <Card key={w.id} data-testid={`card-withdrawal-${w.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{w.type} — {w.operator}</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                            <cfg.Icon className="h-3 w-3" />{cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{w.phone}</p>
                        {w.rejectionReason && <p className="text-xs text-destructive mt-1">Motif: {w.rejectionReason}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(w.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatFcfa(w.amountGross)}</p>
                        <p className="text-xs text-muted-foreground">Frais: {formatFcfa(w.fee)}</p>
                        <p className="text-xs font-medium text-green-600">Net: {formatFcfa(w.amountNet)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau retrait</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de retrait</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="select-withdrawal-type"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{WITHDRAWAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operateur Mobile Money</Label>
              <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                <SelectTrigger data-testid="select-operator"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Numero de telephone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+228 90000000" data-testid="input-withdrawal-phone" />
            </div>
            <div>
              <Label>Montant (XOF)</Label>
              <Input type="number" min="3000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="3000" data-testid="input-withdrawal-amount" />
            </div>
            {form.amount && parseFloat(form.amount) >= 3000 && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Montant brut:</span><span>{formatFcfa(parseFloat(form.amount))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Frais (5%):</span><span className="text-destructive">-{formatFcfa(feeEstimate)}</span></div>
                <div className="flex justify-between font-semibold"><span>Montant net:</span><span className="text-green-600">{formatFcfa(netEstimate)}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={requestWithdrawal.isPending} data-testid="button-submit-withdrawal">
              {requestWithdrawal.isPending ? "Envoi..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
