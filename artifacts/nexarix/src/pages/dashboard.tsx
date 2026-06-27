import { useState } from "react";
import { useGetDashboard, useConvertPoints, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, TrendingUp, ArrowDownCircle, Gift, Users, Copy, Zap } from "lucide-react";

function formatFcfa(amount: number) {
  return `XOF ${amount.toLocaleString("fr-FR")}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboard();
  const convertPoints = useConvertPoints();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleConvert = () => {
    convertPoints.mutate(undefined, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Conversion reussie", description: `${res.pointsConverted} pts convertis en ${formatFcfa(res.fcfaAdded)}` });
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Minimum 1000 points requis", variant: "destructive" });
      },
    });
  };

  const handleCopy = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm">Bienvenue, <span className="font-medium text-foreground">{user?.username}</span></p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="col-span-2 sm:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary mt-1" data-testid="text-balance">{formatFcfa(stats?.balance || 0)}</p>
                </div>
                <Wallet className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total retire</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatFcfa(stats?.totalWithdrawn || 0)}</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Points</p>
                <p className="text-xl font-bold mt-1" data-testid="text-points">{(stats?.points || 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bonus bienvenue</p>
                <p className="text-xl font-bold mt-1 text-amber-600">{formatFcfa(stats?.welcomeBonus || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Filleuls</p>
                  <p className="text-xl font-bold mt-1">{stats?.downlineCount || 0}</p>
                </div>
                <Users className="h-6 w-6 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total gagne</p>
                <p className="text-xl font-bold mt-1 text-blue-600">{formatFcfa(stats?.totalEarned || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Gains MLM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Niveau 1 (1 300 XOF/filleul)", value: stats?.earnings.mlmLevel1 || 0, color: "text-green-600" },
                { label: "Niveau 2 (700 XOF/filleul)", value: stats?.earnings.mlmLevel2 || 0, color: "text-blue-600" },
                { label: "Niveau 3 (400 XOF/filleul)", value: stats?.earnings.mlmLevel3 || 0, color: "text-purple-600" },
                { label: "Taches", value: stats?.earnings.tasks || 0, color: "text-amber-600" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.color}`}>{formatFcfa(item.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Points ({stats?.points || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Regle de conversion</p>
                <p>1 000 points = 500 XOF</p>
                <p className="mt-1 text-xs">Minimum: 1 000 points</p>
              </div>
              <Button
                onClick={handleConvert}
                disabled={convertPoints.isPending || (stats?.points || 0) < 1000}
                className="w-full"
                data-testid="button-convert-points"
              >
                {convertPoints.isPending ? "Conversion..." : "Convertir mes points"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" /> Lien de parrainage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground truncate" data-testid="text-referral-link">
                {stats?.referralLink}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy-referral">
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "Copie !" : "Copier"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
