const LABELS = {
  credit: "Credit Score",
  documents: "Documents",
  fraud_inverse: "Fraud Check",
  income: "Income Adequacy",
};

const COLORS = {
  credit: { bar: "from-cyan-500 to-blue-500", text: "text-cyan-400" },
  documents: { bar: "from-purple-500 to-pink-500", text: "text-purple-400" },
  fraud_inverse: { bar: "from-emerald-500 to-teal-500", text: "text-emerald-400" },
  income: { bar: "from-amber-500 to-orange-500", text: "text-amber-400" },
};

export default function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;

  const signals = Object.entries(breakdown);

  return (
    <div className="space-y-5 stagger-children">
      {signals.map(([key, data]) => {
        const color = COLORS[key] || { bar: "from-gray-500 to-gray-400", text: "text-gray-400" };
        return (
          <div key={key} style={{ animation: "fadeInLeft 0.4s ease-out both" }}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className={`font-medium ${color.text}`}>{LABELS[key] || key}</span>
              <span className="text-gray-400">
                {data.normalized.toFixed(0)}/100
                <span className="ml-2 text-xs text-gray-600">
                  (w:{(data.weight * 100).toFixed(0)}% &#8594; {data.contribution.toFixed(1)})
                </span>
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-800/50 overflow-hidden">
              <div
                className={`h-3 rounded-full bg-gradient-to-r ${color.bar} transition-all duration-1000`}
                style={{ width: `${Math.min(data.normalized, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
