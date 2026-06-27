import { useState, useRef } from "react";
import { useGetDashboard, useSpinWheel, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Gift, Sparkles, Star, Lock, Zap, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const SEGMENTS = [
  { label: "🎁 Cadeau",    color: "#1565C0", text: "#fff" },
  { label: "⭐ Bonus",     color: "#7B1FA2", text: "#fff" },
  { label: "🔥 Super",     color: "#E65100", text: "#fff" },
  { label: "💎 Jackpot",   color: "#00897B", text: "#fff" },
  { label: "✨ Chance",    color: "#C62828", text: "#fff" },
  { label: "🌟 Étoile",   color: "#1565C0", text: "#fff" },
  { label: "🏆 Top",       color: "#2E7D32", text: "#fff" },
  { label: "🎯 Bravo",     color: "#6A1B9A", text: "#fff" },
];

const N = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / N;

function buildPath(index: number, r: number, cx: number, cy: number) {
  const s = ((index * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  const e = (((index + 1) * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  return `M ${cx} ${cy} L ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)} Z`;
}

function labelPos(index: number, r: number, cx: number, cy: number) {
  const a = ((index + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  return { x: cx + r * 0.67 * Math.cos(a), y: cy + r * 0.67 * Math.sin(a), rot: (index + 0.5) * SEGMENT_ANGLE };
}

export default function SpinWheel() {
  const { user } = useAuth();
  const { data: dashboard } = useGetDashboard();
  const spinMutation = useSpinWheel();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ pointsEarned: number } | null>(null);
  const currentRot = useRef(0);

  const cx = 160, cy = 160, radius = 148;

  const isActivated = user?.status === "active";
  const hasSpun = !!(dashboard as any)?.hasSpun;

  const handleSpin = () => {
    if (spinning || hasSpun || !isActivated) return;

    // Pick a visual landing segment (random - just for animation)
    const visualIndex = Math.floor(Math.random() * N);
    const targetAngle = 360 * 10 + (360 - visualIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    const newRotation = currentRot.current + targetAngle;

    setSpinning(true);
    setResult(null);
    setRotation(newRotation);

    // Call backend after spin starts
    setTimeout(() => {
      spinMutation.mutate(undefined, {
        onSuccess: (data) => {
          setResult({ pointsEarned: data.pointsEarned });
          currentRot.current = newRotation % 360;
          setSpinning(false);
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({
            title: "🎉 Félicitations !",
            description: `Vous avez gagné ${data.pointsEarned} points !`,
          });
        },
        onError: (err: any) => {
          setSpinning(false);
          toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" });
        },
      });
    }, 4500);
  };

  if (!isActivated) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Lock className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Compte non activé</h2>
          <p className="text-gray-500 text-sm max-w-xs">
            Activez votre compte pour accéder à la Roue de la Fortune et gagner des points.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-[#7B1FA2] to-[#1565C0] p-5 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <h1 className="font-black text-xl">Roue de la Fortune</h1>
            <Sparkles className="h-5 w-5 text-yellow-300" />
          </div>
          <p className="text-purple-200 text-xs">
            {hasSpun ? "Vous avez déjà utilisé votre tirage" : "Un tirage unique offert après activation !"}
          </p>
        </div>

        {/* Wheel */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            {/* Outer glow ring */}
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${spinning ? "shadow-[0_0_40px_rgba(21,101,192,0.5)]" : "shadow-[0_0_20px_rgba(21,101,192,0.2)]"}`} />

            {/* Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
              <div className="w-5 h-7 bg-gradient-to-b from-yellow-400 to-amber-500 clip-triangle shadow-lg"
                style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
            </div>

            <svg
              width={320}
              height={320}
              viewBox="0 0 320 320"
              className="drop-shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4.5s cubic-bezier(0.17,0.67,0.08,0.99)" : "none",
              }}
            >
              {/* Outer border ring */}
              <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="white" strokeWidth={8} opacity={0.3} />
              <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="white" strokeWidth={2} />

              {SEGMENTS.map((seg, i) => {
                const pos = labelPos(i, radius, cx, cy);
                const lines = seg.label.split(" ");
                return (
                  <g key={i}>
                    <path d={buildPath(i, radius, cx, cy)} fill={seg.color} stroke="#ffffff20" strokeWidth={1} />
                    <text
                      x={pos.x} y={pos.y}
                      fill={seg.text}
                      fontSize={10}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${pos.rot}, ${pos.x}, ${pos.y})`}
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {lines.map((line, li) => (
                        <tspan key={li} x={pos.x} dy={li === 0 ? (lines.length > 1 ? "-6" : "0") : "13"}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {/* Center circle */}
              <circle cx={cx} cy={cy} r={28} fill="white" stroke="#1565C0" strokeWidth={4} />
              <circle cx={cx} cy={cy} r={22} fill="#1565C0" />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={20}>⭐</text>
            </svg>
          </div>

          {/* Result card */}
          {result && (
            <div className="w-full max-w-xs mx-auto rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white text-center shadow-xl animate-bounce-once">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-300" />
              <p className="text-sm text-emerald-100 mb-1">Félicitations ! Vous avez gagné</p>
              <p className="text-4xl font-black">{result.pointsEarned}</p>
              <p className="text-emerald-200 font-semibold">POINTS</p>
              <p className="text-xs text-emerald-300 mt-2">Ajoutés à votre solde de points</p>
            </div>
          )}

          {/* Spin button or locked state */}
          {hasSpun && !spinning ? (
            <div className="w-full max-w-xs">
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-4 text-center justify-center">
                <Lock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Tirage utilisé</p>
                  <p className="text-xs text-gray-500 mt-0.5">Vous avez déjà utilisé votre roue de la fortune</p>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleSpin}
              disabled={spinning || hasSpun}
              className="h-14 px-10 text-base font-black rounded-2xl bg-gradient-to-r from-[#7B1FA2] to-[#1565C0] hover:from-[#6A1B9A] hover:to-[#0D47A1] text-white shadow-xl shadow-purple-300/40 dark:shadow-purple-900/40 disabled:opacity-60"
            >
              {spinning ? (
                <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />La roue tourne...</>
              ) : (
                <><Star className="h-5 w-5 mr-2 fill-current" />Lancer la roue !</>
              )}
            </Button>
          )}
        </div>

        {/* Info card */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-purple-500" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">Comment ça fonctionne ?</p>
          </div>
          <div className="space-y-2">
            {[
              { icon: "1️⃣", text: "Activez votre compte pour débloquer la roue" },
              { icon: "2️⃣", text: "Lancez la roue — un seul essai disponible !" },
              { icon: "3️⃣", text: "Les points gagnés sont crédités immédiatement" },
              { icon: "4️⃣", text: "Convertissez vos points en FCFA (1 000 pts = 500 XOF)" },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex items-start gap-2">
                <span className="text-sm shrink-0">{icon}</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-900/30 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs text-gray-500">Les points sont directement ajoutés à votre solde de points.</p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
