import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const COUNTRIES = ["Togo", "Bénin", "Côte d'Ivoire", "Cameroun", "Burkina Faso", "Mali", "Niger", "Sénégal"];

const schema = z.object({
  username: z.string().min(3, "Min 3 caractères").regex(/^\S+$/, "Pas d'espaces"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro invalide"),
  country: z.string().min(1, "Requis"),
  password: z.string().min(6, "Min 6 caractères"),
  confirmPassword: z.string(),
  upline: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, { message: "Mots de passe différents", path: ["confirmPassword"] });

export default function Register() {
  const params = useParams() as { upline?: string };
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const lockedUpline = params.upline || "";

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", phone: "", country: "", password: "", confirmPassword: "", upline: lockedUpline },
  });

  useEffect(() => {
    if (lockedUpline) form.setValue("upline", lockedUpline);
  }, [lockedUpline]);

  const onSubmit = (values: z.infer<typeof schema>) => {
    const { confirmPassword, ...data } = values;
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        setLocation("/activate");
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Inscription échouée", variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">NEXARIX</h1>
          <p className="text-muted-foreground text-sm mt-1">Rejoignez la communaute</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Inscription</CardTitle>
            <CardDescription>Creez votre compte Nexarix</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur</FormLabel>
                    <FormControl><Input data-testid="input-username" placeholder="Ex: jean123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input data-testid="input-email" type="email" placeholder="jean@mail.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone</FormLabel>
                    <FormControl><Input data-testid="input-phone" placeholder="+228 90000000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-country"><SelectValue placeholder="Choisir un pays" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="upline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parrain (Upline)</FormLabel>
                    <FormControl>
                      <Input data-testid="input-upline" placeholder="Nom du parrain" disabled={!!lockedUpline} {...field} className={lockedUpline ? "bg-muted text-muted-foreground" : ""} />
                    </FormControl>
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
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl><Input data-testid="input-confirm-password" type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button data-testid="button-register" type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Deja inscrit ?{" "}
              <a href="/login" className="text-primary font-medium hover:underline">Se connecter</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
