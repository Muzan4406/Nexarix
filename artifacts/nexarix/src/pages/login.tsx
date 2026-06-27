import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogIn, User, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

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
        {/* Bande bleue en haut */}
        <div className="h-1.5 bg-gradient-to-r from-[#1565C0] to-[#1E88E5]" />

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Accédez à votre espace membre</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="identifier" render={({ field }) => (
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

              <FormField control={form.control} name="password" render={({ field }) => (
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
                disabled={loginMutation.isPending}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loginMutation.isPending ? "Connexion..." : "Se connecter"}
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
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-blue-300/60 text-xs text-center">
        © 2025 Nexarix · Tous droits réservés
      </p>
    </div>
  );
}
