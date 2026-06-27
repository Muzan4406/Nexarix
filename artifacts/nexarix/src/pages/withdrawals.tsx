import { useState } from "react";
import { motion } from "framer-motion";
import { useRequestWithdrawal, getGetWithdrawalsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Info, Send, CheckCircle, ArrowRight, Smartphone } from "lucide-react";
import { formatCurrency, getCurrencyCode } from "@/lib/currency";

const OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  "Togo":          ["TMoney", "Moov Money"],
  "Bénin":         ["MTN Mobile Money", "Moov Money"],
  "Côte d'Ivoire": ["Orange Money", "MTN", "Moov", "Wave"],
  "Cameroun":      ["MTN MoMo", "Orange Money"],
  "Burkina Faso":  ["Orange Money", "Moov Money"],
  "Mali":          ["Orange Money", "Moov"],
  "Niger":         ["Airtel Money", "Moov"],
  "Sénégal":       ["Wave", "Orange Money", "Free Money"],
};

export default function Withdrawals() {
  const { user } = useAuth();
  const requestWithdrawal = useRequestWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ operator: "", phone: "", amount: "" });
  const [submitted, setSubmitted] = useState(false);

  const operators = user?.country ? (OPERATORS_BY_COUNTRY[user.country] || []) : [];
  const amountNum = parseFloat(form.amount) || 0;
  const feeEstimate = form.amount ? Math.round(amountNum * 0.05) : 0;
  const netEstimate = form.amount ? Math.round(amountNum - feeEstimate) : 0;
  const validAmount = amountNum >= 3000;

  const handleSubmit = () => {
    if (!form.operator || !form.phone || !form.amount) {
      toast({ title: "Champs manquants", description: "Remplissez tous les champs.", variant: "destructive" });
      return;
    }
    if (!validAmount) {
      toast({ title: "Montant insuffisant", description: `Minimum 3 000 ${getCurrencyCode(user?.country)}.`, variant: "destructive" });
      return;
    }
    requestWithdrawal.mutate(
      { data: { type: "Balance", operator: form.operator, phone: form.phone, amount: amountNum } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "✅ Demande envoyée !", description: "Traitement sous 24h ouvrables." });
          setForm({ operator: "", phone: "", amount: "" });
          setSubmitted(true);
          setTimeout(() => setSubmitted(false), 6000);
        },
        onError: (err: any) => {
          toast({ title: "Erreur", description: err?.data?.error || "Demande échouée", variant: "destructive" });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 p-6 text-white relative overflow-hidden shadow-xl shadow-emerald-300/30"
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Mobile Money</p>
                <h1 className="font-black text-2xl leading-tight">Retrait Solde</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold">Min: 3 000 {getCurrencyCode(user?.country)}</div>
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold">Frais: 5%</div>
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold">Délai: 24h</div>
            </div>
          </div>
        </motion.div>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-3.5"
        >
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 font-semibold leading-relaxed">
            Seul le solde {getCurrencyCode(user?.country)} disponible peut être retiré. Convertissez d'abord vos points via <strong>Mes Points</strong>.
          </p>
        </motion.div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-14 text-center bg-emerald-50 border border-emerald-100 rounded-3xl"
          >
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-xl shadow-emerald-200">
              <Send className="h-10 w-10 text-white" />
            </div>
            <p className="font-black text-xl text-emerald-700">Demande envoyée !</p>
            <p className="text-sm text-gray-500 mt-1 font-semibold">Traitement sous 24h ouvrables</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-5"
          >
            {/* Opérateur */}
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">
                Opérateur Mobile Money
              </label>
              <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-gray-50 font-semibold" data-testid="select-operator">
                  <SelectValue placeholder="Choisir votre opérateur…" />
                </SelectTrigger>
                <SelectContent>
                  {operators.length > 0
                    ? operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)
                    : <SelectItem value="other">Autre opérateur</SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Téléphone */}
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+228 90 00 00 00"
                  data-testid="input-withdrawal-phone"
                />
              </div>
            </div>

            {/* Montant */}
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">
                Montant ({getCurrencyCode(user?.country)})
              </label>
              <div className="relative">
                <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="3000"
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={`Minimum 3 000 ${getCurrencyCode(user?.country)}`}
                  data-testid="input-withdrawal-amount"
                />
              </div>
            </div>

            {/* Récapitulatif */}
            {form.amount && validAmount && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-4 border border-gray-100 space-y-2"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Montant brut</span>
                  <span className="font-black">{formatCurrency(amountNum, user?.country)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Frais (5%)</span>
                  <span className="font-black text-red-500">- {formatCurrency(feeEstimate, user?.country)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-black text-gray-900">Vous recevez</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="h-4 w-4 text-emerald-500" />
                    <span className="font-black text-emerald-600 text-lg">{formatCurrency(netEstimate, user?.country)}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={requestWithdrawal.isPending}
              data-testid="button-submit-withdrawal"
              className="w-full h-13 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {requestWithdrawal.isPending ? (
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <><CheckCircle className="h-5 w-5" /> Confirmer le retrait</>
              )}
            </button>
          </motion.div>
        )}

      </div>
    </AppLayout>
  );
}
