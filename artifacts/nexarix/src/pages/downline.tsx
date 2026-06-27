import { useState } from "react";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MapPin } from "lucide-react";
import { format } from "date-fns";

function DownlineList({ users }: { users: any[] }) {
  if (users.length === 0) return (
    <div className="py-10 text-center text-muted-foreground text-sm">
      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p>Aucun membre dans ce niveau</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {users.map(u => (
        <Card key={u.id} data-testid={`card-downline-${u.id}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{u.username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{u.country}
                  </span>
                  <span className="text-xs text-muted-foreground">{format(new Date(u.joinedAt), "dd/MM/yyyy")}</span>
                </div>
              </div>
              <Badge variant={u.status === "active" ? "default" : "secondary"} className="text-xs">
                {u.status === "active" ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Downline() {
  const { data: downline, isLoading } = useGetDownline();

  if (isLoading) return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div></AppLayout>;

  const total = (downline?.level1.length || 0) + (downline?.level2.length || 0) + (downline?.level3.length || 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Downline Team</h1>
          <p className="text-muted-foreground text-sm">{total} membres dans votre reseau</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Niveau 1", count: downline?.level1.length || 0, color: "text-green-600" },
            { label: "Niveau 2", count: downline?.level2.length || 0, color: "text-blue-600" },
            { label: "Niveau 3", count: downline?.level3.length || 0, color: "text-purple-600" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="level1">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="level1">Niv. 1 ({downline?.level1.length || 0})</TabsTrigger>
            <TabsTrigger value="level2">Niv. 2 ({downline?.level2.length || 0})</TabsTrigger>
            <TabsTrigger value="level3">Niv. 3 ({downline?.level3.length || 0})</TabsTrigger>
            <TabsTrigger value="inactive">Inactifs ({downline?.inactive.length || 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="level1"><DownlineList users={downline?.level1 || []} /></TabsContent>
          <TabsContent value="level2"><DownlineList users={downline?.level2 || []} /></TabsContent>
          <TabsContent value="level3"><DownlineList users={downline?.level3 || []} /></TabsContent>
          <TabsContent value="inactive"><DownlineList users={downline?.inactive || []} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
