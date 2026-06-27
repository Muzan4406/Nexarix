import { useState } from "react";
import { useGetDashboard, useGetPublicSettings, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, ArrowDownCircle, Gift, Copy, CheckCircle } from "lucide-react";

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
  const { data: publicSettings } = useGetPublicSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    </AppLayout>
  );

  const activationFee = publicSettings?.activationFee ?? 3000;
  const totalEarned = stats?.totalEarned || 0;

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-blue-100 text-xs">Bienvenue</p>
              <p className="font-bold text-lg leading-tight">
                {user?.username} 🎉
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-blue-100 text-xs mb-1">Frais d'activation</p>
              <p className="font-bold text-base">{formatFcfa(activationFee)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-blue-100 text-xs mb-1">Total Gagné</p>
              <p className="font-bold text-base">{formatFcfa(totalEarned)}</p>
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
        </div>

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
            <div className="bg-muted rounded-xl p-3 mb-3 font-mono text-xs text-muted-foreground truncate">
              {stats?.referralLink}
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl h-10 font-semibold"
              onClick={handleCopy}
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
