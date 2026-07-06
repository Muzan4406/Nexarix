import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogIn, User, Lock, MessageSquare, ArrowRight } from "lucide-react";

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

      if (data.otpRequired && data.sessionToken) {
        setSessionToken(data.sessionToken);
        setStep("otp");
        toast({ title: "📲 Code OTP envoyé sur Telegram", description: "Vérifiez votre groupe Telegram." });
        return;
      }

      login(data.token, data.user);
      setLocation(data.user.status === "inactive" ? "/activate" : "/dashboard");
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
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{ background: "linear-gradient(145deg, #050d1f 0%, #0c1a3d 45%, #1248a8 100%)" }}
    >
      {/* Décoration background */}
      <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(99,155,255,0.12) 0%, transparent 65%)" }} />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-72 w-72 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(99,120,255,0.10) 0%, transparent 65%)" }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="mb-8 flex flex-col items-center"
      >
        <div className="relative mb-3">
          <div className="absolute inset-0 rounded-[28px] blur-xl opacity-40"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }} />
          <img
            src={`${BASE}logo.png`}
            alt="Nexarix"
            className="relative h-20 w-20 object-cover rounded-[28px] shadow-2xl ring-1 ring-white/10"
          />
        </div>
        <h1 className="font-black text-white text-[26px] tracking-tight">NEXARIX</h1>
        <p className="text-blue-300/70 text-[12px] font-medium mt-0.5 tracking-wide">Plateforme de revenus digitaux</p>
      </motion.div>

      {/* Carte formulaire */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl overflow-hidden"
      >
        {/* Accent bar */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, #2563eb, #7c3aed, #ec4899)" }} />

        <div className="p-6">
          {step === "credentials" ? (
            <>
              <h2 className="font-black text-gray-900 text-[22px] mb-0.5">Connexion</h2>
              <p className="text-gray-400 text-[13px] font-medium mb-6">Accédez à votre espace membre</p>

              <Form {...credForm}>
                <form onSubmit={credForm.handleSubmit(onSubmitCredentials)} className="space-y-3.5">
                  <FormField control={credForm.control} name="identifier" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                          <Input
                            data-testid="input-identifier"
                            placeholder="Nom d'utilisateur ou Email"
                            className="pl-14 h-12 rounded-2xl border-gray-200 bg-gray-50 text-[13px] font-medium focus-visible:ring-blue-500"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={credForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Lock className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                          <Input
                            data-testid="input-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-14 h-12 rounded-2xl border-gray-200 bg-gray-50 text-[13px] font-medium focus-visible:ring-blue-500"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <button
                    data-testid="button-submit"
                    type="submit"
                    disabled={loadingLogin}
                    className="w-full h-12 rounded-2xl text-white font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-1"
                    style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
                  >
                    {loadingLogin ? (
                      <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <><LogIn className="h-4 w-4" /> Se connecter</>
                    )}
                  </button>
                </form>
              </Form>

              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <p className="text-[13px] text-gray-400">
                  Pas encore de compte ?{" "}
                  <a href="/register" className="text-blue-600 font-bold hover:underline">
                    S'inscrire gratuitement
                  </a>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="font-black text-gray-900 text-[20px]">Code OTP</h2>
              </div>
              <p className="text-[12px] text-gray-400 font-medium mb-5 leading-relaxed">
                Un code à 6 chiffres a été envoyé dans votre groupe Telegram. Valable 5 minutes.
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter") onSubmitOtp(); }}
                  autoFocus
                  className="w-full h-16 text-center font-black text-[32px] tracking-[0.25em] rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {otpValue.length > 0 && otpValue.length < 6 && (
                  <p className="text-[11px] text-red-500 font-medium text-center">
                    {6 - otpValue.length} chiffre(s) manquant(s)
                  </p>
                )}

                <button
                  type="button"
                  onClick={onSubmitOtp}
                  disabled={loadingOtp || otpValue.length !== 6}
                  className="w-full h-12 rounded-2xl text-white font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
                >
                  {loadingOtp ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <><ArrowRight className="h-4 w-4" /> Valider le code</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setOtpValue(""); }}
                  className="w-full text-[12px] text-gray-400 hover:text-gray-600 transition-colors font-medium"
                >
                  ← Retour à la connexion
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-blue-300/40 text-[11px] text-center"
      >
        © 2025 Nexarix · Tous droits réservés
      </motion.p>
    </div>
  );
}
