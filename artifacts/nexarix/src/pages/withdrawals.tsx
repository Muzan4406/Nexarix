import { useState } from "react";
import { useRequestWithdrawal, getGetWithdrawalsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Info, Send } from "lucide-react";

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

export default function Withdrawals() {
  const { user } = useAuth();
  const requestWithdrawal = useRequestWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ operator: "", phone: "", amount: "" });
  const [submitted, setSubmitted] = useState(false);

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
        setForm({ operator: "", phone: "", amount: "" });
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
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
        <div>
          <h1 className="text-2xl font-bold">Retrait Solde</h1>
          <p className="text-muted-foreground text-sm">Min: 3 000 XOF · Frais plateforme: 5%</p>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Seul le solde disponible (XOF) peut être retiré. Convertissez vos points en argent via le menu <strong>Mes Points</strong>.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-lg">
              <Send className="h-8 w-8 text-white" />
            </div>
            <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">Demande envoyée !</p>
            <p className="text-sm text-muted-foreground mt-1">Traitement sous 24h ouvrables</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="font-semibold text-base">Nouveau retrait</span>
            </div>

            <div>
              <Label className="text-sm font-medium">Opérateur Mobile Money</Label>
              <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11" data-testid="select-operator">
                  <SelectValue placeholder="Choisir votre opérateur..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.length > 0
                    ? operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)
                    : <SelectItem value="other">Autre opérateur</SelectItem>
                  }
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

            <Button
              className="w-full rounded-xl h-11 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-semibold"
              onClick={handleSubmit}
              disabled={requestWithdrawal.isPending}
              data-testid="button-submit-withdrawal"
            >
              {requestWithdrawal.isPending ? "Envoi en cours..." : "Confirmer le retrait"}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
