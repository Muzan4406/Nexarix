import { useGetDashboard, useConvertPoints, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Star, TrendingUp } from "lucide-react";

function formatFcfa(amount: number) { return `XOF ${amount.toLocaleString("fr-FR")}`; }

export default function Points() {
  const { data: stats, isLoading } = useGetDashboard();
  const convertPoints = useConvertPoints();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConvert = () => {
    convertPoints.mutate(undefined, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Conversion réussie", description: `${res.pointsConverted} pts → ${formatFcfa(res.fcfaAdded)}` });
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Minimum 1000 points requis", variant: "destructive" });
      },
    });
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </AppLayout>
  );

  const points = stats?.points || 0;
  const canConvert = points >= 1000;
  const setsOf1000 = Math.floor(points / 1000);
  const estimatedFcfa = setsOf1000 * 500;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Mes Points</h1>
          <p className="text-muted-foreground text-sm">Convertissez vos points en argent réel</p>
        </div>

        {/* Solde de points */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-amber-100 text-xs">Solde actuel</p>
              <p className="font-black text-3xl">{points.toLocaleString()} pts</p>
            </div>
          </div>
          {canConvert && (
            <div className="bg-white/15 rounded-xl p-3 text-sm backdrop-blur-sm">
              <p className="text-amber-100 text-xs mb-1">Convertible maintenant</p>
              <p className="font-bold">{(setsOf1000 * 1000).toLocaleString()} pts → {formatFcfa(estimatedFcfa)}</p>
            </div>
          )}
        </div>

        {/* Taux de conversion */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Taux de conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">1 000 points</span>
              </div>
              <span className="font-bold text-emerald-600">= 500 XOF</span>
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Minimum 1 000 points requis pour une conversion. Les points restants sont conservés.
            </p>
          </CardContent>
        </Card>

        {/* Bouton de conversion */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <Button
              onClick={handleConvert}
              disabled={convertPoints.isPending || !canConvert}
              className="w-full rounded-xl h-12 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-0 font-bold text-base"
            >
              <Zap className="h-5 w-5 mr-2" />
              {convertPoints.isPending
                ? "Conversion en cours..."
                : canConvert
                  ? `Convertir ${(setsOf1000 * 1000).toLocaleString()} pts → ${formatFcfa(estimatedFcfa)}`
                  : "Minimum 1 000 pts requis"
              }
            </Button>
            {!canConvert && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Il vous faut encore {1000 - (points % 1000)} pts pour pouvoir convertir.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
