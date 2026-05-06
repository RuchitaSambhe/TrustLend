import { useEffect, useState, Component } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowLeft,
  FileCheck,
  ScanSearch,
  CreditCard,
  ShieldAlert,
  Brain,
  Gavel,
  Calculator,
} from "lucide-react";
import { getApplication } from "../api";
import TrustScoreGauge from "../components/TrustScoreGauge";
import ScoreBreakdown from "../components/ScoreBreakdown";
import EMIPlanCard from "../components/EMIPlanCard";

const STEP_ICONS = {
  document_processing: FileCheck,
  cross_validation: ScanSearch,
  credit_scoring: CreditCard,
  fraud_detection: ShieldAlert,
  trust_score_calculation: Brain,
  decision: Gavel,
  emi_planning: Calculator,
};

class ResultErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
          <p className="text-red-400 text-lg mb-2">Something went wrong displaying results.</p>
          <p className="text-gray-500 text-sm mb-4">{String(this.state.error)}</p>
          <a href="/apply" className="text-cyan-400 hover:underline">← Back to Apply</a>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Result() {
  return (
    <ResultErrorBoundary>
      <ResultContent />
    </ResultErrorBoundary>
  );
}

function ResultContent() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [lenderView, setLenderView] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data, error: err } = await getApplication(id);
      if (err) setError(err);
      else setApp(data);
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Skeleton banner */}
          <div className="h-28 rounded-2xl skeleton-shimmer mb-10" />
          {/* Skeleton score section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="flex justify-center">
              <div className="w-52 h-52 rounded-full skeleton-shimmer" />
            </div>
            <div className="space-y-4">
              <div className="h-6 w-3/4 rounded skeleton-shimmer" />
              <div className="h-4 w-full rounded skeleton-shimmer" />
              <div className="h-4 w-5/6 rounded skeleton-shimmer" />
              <div className="h-4 w-2/3 rounded skeleton-shimmer" />
              <div className="h-4 w-4/5 rounded skeleton-shimmer" />
            </div>
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-300 mb-4">{error || "Application not found"}</p>
        <Link to="/apply" className="text-cyan-400 hover:underline">← Back to Apply</Link>
      </div>
    );
  }

  const { decision, trust_score, trust_score_breakdown, emi_plans, fraud_signals, audit_trail, compliance } = app;

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      {/* Nav */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link to="/apply" className="inline-flex items-center gap-1 text-gray-400 hover:text-cyan-400 text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Decision Banner */}
      <DecisionBanner decision={decision} reason={app.decision_reason} />

      {/* Trust Score Section */}
      <section className="max-w-5xl mx-auto px-4 mt-10">
        <h2 className="text-2xl font-bold text-white mb-6">Trust Score Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex justify-center relative">
            <TrustScoreGauge score={trust_score} size={220} />
          </div>
          <div>
            <ScoreBreakdown breakdown={trust_score_breakdown} />
          </div>
        </div>

        {/* AI Reasoning */}
        {app.decision_reason && (
          <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">AI Reasoning</h3>
            </div>
            <blockquote className="text-gray-300 leading-relaxed border-l-2 border-purple-500 pl-4 italic">
              {app.decision_reason}
            </blockquote>
          </div>
        )}
      </section>

      {/* KYC Verification Status */}
      <section className="max-w-5xl mx-auto px-4 mt-10">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">KYC Verification</h3>
          {app.documents_verified && app.documents_verified.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {app.documents_verified.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800">
                    <span className="text-emerald-400">&#10003;</span>
                    <span className="text-sm text-gray-300 capitalize">{doc.doc_type.replace("_", " ")}</span>
                    <span className="ml-auto text-xs text-emerald-400">{(doc.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Name (from docs)</span>
                  <span className="text-white">{app.applicant_name}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Aadhaar</span>
                  <span className="text-white font-mono">XXXX-XXXX-4532</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>PAN</span>
                  <span className="text-white font-mono">ABCPK****F</span>
                </div>
                <div className="flex justify-between text-gray-400 pt-2 border-t border-gray-800">
                  <span>Document Cross-Validation</span>
                  <span className={`font-medium ${fraud_signals && fraud_signals.some(s => s.type === "name_mismatch") ? "text-red-400" : "text-emerald-400"}`}>
                    {fraud_signals && fraud_signals.some(s => s.type === "name_mismatch") ? "FAILED" : "PASSED"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
              <span className="text-yellow-400">&#9888;</span>
              <span className="text-sm text-yellow-300">KYC Pending - Documents required for full verification</span>
            </div>
          )}
        </div>
      </section>

      {/* EMI Plans (if approved) */}
      {decision === "approved" && emi_plans && emi_plans.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Your Personalized EMI Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {emi_plans.map((plan, i) => (
              <EMIPlanCard key={i} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {/* Rejected - Next Steps */}
      {decision === "rejected" && (
        <section className="max-w-5xl mx-auto px-4 mt-12">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-bold text-white mb-4">What You Can Do</h2>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Improve your credit score by paying off existing loans and maintaining timely payments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Provide additional documents such as salary slips, ITR filings, or property papers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Apply for a lower loan amount or longer tenure to improve income adequacy.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Ensure all documents have consistent names and dates across them.</span>
              </li>
            </ul>
            {fraud_signals && fraud_signals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-red-400 font-medium mb-2">Fraud Signals Detected:</p>
                {fraud_signals.map((s, i) => (
                  <p key={i} className="text-sm text-gray-400 ml-4">— {s.description}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Audit Trail */}
      <section className="max-w-5xl mx-auto px-4 mt-12">
        <button
          onClick={() => setAuditOpen(!auditOpen)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition mb-4"
        >
          {auditOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          <span className="font-semibold">Audit Trail</span>
          <span className="text-xs text-gray-500">({audit_trail?.length || 0} steps)</span>
        </button>

        {auditOpen && audit_trail && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="space-y-4">
              {audit_trail.map((step, i) => {
                const Icon = STEP_ICONS[step.step] || FileCheck;
                const isPass = !step.result.toLowerCase().includes("error");
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPass ? "bg-emerald-900/50" : "bg-red-900/50"}`}>
                        <Icon className={`w-4 h-4 ${isPass ? "text-emerald-400" : "text-red-400"}`} />
                      </div>
                      {i < audit_trail.length - 1 && <div className="w-px h-6 bg-gray-700 mt-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white capitalize">
                          {step.step.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-500">{step.duration_ms}ms</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{step.result}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Lender View Toggle */}
      <section className="max-w-5xl mx-auto px-4 mt-10">
        <button
          onClick={() => setLenderView(!lenderView)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-cyan-400 hover:text-cyan-400 text-sm transition"
        >
          <Eye className="w-4 h-4" />
          {lenderView ? "Hide Lender View" : "Switch to Lender View"}
        </button>

        {lenderView && (
          <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-2">Risk Report</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Trust Score</p>
                  <p className="text-white font-bold text-lg">{trust_score}/100</p>
                </div>
                <div>
                  <p className="text-gray-500">Decision</p>
                  <p className="text-white font-bold capitalize">{decision}</p>
                </div>
                <div>
                  <p className="text-gray-500">Fraud Signals</p>
                  <p className="text-white font-bold">{fraud_signals?.length || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Docs Verified</p>
                  <p className="text-white font-bold">{app.documents_verified?.length || 0}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-2">Compliance</h3>
              <div className="flex flex-wrap gap-2">
                {compliance?.rbi_codes?.map((code, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300">{code}</span>
                ))}
                <span className={`px-2 py-1 rounded text-xs ${compliance?.dpdp_compliant ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                  DPDP {compliance?.dpdp_compliant ? "Compliant" : "Non-Compliant"}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-2">Raw Signal Data</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {trust_score_breakdown && Object.entries(trust_score_breakdown).map(([key, data]) => (
                  <div key={key} className="p-3 rounded-lg bg-gray-800">
                    <p className="text-gray-400 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                    <p className="text-white">Raw: {data.raw} → Normalized: {data.normalized} → Contribution: {data.contribution}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-2">Documents Verified</h3>
              <div className="flex flex-wrap gap-2">
                {app.documents_verified?.map((doc, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-gray-800 text-xs text-gray-300">
                    {doc.doc_type} <span className="text-emerald-400 ml-1">{(doc.confidence * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function DecisionBanner({ decision, reason }) {
  if (decision === "approved") {
    return (
      <div className="relative overflow-hidden mt-6 mx-4 max-w-5xl lg:mx-auto rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 p-8" style={{ animation: "fadeInUp 0.6s ease-out" }}>
        {/* Confetti dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#fbbf24"][i % 5],
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${1.5 + Math.random()}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
        <div className="relative flex items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-emerald-300">Loan Approved</h2>
            <p className="text-emerald-200/80 text-sm mt-1">{reason}</p>
          </div>
        </div>
      </div>
    );
  }

  if (decision === "rejected") {
    return (
      <div className="mt-6 mx-4 max-w-5xl lg:mx-auto rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 p-8" style={{ animation: "fadeInUp 0.6s ease-out" }}>
        <div className="flex items-center gap-4">
          <XCircle className="w-10 h-10 text-red-400 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-red-300">Application Not Approved</h2>
            <p className="text-red-200/80 text-sm mt-1">{reason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 mx-4 max-w-5xl lg:mx-auto rounded-2xl bg-gradient-to-r from-yellow-900/60 to-yellow-700/30 border border-yellow-700/50 p-8">
      <div className="flex items-center gap-4">
        <Clock className="w-10 h-10 text-yellow-400 flex-shrink-0" />
        <div>
          <h2 className="text-2xl font-bold text-yellow-300">Under Review</h2>
          <p className="text-yellow-200/80 text-sm mt-1">{reason}</p>
        </div>
      </div>
    </div>
  );
}
