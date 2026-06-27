import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().min(1, "Requis"),
  password: z.string().min(1, "Requis"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  const onSubmit = (values: z.infer<typeof schema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        if (res.user.isAdmin) {
          setLocation("/admin/dashboard");
        } else if (res.user.status === "inactive") {
          setLocation("/activate");
        } else {
          setLocation("/dashboard");
        }
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Identifiants incorrects", variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">NEXARIX</h1>
          <p className="text-muted-foreground text-sm mt-1">Plateforme de revenus digitaux</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>Connectez-vous a votre compte</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="identifier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur ou Email</FormLabel>
                    <FormControl><Input data-testid="input-identifier" placeholder="Ex: jean123 ou jean@mail.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl><Input data-testid="input-password" type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button data-testid="button-submit" type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Pas de compte ?{" "}
              <a href="/register" className="text-primary font-medium hover:underline">S'inscrire</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
