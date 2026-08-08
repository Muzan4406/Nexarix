import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogIn, User, Lock, MessageSquare, ArrowRight, TrendingUp } from "lucide-react";

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
        toast({ title: "📲 Code OTP envoyé", description: "Vérifiez votre groupe Telegram." });
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: "linear-gradient(145deg, #f0fdf9 0%, #ecfeff 40%, #eff6ff 100%)"
    }}>
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[500px] opacity-30"
        style={{ background: "radial-gradient(circle at 80% 20%, #34d39950 0%, transparent 60%)" }} />
      <div className="pointer-events-none fixed bottom-0 left-0 w-[400px] h-[400px] opacity-20"
        style={{ background: "radial-gradient(circle at 20% 80%, #38bdf850 0%, transparent 60%)" }} />

      {/* Geometric ring top-left */}
      <div className="pointer-events-none fixed -top-24 -left-24 h-64 w-64 rounded-full border-[40px] border-teal-100/60" />
      <div className="pointer-events-none fixed -bottom-16 -right-16 h-48 w-48 rounded-full border-[30px] border-blue-100/60" />

      <div className="w-full max-w-sm px-5 py-8 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="flex flex-col items-center mb-4"
        >
          <div className="relative mb-1">
            <div className="absolute inset-0 blur-3xl opacity-25 scale-125"
              style={{ background: "radial-gradient(circle, #10b981 0%, #0ea5e9 60%, transparent 100%)" }} />
            <img
              src={`${BASE}logo.png`}
              alt="Nexarix"
              className="relative h-56 w-56 object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="font-black text-[30px] tracking-tight"
            style={{ background: "linear-gradient(135deg, #1e3a8a, #0f766e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            NEXARIX
          </h1>
          <p className="text-slate-400 text-[12px] font-semibold tracking-wider uppercase mt-0.5">
            Plateforme d'affiliation
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="bg-white rounded-[28px] shadow-xl shadow-slate-200/80 overflow-hidden border border-slate-100"
        >
          {/* Top accent bar */}
          <div className="h-1.5" style={{ background: "linear-gradient(90deg, #10b981, #0ea5e9, #1d4ed8)" }} />

          <div className="p-7">
            <AnimatePresence mode="wait">
              {step === "credentials" ? (
                <motion.div key="creds" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <h2 className="font-black text-gray-900 text-[22px] mb-0.5">Connexion</h2>
                  <p className="text-slate-400 text-[13px] font-medium mb-6">Accédez à votre espace membre</p>

                  <Form {...credForm}>
                    <form onSubmit={credForm.handleSubmit(onSubmitCredentials)} className="space-y-3.5">
                      <FormField control={credForm.control} name="identifier" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-teal-50 group-focus-within:bg-teal-100 flex items-center justify-center transition-colors">
                                <User className="h-3.5 w-3.5 text-teal-600" />
                              </div>
                              <Input
                                data-testid="input-identifier"
                                placeholder="Nom d'utilisateur ou Email"
                                className="pl-14 h-12 rounded-2xl border-slate-200 bg-slate-50 text-[13px] font-medium focus-visible:ring-teal-400 focus-visible:border-teal-300 transition-all"
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
                            <div className="relative group">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-blue-50 group-focus-within:bg-blue-100 flex items-center justify-center transition-colors">
                                <Lock className="h-3.5 w-3.5 text-blue-600" />
                              </div>
                              <Input
                                data-testid="input-password"
                                type="password"
                                placeholder="••••••••"
                                className="pl-14 h-12 rounded-2xl border-slate-200 bg-slate-50 text-[13px] font-medium focus-visible:ring-blue-400 focus-visible:border-blue-300 transition-all"
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
                        className="w-full h-12 rounded-2xl text-white font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-200/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-1"
                        style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)" }}
                      >
                        {loadingLogin ? (
                          <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <><LogIn className="h-4 w-4" /> Se connecter</>
                        )}
                      </button>
                    </form>
                  </Form>

                  <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-[13px] text-slate-400">
                      Pas encore de compte ?{" "}
                      <a href="/register" className="font-black hover:underline"
                        style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        S'inscrire gratuitement
                      </a>
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-4 w-4 text-teal-600" />
                    </div>
                    <h2 className="font-black text-gray-900 text-[20px]">Code OTP</h2>
                  </div>
                  <p className="text-[12px] text-slate-400 font-medium mb-5 leading-relaxed">
                    Un code à 6 chiffres a été envoyé dans votre groupe Telegram. Valable 5 minutes.
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      placeholder="• • • • • •"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => { if (e.key === "Enter") onSubmitOtp(); }}
                      autoFocus
                      className="w-full h-16 text-center font-black text-[32px] tracking-[0.25em] rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-900"
                    />
                    <button
                      type="button" onClick={onSubmitOtp}
                      disabled={loadingOtp || otpValue.length !== 6}
                      className="w-full h-12 rounded-2xl text-white font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)" }}
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
                      className="w-full text-[12px] text-slate-400 hover:text-slate-600 transition-colors font-medium"
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-5 flex items-center justify-center gap-4"
        >
          {["Sécurisé", "Fiable", "Rapide"].map(tag => (
            <div key={tag} className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              <span className="text-[11px] text-slate-400 font-semibold">{tag}</span>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-4 text-slate-300 text-[11px] text-center"
        >
          © 2025 Nexarix · Tous droits réservés
        </motion.p>
      </div>
    </div>
  );
}
