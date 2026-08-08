import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, Mail, Phone, MapPin, Lock, GitBranch, CheckCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

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

type FieldConfig = {
  name: keyof z.infer<typeof schema>;
  label: string;
  placeholder: string;
  type?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  ringColor: string;
};

const FIELDS: FieldConfig[] = [
  { name: "username",        label: "Nom d'utilisateur",  placeholder: "jean123",           icon: User,      iconColor: "text-teal-600",   iconBg: "bg-teal-50 group-focus-within:bg-teal-100",   ringColor: "focus-visible:ring-teal-400" },
  { name: "email",           label: "Email",              placeholder: "jean@mail.com",     type: "email",   icon: Mail,      iconColor: "text-blue-600",   iconBg: "bg-blue-50 group-focus-within:bg-blue-100",   ringColor: "focus-visible:ring-blue-400" },
  { name: "phone",           label: "Téléphone",          placeholder: "+228 90 00 00 00",  icon: Phone,     iconColor: "text-emerald-600", iconBg: "bg-emerald-50 group-focus-within:bg-emerald-100", ringColor: "focus-visible:ring-emerald-400" },
  { name: "password",        label: "Mot de passe",       placeholder: "••••••••",          type: "password", icon: Lock,      iconColor: "text-violet-600", iconBg: "bg-violet-50 group-focus-within:bg-violet-100",  ringColor: "focus-visible:ring-violet-400" },
  { name: "confirmPassword", label: "Confirmer le mot de passe", placeholder: "••••••••",   type: "password", icon: Lock,      iconColor: "text-violet-600", iconBg: "bg-violet-50 group-focus-within:bg-violet-100",  ringColor: "focus-visible:ring-violet-400" },
];

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
    <div className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden py-8 px-5"
      style={{ background: "linear-gradient(145deg, #f0fdf9 0%, #ecfeff 40%, #eff6ff 100%)" }}>

      {/* Decorative blobs */}
      <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[500px] opacity-25"
        style={{ background: "radial-gradient(circle at 80% 10%, #34d39950 0%, transparent 60%)" }} />
      <div className="pointer-events-none fixed bottom-0 left-0 w-[400px] h-[400px] opacity-20"
        style={{ background: "radial-gradient(circle at 20% 90%, #38bdf850 0%, transparent 60%)" }} />
      <div className="pointer-events-none fixed -top-24 -left-24 h-64 w-64 rounded-full border-[40px] border-teal-100/60" />
      <div className="pointer-events-none fixed -bottom-16 -right-16 h-48 w-48 rounded-full border-[30px] border-blue-100/60" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="flex flex-col items-center mb-6"
        >
          <div className="relative mb-3">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
              style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)" }} />
            <img
              src={`${BASE}logo.png`}
              alt="Nexarix"
              className="relative h-20 w-20 object-contain drop-shadow-xl"
            />
          </div>
          <h1 className="font-black text-[26px] tracking-tight"
            style={{ background: "linear-gradient(135deg, #1e3a8a, #0f766e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            NEXARIX
          </h1>
          <p className="text-slate-400 text-[11px] font-semibold tracking-wider uppercase mt-0.5">
            Plateforme d'affiliation
          </p>
        </motion.div>

        {/* Parrain badge */}
        {lockedUpline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2.5 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-2.5 mb-4"
          >
            <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">Invitation de</p>
              <p className="text-teal-800 font-black text-sm truncate">{lockedUpline}</p>
            </div>
          </motion.div>
        )}

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="bg-white rounded-[28px] shadow-xl shadow-slate-200/80 overflow-hidden border border-slate-100"
        >
          {/* Accent bar */}
          <div className="h-1.5" style={{ background: "linear-gradient(90deg, #10b981, #0ea5e9, #1d4ed8)" }} />

          <div className="p-6">
            <h2 className="font-black text-gray-900 text-[22px] mb-0.5">Inscription</h2>
            <p className="text-slate-400 text-[13px] font-medium mb-5">Créez votre compte gratuitement</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">

                {/* Standard fields */}
                {FIELDS.map(({ name, label, placeholder, type, icon: Icon, iconColor, iconBg, ringColor }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                      <FormControl>
                        <div className="relative group">
                          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center transition-colors`}>
                            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                          </div>
                          <Input
                            data-testid={`input-${name}`}
                            type={type || "text"}
                            placeholder={placeholder}
                            className={`pl-12 h-11 rounded-2xl border-slate-200 bg-slate-50 text-[13px] font-medium ${ringColor} transition-all`}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                ))}

                {/* Pays */}
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Pays</p>
                    <div className="relative group">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-600 z-10 pointer-events-none" />
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country" className="pl-10 h-11 rounded-2xl border-slate-200 bg-slate-50 text-[13px] font-medium focus:ring-amber-400">
                            <SelectValue placeholder="Choisir votre pays" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                {/* Upline */}
                <FormField control={form.control} name="upline" render={({ field }) => (
                  <FormItem>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Code parrain (optionnel)</p>
                    <FormControl>
                      <div className="relative group">
                        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${lockedUpline ? "bg-teal-100" : "bg-slate-100 group-focus-within:bg-slate-200"}`}>
                          <GitBranch className={`h-3.5 w-3.5 ${lockedUpline ? "text-teal-600" : "text-slate-400"}`} />
                        </div>
                        <Input
                          data-testid="input-upline"
                          placeholder="Nom du parrain"
                          disabled={!!lockedUpline}
                          className={`pl-12 h-11 rounded-2xl border-slate-200 bg-slate-50 text-[13px] font-medium focus-visible:ring-teal-400 transition-all ${lockedUpline ? "text-teal-700 font-bold" : ""}`}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                {/* Submit */}
                <button
                  data-testid="button-register"
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-12 rounded-2xl text-white font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-200/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-2"
                  style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)" }}
                >
                  {registerMutation.isPending ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Créer mon compte</>
                  )}
                </button>
              </form>
            </Form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-[13px] text-slate-400">
                Déjà inscrit ?{" "}
                <a href="/login" className="font-black hover:underline"
                  style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Se connecter
                </a>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-5 grid grid-cols-3 gap-2"
        >
          {[
            { label: "Gratuit", sub: "Inscription" },
            { label: "3 niveaux", sub: "Parrainage" },
            { label: "Paiement", sub: "Mobile Money" },
          ].map(item => (
            <div key={item.label} className="bg-white/70 rounded-2xl border border-slate-100 p-3 text-center">
              <p className="font-black text-[12px] text-slate-700">{item.label}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.sub}</p>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-4 text-slate-300 text-[11px] text-center"
        >
          © 2025 Nexarix · Tous droits réservés
        </motion.p>
      </div>
    </div>
  );
}
