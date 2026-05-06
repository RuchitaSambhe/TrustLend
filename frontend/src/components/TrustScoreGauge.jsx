import { useEffect, useState } from "react";

function getColor(score) {
  if (score >= 80) return { stroke: "#10b981", label: "text-emerald-400" };
  if (score >= 70) return { stroke: "#22c55e", label: "text-green-400" };
  if (score >= 60) return { stroke: "#eab308", label: "text-yellow-400" };
  if (score >= 45) return { stroke: "#f97316", label: "text-orange-400" };
  return { stroke: "#ef4444", label: "text-red-400" };
}

function getTier(score) {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 45) return "Poor";
  return "Very Poor";
}

export default function TrustScoreGauge({ score, size = 200 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let frame;
    let start = null;
    const duration = 1200;

    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = animatedScore / 100;
  const dashOffset = circumference * (1 - progress);
  const { stroke, label } = getColor(animatedScore);
  const center = size / 2;

  return (
    <div className="flex flex-col items-center score-ring-glow">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth="12"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-5xl font-bold ${label}`}>{animatedScore}</span>
        <span className="text-sm text-gray-400 mt-1">{getTier(animatedScore)}</span>
      </div>
    </div>
  );
}
