import { useState } from "react";
import { useGetDashboard, useConvertPoints, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, ArrowDownCircle, Gift, Users, Zap, TrendingUp, Copy, Star, CheckCircle } from "lucide-react";

function formatFcfa(amount: number) {
  return `XOF ${amount.toLocaleString("fr-FR")}`;
}

const BASE = import.meta.env.BASE_URL;

function StatCard({
  label,
  value,
  icon: Icon,
  bg,
  iconBg,
  iconColor,
  textColor,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  bg: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${bg} flex items-center justify-between`}>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className={`text-xl font-bold ${textColor}`}>{value}</p>
      </div>
      <div className={`h-12 w-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
    </div>
  );
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
        toast({ title: "Conversion réussie", description: `${res.pointsConverted} pts → ${formatFcfa(res.fcfaAdded)}` });
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
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <img src={`${BASE}logo.png`} alt="Nexarix" className="h-12 animate-pulse" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero banner — vert comme HiveQash */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <img src={`${BASE}logo.png`} alt="Nexarix" className="h-8 brightness-0 invert" />
            <div>
              <p className="text-blue-100 text-xs">Bienvenue</p>
              <p className="font-bold text-lg leading-tight">
                {user?.username} 🎉
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-blue-100 text-xs mb-1">Total Gagné</p>
              <p className="font-bold text-base">{formatFcfa(stats?.totalEarned || 0)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-blue-100 text-xs mb-1">Total Retiré</p>
              <p className="font-bold text-base">{formatFcfa(stats?.totalWithdrawn || 0)}</p>
            </div>
          </div>
        </div>

        {/* Cartes stat colorées */}
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            label="Solde disponible"
            value={formatFcfa(stats?.balance || 0)}
            icon={Wallet}
            bg="bg-emerald-50 dark:bg-emerald-950/30"
            iconBg="bg-emerald-500"
            iconColor="text-white"
            textColor="text-emerald-700 dark:text-emerald-400"
          />
          <StatCard
            label="Total Retiré"
            value={formatFcfa(stats?.totalWithdrawn || 0)}
            icon={ArrowDownCircle}
            bg="bg-orange-50 dark:bg-orange-950/30"
            iconBg="bg-orange-500"
            iconColor="text-white"
            textColor="text-orange-700 dark:text-orange-400"
          />
          <StatCard
            label="Bonus de Bienvenue"
            value={formatFcfa(stats?.welcomeBonus || 0)}
            icon={Gift}
            bg="bg-purple-50 dark:bg-purple-950/30"
            iconBg="bg-purple-500"
            iconColor="text-white"
            textColor="text-purple-700 dark:text-purple-400"
          />
          <StatCard
            label="Mes Points"
            value={(stats?.points || 0).toLocaleString() + " pts"}
            icon={Star}
            bg="bg-sky-50 dark:bg-sky-950/30"
            iconBg="bg-sky-500"
            iconColor="text-white"
            textColor="text-sky-700 dark:text-sky-400"
          />
          <StatCard
            label="Filleuls directs"
            value={`${stats?.downlineCount || 0} membres`}
            icon={Users}
            bg="bg-amber-50 dark:bg-amber-950/30"
            iconBg="bg-amber-500"
            iconColor="text-white"
            textColor="text-amber-700 dark:text-amber-400"
          />
        </div>

        {/* Gains MLM */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#1565C0] to-[#1E88E5] flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Gains MLM par niveau
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {[
              { label: "Niveau 1", detail: "1 300 XOF/filleul", value: stats?.earnings.mlmLevel1 || 0, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
              { label: "Niveau 2", detail: "700 XOF/filleul",  value: stats?.earnings.mlmLevel2 || 0, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
              { label: "Niveau 3", detail: "400 XOF/filleul",  value: stats?.earnings.mlmLevel3 || 0, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
              { label: "Tâches",   detail: "Rémunérées",       value: stats?.earnings.tasks || 0,    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div>
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.detail}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${item.color}`}>{formatFcfa(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Convertir les points */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              Points &amp; Conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
              <div>
                <p className="text-xs text-muted-foreground">Solde points</p>
                <p className="text-xl font-bold text-amber-600" data-testid="text-points">
                  {(stats?.points || 0).toLocaleString()} pts
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-medium text-foreground">1 000 pts</p>
                <p>= 500 XOF</p>
              </div>
            </div>
            <Button
              onClick={handleConvert}
              disabled={convertPoints.isPending || (stats?.points || 0) < 1000}
              className="w-full rounded-xl h-11 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-0 font-semibold"
              data-testid="button-convert-points"
            >
              <Zap className="h-4 w-4 mr-2" />
              {convertPoints.isPending ? "Conversion..." : "Convertir mes points"}
            </Button>
          </CardContent>
        </Card>

        {/* Lien de parrainage */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Gift className="h-4 w-4 text-white" />
              </div>
              Mon lien de parrainage
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="bg-muted rounded-xl p-3 mb-3 font-mono text-xs text-muted-foreground truncate" data-testid="text-referral-link">
              {stats?.referralLink}
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl h-10 font-semibold"
              onClick={handleCopy}
              data-testid="button-copy-referral"
            >
              {copied ? (
                <><CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />Lien copié !</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" />Copier mon lien</>
              )}
            </Button>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
