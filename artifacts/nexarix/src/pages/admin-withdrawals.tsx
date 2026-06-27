import { useState } from "react";
import { useGetAdminWithdrawals, useApproveWithdrawal, useRejectWithdrawal, getGetAdminWithdrawalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";

function formatFcfa(v: number) { return `XOF ${v.toLocaleString("fr-FR")}`; }

const STATUS_CONFIG = {
  pending: { label: "En attente", variant: "secondary" as const, Icon: Clock },
  paid: { label: "Paye", variant: "default" as const, Icon: CheckCircle },
  rejected: { label: "Rejete", variant: "destructive" as const, Icon: XCircle },
};

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: withdrawals, isLoading } = useGetAdminWithdrawals({ status: statusFilter || undefined });
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectData, setRejectData] = useState<{ id: number; reason: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });

  const handleApprove = (id: number) => {
    approveWithdrawal.mutate({ withdrawalId: id }, {
      onSuccess: () => { invalidate(); toast({ title: "Retrait valide comme paye" }); },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  const handleReject = () => {
    if (!rejectData || !rejectData.reason.trim()) {
      toast({ title: "Motif requis", variant: "destructive" });
      return;
    }
    rejectWithdrawal.mutate({ withdrawalId: rejectData.id, data: { reason: rejectData.reason } }, {
      onSuccess: () => { invalidate(); toast({ title: "Retrait rejete" }); setRejectData(null); },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Retraits</h1>
            <p className="text-muted-foreground text-sm">{withdrawals?.length || 0} demandes</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Filtrer..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="paid">Payes</SelectItem>
              <SelectItem value="rejected">Rejetes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : (
          <div className="space-y-3">
            {(withdrawals || []).map(w => {
              const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              return (
                <Card key={w.id} data-testid={`card-withdrawal-${w.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">{w.username}</span>
                          <Badge variant={cfg.variant} className="text-xs">
                            <cfg.Icon className="h-3 w-3 mr-1" />{cfg.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground mt-2">
                          <span>Type: <span className="font-medium text-foreground">{w.type}</span></span>
                          <span>Operateur: <span className="font-medium text-foreground">{w.operator}</span></span>
                          <span>Tel: <span className="font-medium text-foreground">{w.phone}</span></span>
                          <span>{format(new Date(w.createdAt), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                        {w.rejectionReason && <p className="text-xs text-destructive mt-1">Motif: {w.rejectionReason}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatFcfa(w.amountGross)}</p>
                          <p className="text-xs text-muted-foreground">Frais: {formatFcfa(w.fee)}</p>
                          <p className="text-sm font-bold text-green-600">Net: {formatFcfa(w.amountNet)}</p>
                        </div>
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejectData({ id: w.id, reason: "" })} data-testid={`button-reject-${w.id}`}>
                              <XCircle className="h-3 w-3 mr-1" />Rejeter
                            </Button>
                            <Button size="sm" onClick={() => handleApprove(w.id)} disabled={approveWithdrawal.isPending} data-testid={`button-approve-${w.id}`}>
                              <CheckCircle className="h-3 w-3 mr-1" />Valider
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {withdrawals?.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Aucun retrait {statusFilter}</div>}
          </div>
        )}
      </div>

      <Dialog open={!!rejectData} onOpenChange={() => setRejectData(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeter le retrait</DialogTitle></DialogHeader>
          <div>
            <Label>Motif de rejet (obligatoire)</Label>
            <Input className="mt-1" value={rejectData?.reason || ""} onChange={e => setRejectData(d => d ? { ...d, reason: e.target.value } : null)} placeholder="Ex: Numero incorrect, solde insuffisant..." data-testid="input-reject-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectData(null)}>Annuler</Button>
            <Button className="bg-destructive hover:bg-destructive/90" onClick={handleReject} disabled={rejectWithdrawal.isPending} data-testid="button-confirm-reject">
              {rejectWithdrawal.isPending ? "Rejet..." : "Confirmer le rejet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
