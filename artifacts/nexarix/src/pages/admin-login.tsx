import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

const schema = z.object({
  identifier: z.string().min(1, "Requis"),
  password: z.string().min(1, "Requis"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const adminLoginMutation = useAdminLogin();

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  const onSubmit = (values: z.infer<typeof schema>) => {
    adminLoginMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        setLocation("/admin/dashboard");
      },
      onError: (err: any) => {
        toast({ title: "Acces refuse", description: err?.data?.error || "Identifiants admin incorrects", variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
            <ShieldCheck className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">NEXARIX ADMIN</h1>
          <p className="text-muted-foreground text-sm mt-1">Acces administrateur securise</p>
        </div>
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle>Connexion Admin</CardTitle>
            <CardDescription>Reservee aux administrateurs autorises</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="identifier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email ou Nom d'utilisateur</FormLabel>
                    <FormControl><Input data-testid="input-admin-identifier" placeholder="admin@nexarix.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl><Input data-testid="input-admin-password" type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button data-testid="button-admin-login" type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={adminLoginMutation.isPending}>
                  {adminLoginMutation.isPending ? "Connexion..." : "Connexion Admin"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
