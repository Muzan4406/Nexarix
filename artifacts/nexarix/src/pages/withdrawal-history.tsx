import { useGetWithdrawals } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, History } from "lucide-react";
import { format } from "date-fns";

function formatFcfa(amount: number) { return `XOF ${amount.toLocaleString("fr-FR")}`; }

const STATUS_CONFIG = {
  pending:  { label: "En attente", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",   Icon: Clock },
  paid:     { label: "Payé",       bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", Icon: CheckCircle },
  rejected: { label: "Rejeté",    bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",           Icon: XCircle },
};

export default function WithdrawalHistory() {
  const { data: withdrawals, isLoading } = useGetWithdrawals();

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Historique des retraits</h1>
          <p className="text-muted-foreground text-sm">Toutes vos demandes de retrait</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : !withdrawals?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <History className="h-7 w-7 text-blue-500" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-400">Aucun retrait effectué</p>
            <p className="text-xs text-muted-foreground mt-1">Votre historique apparaîtra ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map(w => {
              const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              return (
                <Card key={w.id} className="rounded-2xl border-0 shadow-sm">
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
    </AppLayout>
  );
}
