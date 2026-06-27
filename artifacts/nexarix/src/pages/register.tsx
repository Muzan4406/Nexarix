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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, Mail, Phone, MapPin, Lock, GitBranch } from "lucide-react";

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
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#0D1B3E] via-[#1565C0] to-[#0D1B3E] p-4 py-8">

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <img
          src={`${BASE}logo.png`}
          alt="Nexarix"
          className="h-20 w-auto object-contain drop-shadow-2xl"
        />
        <p className="text-blue-200 text-sm mt-2 font-medium tracking-wide">Rejoignez la communauté</p>
      </div>

      {/* Carte formulaire */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#1565C0] to-[#1E88E5]" />

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Inscription</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Créez votre compte Nexarix gratuitement</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom d'utilisateur</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input data-testid="input-username" placeholder="jean123" className="pl-10 rounded-xl h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input data-testid="input-email" type="email" placeholder="jean@mail.com" className="pl-10 rounded-xl h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input data-testid="input-phone" placeholder="+228 90000000" className="pl-10 rounded-xl h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Pays</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-country" className="pl-10 rounded-xl h-11">
                          <SelectValue placeholder="Choisir un pays" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="upline" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Parrain (Upline)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        data-testid="input-upline"
                        placeholder="Nom du parrain (optionnel)"
                        disabled={!!lockedUpline}
                        className={`pl-10 rounded-xl h-11 ${lockedUpline ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 font-medium" : ""}`}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input data-testid="input-password" type="password" placeholder="••••••••" className="pl-10 rounded-xl h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmer le mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input data-testid="input-confirm-password" type="password" placeholder="••••••••" className="pl-10 rounded-xl h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                data-testid="button-register"
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] hover:from-[#0D47A1] hover:to-[#1565C0] text-white font-bold text-base shadow-lg mt-2"
                disabled={registerMutation.isPending}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {registerMutation.isPending ? "Inscription..." : "Créer mon compte"}
              </Button>
            </form>
          </Form>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Déjà inscrit ?{" "}
              <a href="/login" className="text-[#1565C0] font-semibold hover:underline">Se connecter</a>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-blue-300/60 text-xs text-center">© 2025 Nexarix · Tous droits réservés</p>
    </div>
  );
}
