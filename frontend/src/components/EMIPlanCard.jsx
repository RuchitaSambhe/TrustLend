import { IndianRupee } from "lucide-react";

export default function EMIPlanCard({ plan }) {
  const isRecommended = plan.recommendation === "Recommended";
  const ratio = Math.min(plan.emi_to_income_ratio, 100);

  const ratioColor =
    ratio < 30
      ? "bg-emerald-500"
      : ratio <= 40
      ? "bg-cyan-500"
      : ratio <= 60
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all duration-300 card-interactive ${
        isRecommended
          ? "border-emerald-500/40 bg-gradient-to-b from-emerald-900/20 to-gray-900/60 backdrop-blur-sm"
          : "border-gray-800/50 bg-gray-900/40 backdrop-blur-sm hover:border-purple-500/30"
      }`}
      style={isRecommended ? { animation: "pulse-glow-emerald 2.5s ease-in-out infinite" } : { animation: "fadeInUp 0.5s ease-out" }}
    >
      {isRecommended && (
        <span className="absolute -top-3 left-4 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-0.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20">
          &#9733; Recommended
        </span>
      )}

      <h3 className="text-lg font-semibold text-white mb-1">{plan.plan_name}</h3>
      <p className="text-sm text-gray-500 mb-4">{plan.tenure_months} months @ {plan.interest_rate_annual}% p.a.</p>

      <div className="flex items-baseline gap-1 mb-5">
        <IndianRupee className="w-5 h-5 text-cyan-400" />
        <span className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {plan.monthly_emi.toLocaleString("en-IN")}
        </span>
        <span className="text-sm text-gray-500">/month</span>
      </div>

      <div className="space-y-2.5 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Total Payable</span>
          <span className="text-white font-medium">&#8377;{plan.total_payable.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Interest</span>
          <span className="text-amber-400 font-medium">&#8377;{plan.total_interest.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-800/50">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">EMI-to-Income Ratio</span>
          <span className={`font-semibold ${ratio <= 40 ? "text-emerald-400" : ratio <= 60 ? "text-amber-400" : "text-red-400"}`}>{plan.emi_to_income_ratio}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-800/50 overflow-hidden">
          <div
            className={`h-2.5 rounded-full ${ratioColor} transition-all duration-700`}
            style={{ width: `${ratio}%` }}
          />
        </div>
      </div>
    </div>
  );
}
