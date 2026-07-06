import { Construction } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
            <Construction className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Maintenance en cours</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            La plateforme Nexarix est temporairement indisponible pour des opérations de maintenance.
            Nous serons de retour très bientôt.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ce qui se passe</p>
          <div className="flex items-start gap-3 text-left">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
            <p className="text-sm text-gray-600">Nous effectuons des améliorations pour vous offrir une meilleure expérience.</p>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
            <p className="text-sm text-gray-600">Vos données et votre solde sont en sécurité.</p>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
            <p className="text-sm text-gray-600">La maintenance ne dure généralement que quelques minutes.</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Merci de votre patience — L'équipe Nexarix
        </p>
      </div>
    </div>
  );
}
