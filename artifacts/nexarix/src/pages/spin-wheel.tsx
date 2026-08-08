import { useState, useRef } from "react";
import { useGetDashboard, useSpinWheel, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { Gift, Sparkles, Lock, Star, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";

// Mystery segments — NO amounts shown, purely decorative
const SEGMENTS = [
  { label: "🎁",  color: "#0ea5e9", dark: "#0284c7" },
  { label: "⭐",  color: "#8b5cf6", dark: "#7c3aed" },
  { label: "🔥",  color: "#10b981", dark: "#059669" },
  { label: "💎",  color: "#f59e0b", dark: "#d97706" },
  { label: "✨",  color: "#ef4444", dark: "#dc2626" },
  { label: "🌟",  color: "#06b6d4", dark: "#0891b2" },
  { label: "🏆",  color: "#6366f1", dark: "#4f46e5" },
  { label: "🎯",  color: "#14b8a6", dark: "#0d9488" },
];

const N = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / N;

function buildPath(i: number, r: number, cx: number, cy: number) {
  const s = ((i * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  const e = (((i + 1) * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  return `M${cx},${cy} L${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A${r},${r} 0 0 1 ${cx + r * Math.cos(e)},${cy + r * Math.sin(e)} Z`;
}

function innerPath(i: number, rOuter: number, rInner: number, cx: number, cy: number) {
  const s = ((i * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  const e = (((i + 1) * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  return `M${cx + rInner * Math.cos(s)},${cy + rInner * Math.sin(s)} A${rInner},${rInner} 0 0 1 ${cx + rInner * Math.cos(e)},${cy + rInner * Math.sin(e)} L${cx + rOuter * Math.cos(e)},${cy + rOuter * Math.sin(e)} A${rOuter},${rOuter} 0 0 0 ${cx + rOuter * Math.cos(s)},${cy + rOuter * Math.sin(s)} Z`;
}

function labelPos(i: number, r: number, cx: number, cy: number) {
  const a = ((i + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  return { x: cx + r * 0.63 * Math.cos(a), y: cy + r * 0.63 * Math.sin(a), rot: (i + 0.5) * SEGMENT_ANGLE };
}

export default function SpinWheel() {
  const { user } = useAuth();
  const { data: dashboard } = useGetDashboard();
  const spinMutation = useSpinWheel();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ fcfaEarned: number } | null>(null);
  const currentRot = useRef(0);

  const cx = 160, cy = 160, radius = 148;

  const isActivated = user?.status === "active";
  const hasSpun = !!(dashboard as any)?.hasSpun;

  const handleSpin = () => {
    if (spinning || hasSpun || !isActivated) return;
    const visualIndex = Math.floor(Math.random() * N);
    const extraSpins = 8 + Math.floor(Math.random() * 5);
    const targetAngle = 360 * extraSpins + (360 - visualIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    const newRotation = currentRot.current + targetAngle;

    setSpinning(true);
    setResult(null);
    setRotation(newRotation);

    setTimeout(() => {
      spinMutation.mutate(undefined, {
        onSuccess: (data: any) => {
          const earned = data?.fcfaEarned ?? data?.pointsEarned ?? 0;
          setResult({ fcfaEarned: earned });
          currentRot.current = newRotation % 360;
          setSpinning(false);
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "🎉 Félicitations !", description: `Vous avez gagné ${earned} F crédités sur votre solde !` });
        },
        onError: (err: any) => {
          setSpinning(false);
          toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" });
        },
      });
    }, 5000);
  };

  if (!isActivated) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
            <Lock className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Compte non activé</h2>
          <p className="text-gray-400 text-sm max-w-xs font-medium">
            Activez votre compte pour accéder à la Roue de la Fortune.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[22px] text-white text-center"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)" }}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10 py-5 px-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <h1 className="font-black text-xl">Roue de la Fortune</h1>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
            <p className="text-purple-200 text-xs font-semibold">
              {hasSpun ? "Vous avez déjà utilisé votre tirage" : "Un tirage unique — tournez pour gagner !"}
            </p>
          </div>
        </motion.div>

        {/* Wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Glow */}
            <div className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 ${spinning ? "opacity-40" : "opacity-10"}`}
              style={{ background: "radial-gradient(circle, #8b5cf6, #0ea5e9)" }} />

            {/* Pointer */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="w-0 h-0" style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "22px solid #f59e0b",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
              }} />
            </div>

            <svg
              width={320} height={320}
              viewBox="0 0 320 320"
              className="drop-shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 5s cubic-bezier(0.15, 0.7, 0.05, 1.0)" : "none",
              }}
            >
              <defs>
                <filter id="seg-shadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Outer decorative ring */}
              <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke="white" strokeWidth={3} opacity={0.15} />
              <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="white" strokeWidth={1.5} opacity={0.3} />

              {/* Segments */}
              {SEGMENTS.map((seg, i) => {
                const pos = labelPos(i, radius, cx, cy);
                return (
                  <g key={i} filter="url(#seg-shadow)">
                    <path d={buildPath(i, radius, cx, cy)} fill={seg.color} stroke="white" strokeWidth={1.5} />
                    {/* Inner shade */}
                    <path d={innerPath(i, radius, radius * 0.3, cx, cy)} fill={seg.dark} opacity={0.25} />
                    {/* Emoji label */}
                    <text
                      x={pos.x} y={pos.y + 2}
                      fontSize={22}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${pos.rot}, ${pos.x}, ${pos.y})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}

              {/* Spoke lines */}
              {SEGMENTS.map((_, i) => {
                const a = ((i * SEGMENT_ANGLE - 90) * Math.PI) / 180;
                return (
                  <line key={`spoke-${i}`}
                    x1={cx + 28 * Math.cos(a)} y1={cy + 28 * Math.sin(a)}
                    x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)}
                    stroke="white" strokeWidth={1} opacity={0.25}
                  />
                );
              })}

              {/* Center hub */}
              <circle cx={cx} cy={cy} r={30} fill="white" />
              <circle cx={cx} cy={cy} r={26} style={{ fill: "url(#hub-grad)" }} />
              <defs>
                <radialGradient id="hub-grad" cx="40%" cy="35%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </radialGradient>
              </defs>
              <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fontSize={18}>⭐</text>
            </svg>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 14 }}
                className="w-full max-w-xs rounded-[22px] text-white text-center p-5 shadow-2xl shadow-emerald-200/60"
                style={{ background: "linear-gradient(135deg, #10b981, #0ea5e9)" }}
              >
                <Trophy className="h-9 w-9 mx-auto mb-2 text-yellow-300" />
                <p className="text-emerald-100 text-sm font-semibold mb-1">🎉 Félicitations !</p>
                <p className="font-black text-5xl leading-none">{result.fcfaEarned}</p>
                <p className="text-emerald-200 font-bold text-sm mt-1">FCFA crédités</p>
                <p className="text-emerald-300 text-xs mt-2 font-medium">Ajoutés à votre solde parrainage</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Button / Locked */}
          {hasSpun && !spinning ? (
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-6 py-4">
              <Lock className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-black text-gray-600">Tirage déjà utilisé</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Un seul essai par compte</p>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSpin}
              disabled={spinning || hasSpun}
              className="h-14 px-12 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              style={{ background: spinning ? "#9ca3af" : "linear-gradient(135deg, #7c3aed, #0ea5e9)" }}
            >
              {spinning ? (
                <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> La roue tourne…</>
              ) : (
                <><Star className="h-5 w-5 fill-current" /> Lancer la roue !</>
              )}
            </motion.button>
          )}
        </div>

        {/* Info */}
        <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-xl bg-purple-50 flex items-center justify-center">
              <Gift className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <p className="font-black text-gray-900 text-sm">Comment ça marche ?</p>
          </div>
          <div className="space-y-2.5">
            {[
              { n: "1", text: "Activez votre compte pour débloquer la roue" },
              { n: "2", text: "Cliquez sur « Lancer la roue » — un seul essai !" },
              { n: "3", text: "Les FCFA gagnés sont crédités immédiatement sur votre solde" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #0ea5e9)" }}>
                  {n}
                </div>
                <p className="text-xs text-gray-500 font-medium">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-gray-400 font-medium">Les montants sont une surprise — bonne chance ! 🍀</p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
