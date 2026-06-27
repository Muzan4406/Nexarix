import { useGetProfile } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Mail, Calendar, MapPin, Link, Wallet, Users, Star } from "lucide-react";
import { format } from "date-fns";

function formatFcfa(v: number) { return `XOF ${v.toLocaleString("fr-FR")}`; }

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();

  if (isLoading) return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div></AppLayout>;
  if (!profile) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mon Profil</h1>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold" data-testid="text-username">{profile.username}</h2>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                  <Badge className="text-xs">{profile.membership}</Badge>
                  <Badge variant="outline" className="text-xs">{profile.country}</Badge>
                  <Badge variant={profile.status === "active" ? "default" : "secondary"} className="text-xs">
                    {profile.status === "active" ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Membre depuis {profile.joinedAt ? format(new Date(profile.joinedAt), "MMMM yyyy") : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Solde", value: formatFcfa(profile.balance), Icon: Wallet, color: "text-primary" },
            { label: "Filleuls", value: profile.totalDownlines.toString(), Icon: Users, color: "text-blue-600" },
            { label: "Adhesion", value: profile.membership, Icon: Star, color: "text-amber-600" },
            { label: "Retire", value: formatFcfa(profile.totalWithdrawn), Icon: Wallet, color: "text-green-600" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3 text-center">
                <item.Icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
                <p className="text-sm font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations du profil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {[
                { label: "NOM D'UTILISATEUR", value: profile.username, Icon: User },
                { label: "EMAIL", value: profile.email, Icon: Mail },
                { label: "TELEPHONE", value: profile.phone, Icon: Phone },
                { label: "PARRAIN (UPLINE)", value: profile.upline || "Aucun", Icon: Link },
                { label: "INSCRIPTION", value: profile.joinedAt ? format(new Date(profile.joinedAt), "dd MMMM yyyy") : "—", Icon: Calendar },
                { label: "PAYS", value: profile.country, Icon: MapPin },
              ].map(item => (
                <div key={item.label} className="py-3 px-4 first:pt-0 last:pb-0 sm:first:pt-3 sm:last:pb-3">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">{item.label}</p>
                  <div className="flex items-center gap-1.5">
                    <item.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium" data-testid={`text-profile-${item.label.toLowerCase().replace(/\s/g, "-")}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
