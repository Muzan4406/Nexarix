import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, MessageSquare } from "lucide-react";

const loginSchema = z.object({
  identifier: z.string().min(1, "Requis"),
  password: z.string().min(1, "Requis"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Le code doit être de 6 chiffres"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [sessionToken, setSessionToken] = useState("");
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);

  const credForm = useForm({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });
  const otpForm = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });

  const onSubmitCredentials = async (values: z.infer<typeof loginSchema>) => {
    setLoadingCredentials(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants incorrects");

      if (data.otpRequired && data.sessionToken) {
        setSessionToken(data.sessionToken);
        setStep("otp");
        toast({ title: "📲 Code OTP envoyé sur Telegram", description: "Vérifiez votre groupe Telegram." });
      }
    } catch (err: any) {
      toast({ title: "Accès refusé", description: err.message, variant: "destructive" });
    } finally {
      setLoadingCredentials(false);
    }
  };

  const onSubmitOtp = async (values: z.infer<typeof otpSchema>) => {
    setLoadingOtp(true);
    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, otp: values.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code OTP invalide");

      login(data.token, data.user);
      setLocation("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Code invalide", description: err.message, variant: "destructive" });
    } finally {
      setLoadingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
            {step === "otp"
              ? <MessageSquare className="h-6 w-6 text-destructive" />
              : <ShieldCheck className="h-6 w-6 text-destructive" />
            }
          </div>
          <h1 className="text-2xl font-bold">NEXARIX ADMIN</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === "otp" ? "Vérification OTP Telegram" : "Accès administrateur sécurisé"}
          </p>
        </div>

        {step === "credentials" ? (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle>Connexion Admin</CardTitle>
              <CardDescription>Réservée aux administrateurs autorisés</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...credForm}>
                <form onSubmit={credForm.handleSubmit(onSubmitCredentials)} className="space-y-4">
                  <FormField control={credForm.control} name="identifier" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email ou Nom d'utilisateur</FormLabel>
                      <FormControl><Input data-testid="input-admin-identifier" placeholder="admin@nexarix.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={credForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl><Input data-testid="input-admin-password" type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button data-testid="button-admin-login" type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={loadingCredentials}>
                    {loadingCredentials ? "Vérification…" : "Continuer"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Code OTP Telegram
              </CardTitle>
              <CardDescription>
                Un code à 6 chiffres a été envoyé dans votre groupe Telegram. Il expire dans 5 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-4">
                  <FormField control={otpForm.control} name="otp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code OTP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456"
                          maxLength={6}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          autoFocus
                          className="text-center text-2xl font-black tracking-widest h-14 rounded-2xl"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={loadingOtp}>
                    {loadingOtp ? "Vérification…" : "Valider le code"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); otpForm.reset(); }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
                  >
                    ← Retour à la connexion
                  </button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
