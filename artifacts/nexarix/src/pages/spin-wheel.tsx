import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Star, Zap, Gift, Lock } from "lucide-react";

const SEGMENTS = [
  { label: "50 pts",    color: "#1565C0", text: "#fff" },
  { label: "100 pts",   color: "#1E88E5", text: "#fff" },
  { label: "Perdu",     color: "#E53935", text: "#fff" },
  { label: "200 pts",   color: "#7B1FA2", text: "#fff" },
  { label: "500 pts",   color: "#F57F17", text: "#fff" },
  { label: "Perdu",     color: "#E53935", text: "#fff" },
  { label: "75 pts",    color: "#00897B", text: "#fff" },
  { label: "1000 pts",  color: "#2E7D32", text: "#fff" },
];

const N = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / N;

function buildWheelPath(index: number, radius: number, cx: number, cy: number) {
  const startAngle = ((index * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  const endAngle = (((index + 1) * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
}

function getLabelPosition(index: number, radius: number, cx: number, cy: number) {
  const angle = ((index + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  return {
    x: cx + radius * 0.65 * Math.cos(angle),
    y: cy + radius * 0.65 * Math.sin(angle),
    angle: (index + 0.5) * SEGMENT_ANGLE,
  };
}

const DAILY_KEY = "nexarix_last_spin";

function canSpinToday(): boolean {
  const last = localStorage.getItem(DAILY_KEY);
  if (!last) return true;
  const lastDate = new Date(last);
  const now = new Date();
  return (
    lastDate.getDate() !== now.getDate() ||
    lastDate.getMonth() !== now.getMonth() ||
    lastDate.getFullYear() !== now.getFullYear()
  );
}

function getNextSpinTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - Date.now();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}min`;
}

export default function SpinWheel() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [alreadySpun, setAlreadySpun] = useState(!canSpinToday());
  const { toast } = useToast();
  const currentRotation = useRef(0);

  const cx = 150;
  const cy = 150;
  const radius = 140;

  const handleSpin = () => {
    if (spinning || alreadySpun) return;

    const winIndex = Math.floor(Math.random() * N);
    const targetAngle = 360 * 8 + (360 - winIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    const newRotation = currentRotation.current + targetAngle;

    setSpinning(true);
    setResult(null);
    setRotation(newRotation);

    setTimeout(() => {
      const label = SEGMENTS[winIndex].label;
      setResult(label);
      setSpinning(false);
      currentRotation.current = newRotation % 360;
      localStorage.setItem(DAILY_KEY, new Date().toISOString());
      setAlreadySpun(true);

      if (label === "Perdu") {
        toast({ title: "😢 Pas de chance !", description: "Réessayez demain !", variant: "destructive" });
      } else {
        toast({ title: "🎉 Félicitations !", description: `Vous avez gagné ${label} !` });
      }
    }, 4200);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Roue de la Fortune</h1>
          <p className="text-muted-foreground text-sm">Une tentative gratuite par jour · Minuit remise à zéro</p>
        </div>

        {/* Wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#1565C0] drop-shadow-lg" />
            </div>

            <svg
              width={300}
              height={300}
              viewBox="0 0 300 300"
              className="drop-shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" : "none",
              }}
            >
              {SEGMENTS.map((seg, i) => {
                const pos = getLabelPosition(i, radius, cx, cy);
                return (
                  <g key={i}>
                    <path d={buildWheelPath(i, radius, cx, cy)} fill={seg.color} stroke="#fff" strokeWidth={2} />
                    <text
                      x={pos.x}
                      y={pos.y}
                      fill={seg.text}
                      fontSize={seg.label.length > 7 ? 9 : 11}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${pos.angle}, ${pos.x}, ${pos.y})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
              {/* Centre */}
              <circle cx={cx} cy={cy} r={22} fill="#fff" stroke="#1565C0" strokeWidth={4} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={18}>🎯</text>
            </svg>
          </div>

          {/* Résultat */}
          {result && (
            <div className={`rounded-2xl px-6 py-3 text-center font-bold text-lg shadow-lg ${
              result === "Perdu"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            }`}>
              {result === "Perdu" ? "😢 Pas de chance !" : `🎉 Vous avez gagné ${result} !`}
            </div>
          )}

          {/* Bouton spin */}
          {alreadySpun ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-3">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Prochain spin dans {getNextSpinTime()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Revenez demain pour un nouveau tirage !</p>
            </div>
          ) : (
            <Button
              onClick={handleSpin}
              disabled={spinning}
              className="h-14 px-10 text-lg font-bold rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] hover:from-[#0D47A1] hover:to-[#1565C0] text-white shadow-xl shadow-blue-300 dark:shadow-blue-900/40"
            >
              {spinning ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  La roue tourne...
                </>
              ) : (
                <>
                  <Star className="h-5 w-5 mr-2" /> Lancer la roue !
                </>
              )}
            </Button>
          )}
        </div>

        {/* Gains possibles */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-500" />
            Gains possibles
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {SEGMENTS.filter(s => s.label !== "Perdu").map(s => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ backgroundColor: s.color + "22" }}
              >
                <Zap className="h-3.5 w-3.5" style={{ color: s.color }} />
                <span className="text-sm font-semibold" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Les points gagnés sont convertibles en FCFA (1 000 pts = 500 XOF)
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
