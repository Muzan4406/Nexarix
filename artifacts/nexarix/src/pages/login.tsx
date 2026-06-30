import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogIn, User, Lock, MessageSquare } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const loginSchema = z.object({
  identifier: z.string().min(1, "Requis"),
  password: z.string().min(1, "Requis"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [sessionToken, setSessionToken] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const credForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmitCredentials = async (values: z.infer<typeof loginSchema>) => {
    setLoadingLogin(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants incorrects");

      // Admin → OTP step
      if (data.otpRequired && data.sessionToken) {
        setSessionToken(data.sessionToken);
        setStep("otp");
        toast({ title: "📲 Code OTP envoyé sur Telegram", description: "Vérifiez votre groupe Telegram." });
        return;
      }

      // Regular user → direct login
      login(data.token, data.user);
      if (data.user.status === "inactive") {
        setLocation("/activate");
      } else {
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Erreur de connexion", description: err.message, variant: "destructive" });
    } finally {
      setLoadingLogin(false);
    }
  };

  const onSubmitOtp = async () => {
    if (otpValue.length !== 6) {
      toast({ title: "Code invalide", description: "Le code doit être de 6 chiffres", variant: "destructive" });
      return;
    }
    setLoadingOtp(true);
    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, otp: otpValue }),
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0D1B3E] via-[#1565C0] to-[#0D1B3E] p-4">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <img
          src={`${BASE}logo.png`}
          alt="Nexarix"
          className="h-24 w-auto object-contain drop-shadow-2xl"
        />
        <p className="text-blue-200 text-sm mt-3 font-medium tracking-wide">Plateforme de revenus digitaux</p>
      </div>

      {/* Carte formulaire */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#1565C0] to-[#1E88E5]" />

        <div className="p-6">
          {step === "credentials" ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Connexion</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Accédez à votre espace membre</p>

              <Form {...credForm}>
                <form onSubmit={credForm.handleSubmit(onSubmitCredentials)} className="space-y-4">
                  <FormField control={credForm.control} name="identifier" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                        Nom d'utilisateur ou Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            data-testid="input-identifier"
                            placeholder="jean123 ou jean@mail.com"
                            className="pl-10 rounded-xl border-gray-200 dark:border-gray-700 h-11"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={credForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                        Mot de passe
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            data-testid="input-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10 rounded-xl border-gray-200 dark:border-gray-700 h-11"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button
                    data-testid="button-submit"
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] hover:from-[#0D47A1] hover:to-[#1565C0] text-white font-bold text-base shadow-lg mt-2"
                    disabled={loadingLogin}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {loadingLogin ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </Form>

              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pas encore de compte ?{" "}
                  <a href="/register" className="text-[#1565C0] font-semibold hover:underline">
                    S'inscrire gratuitement
                  </a>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Code OTP</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Un code à 6 chiffres a été envoyé dans votre groupe Telegram. Il expire dans 5 minutes.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === "Enter") onSubmitOtp(); }}
                    autoFocus
                    style={{
                      width: "100%",
                      height: "56px",
                      fontSize: "28px",
                      fontWeight: 900,
                      textAlign: "center",
                      letterSpacing: "0.3em",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      outline: "none",
                      color: "#111827",
                      background: "#ffffff",
                      padding: "0 12px",
                    }}
                  />
                  {otpValue.length > 0 && otpValue.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">{6 - otpValue.length} chiffre(s) manquant(s)</p>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={onSubmitOtp}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] hover:from-[#0D47A1] hover:to-[#1565C0] text-white font-bold text-base shadow-lg"
                  disabled={loadingOtp || otpValue.length !== 6}
                >
                  {loadingOtp ? "Vérification..." : "Valider le code"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setOtpValue(""); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
                >
                  ← Retour à la connexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-8 text-blue-300/60 text-xs text-center">
        © 2025 Nexarix · Tous droits réservés
      </p>
    </div>
  );
}
