import { Link } from "react-router-dom";
import AnimatedBackground from "../components/AnimatedBackground";
import {
  Upload,
  ScanSearch,
  Zap,
  ShieldCheck,
  Brain,
  AlertTriangle,
  FileCheck,
  ArrowRight,
} from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload Documents", desc: "Submit your KYC documents — Aadhaar, PAN, bank statements.", color: "from-cyan-500 to-blue-500" },
  { icon: ScanSearch, title: "AI Verification", desc: "Our engine extracts, cross-validates, and scores every signal.", color: "from-purple-500 to-pink-500" },
  { icon: Zap, title: "Instant Decision", desc: "Get an explainable trust score and loan decision in seconds.", color: "from-amber-500 to-orange-500" },
];

const features = [
  { icon: Brain, title: "Trust Score Fusion", desc: "Multi-signal AI scoring that weighs credit, documents, fraud, and income into one transparent number.", color: "text-cyan-400", border: "hover:border-cyan-500/40", glow: "hover:shadow-cyan-500/10" },
  { icon: FileCheck, title: "Explainable AI", desc: "See exactly why decisions are made — full breakdown of every signal and its contribution.", color: "text-purple-400", border: "hover:border-purple-500/40", glow: "hover:shadow-purple-500/10" },
  { icon: AlertTriangle, title: "Fraud Detection", desc: "Real-time synthetic ID detection, velocity checks, and cross-document validation.", color: "text-amber-400", border: "hover:border-amber-500/40", glow: "hover:shadow-amber-500/10" },
  { icon: ShieldCheck, title: "RBI Compliant", desc: "Full audit trail on every decision. DPDP-compliant data handling with regulatory codes.", color: "text-emerald-400", border: "hover:border-emerald-500/40", glow: "hover:shadow-emerald-500/10" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-28 pb-28 text-center overflow-hidden">
        <AnimatedBackground />
        <div style={{ animation: "fadeInScale 0.8s ease-out" }}>
          <h1 className="text-5xl md:text-7xl font-bold gradient-text-animated mb-5">
            TrustLend
          </h1>
        </div>
        <p className="text-xl text-gray-300 font-medium mb-3 max-w-2xl" style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}>
          AI-Powered Trust Score Lending — Fair, Fast, Transparent
        </p>
        <p className="text-gray-500 max-w-xl mb-10 leading-relaxed" style={{ animation: "fadeInUp 0.6s ease-out 0.4s both" }}>
          Multi-signal fusion engine that evaluates creditworthiness using documents,
          credit history, and fraud detection — with full explainability.
        </p>
        <div className="flex flex-wrap gap-4 justify-center" style={{ animation: "fadeInUp 0.6s ease-out 0.6s both" }}>
          <Link
            to="/apply"
            className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95 btn-ripple flex items-center gap-2"
          >
            Apply for Loan
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            to="/apply?demo=true"
            className="px-8 py-3.5 rounded-xl border border-cyan-500/30 text-gray-300 font-semibold hover:border-amber-400/50 hover:bg-amber-500/5 hover:text-amber-300 transition-all duration-300 active:scale-95"
          >
            Try Demo
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
        <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">Three simple steps to get your loan decision with full transparency</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center card-interactive" style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.15}s both` }}>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 shadow-lg`} style={{ animation: `bounce-subtle 2.5s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}>
                <step.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Key Features</h2>
        <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">Built for modern lending with explainability at its core</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feat, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm p-6 ${feat.border} transition-all duration-300 hover:shadow-xl ${feat.glow} card-interactive`}
              style={{ animation: `float 4s ease-in-out infinite`, animationDelay: `${i * 0.7}s` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <feat.icon className={`w-7 h-7 ${feat.color}`} />
                <h3 className="text-lg font-semibold text-white">{feat.title}</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/30 mt-12 py-8 text-center text-gray-500 text-sm">
        <p>Built by <span className="text-gray-300 font-medium">Team TrustLend</span> — Redefining lending with explainable AI.</p>
        <p className="mt-1">&copy; 2026 TrustLend. All rights reserved.</p>
      </footer>
    </div>
  );
}
