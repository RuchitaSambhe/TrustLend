import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { submitApplication, runDemo } from "../api";
import VoiceRecorder from "../components/VoiceRecorder";

const PURPOSES = [
  "Home Loan",
  "Personal Loan",
  "Business Loan",
  "Education Loan",
  "Vehicle Loan",
];

const TENURES = [12, 24, 36, 48, 60];

const PROCESSING_STEPS = [
  "Extracting documents...",
  "Verifying identity...",
  "Calculating trust score...",
  "Generating decision...",
];

const DOC_SLOTS = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "pan", label: "PAN Card" },
  { key: "bank", label: "Bank Statement" },
];

function capitalizeName(value) {
  return value
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Apply() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    loan_amount: "",
    monthly_income: "",
    cibil_score: "",
    loan_purpose: "Personal Loan",
    tenure_months: "36",
  });
  const [docFiles, setDocFiles] = useState({ aadhaar: null, pan: null, bank: null });
  const [skipDocs, setSkipDocs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading) return;
    if (processingStep >= PROCESSING_STEPS.length) return;
    const timer = setTimeout(() => {
      setProcessingStep((s) => s + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [loading, processingStep]);

  const allDocsUploaded = docFiles.aadhaar && docFiles.pan && docFiles.bank;
  const canSubmit = form.name && form.phone.length === 10 && form.loan_amount && form.monthly_income && form.cibil_score && (allDocsUploaded || skipDocs);

  const handleDemo = async (scenario) => {
    setLoading(true);
    setProcessingStep(0);
    setError(null);

    const startTime = Date.now();
    const { data, error: err } = await runDemo(scenario);

    if (err || !data || !data.application_id) {
      setError(err || "Demo failed. Please try again.");
      setLoading(false);
      return;
    }

    const appId = data.application_id;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 3000 - elapsed);
    setTimeout(() => { navigate(`/result/${appId}`); }, remaining);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProcessingStep(0);
    setError(null);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("phone", form.phone);
    formData.append("loan_amount", form.loan_amount);
    formData.append("loan_purpose", form.loan_purpose);
    formData.append("tenure_months", form.tenure_months);
    formData.append("monthly_income", form.monthly_income || "50000");
    formData.append("cibil_score", form.cibil_score || "700");

    // Append document files if uploaded
    if (!skipDocs) {
      Object.values(docFiles).forEach((file) => {
        if (file) formData.append("documents", file);
      });
    }

    try {
      const { data, error: err } = await submitApplication(formData);

      if (err || !data || !data.application_id) {
        setError(err || "Failed to process application. Please try again.");
        setLoading(false);
        return;
      }

      const appId = data.application_id;
      setTimeout(() => { navigate(`/result/${appId}`); }, 1000);
    } catch (ex) {
      setError("Unexpected error: " + ex.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-8" />
        <div className="space-y-3 w-full max-w-sm">
          {PROCESSING_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-500 ${
                i <= processingStep ? "opacity-100" : "opacity-30"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  i < processingStep
                    ? "bg-emerald-400"
                    : i === processingStep
                    ? "bg-cyan-400 animate-pulse"
                    : "bg-gray-600"
                }`}
              />
              <span className="text-gray-300 text-sm">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Loan Application</h1>
        <p className="text-gray-400 mb-8">Fill in your details and upload documents for instant evaluation.</p>

        {/* Demo buttons */}
        {isDemo && (
          <div className="mb-8 p-4 rounded-xl border border-gray-800 bg-gray-900">
            <p className="text-sm text-gray-400 mb-3">Quick Demo scenarios:</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleDemo("approved")} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition">Approved Scenario</button>
              <button onClick={() => handleDemo("rejected")} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition">Rejected Scenario</button>
              <button onClick={() => handleDemo("borderline")} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium transition">Borderline Scenario</button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Voice Input */}
        <div className="mb-8 p-6 rounded-xl border border-gray-800 bg-gray-900/50">
          <p className="text-sm text-gray-400 text-center mb-4">Or tell us about your loan needs</p>
          <VoiceRecorder onParsed={(parsed) => setForm((prev) => ({ ...prev, ...parsed }))} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: capitalizeName(e.target.value) })}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Letters and spaces only</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              maxLength={10}
              pattern="[0-9]{10}"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              placeholder="10-digit mobile number"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{form.phone.length}/10 digits</p>
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Loan Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">&#8377;</span>
              <input
                type="number"
                required
                min="10000"
                value={form.loan_amount}
                onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                placeholder="500000"
                className="w-full pl-8 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Monthly Income */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Monthly Income (&#8377;)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">&#8377;</span>
              <input
                type="number"
                required
                min="5000"
                value={form.monthly_income}
                onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
                placeholder="60000"
                className="w-full pl-8 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* CIBIL Score */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">CIBIL Score</label>
            <input
              type="number"
              required
              min="300"
              max="900"
              value={form.cibil_score}
              onChange={(e) => setForm({ ...form, cibil_score: e.target.value })}
              placeholder="Enter your CIBIL score (300-900)"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.cibil_score && Number(form.cibil_score) >= 750 ? "Excellent" :
               form.cibil_score && Number(form.cibil_score) >= 650 ? "Good" :
               form.cibil_score && Number(form.cibil_score) >= 550 ? "Fair" :
               form.cibil_score ? "Poor" : ""}
            </p>
          </div>

          {/* Purpose & Tenure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Loan Purpose</label>
              <select
                value={form.loan_purpose}
                onChange={(e) => setForm({ ...form, loan_purpose: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                {PURPOSES.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tenure</label>
              <select
                value={form.tenure_months}
                onChange={(e) => setForm({ ...form, tenure_months: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                {TENURES.map((t) => (<option key={t} value={t}>{t} months</option>))}
              </select>
            </div>
          </div>

          {/* Document Upload - 3 separate slots */}
          <div>
            <label className="block text-sm text-gray-300 mb-3">Upload Documents</label>
            <div className="space-y-3">
              {DOC_SLOTS.map((slot) => (
                <div key={slot.key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
                      docFiles[slot.key]
                        ? "border-emerald-600 bg-emerald-900/20"
                        : "border-gray-700 bg-gray-800"
                    }`}>
                      {docFiles[slot.key] ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300">{slot.label}</p>
                        {docFiles[slot.key] && (
                          <p className="text-xs text-gray-500 truncate">{docFiles[slot.key].name}</p>
                        )}
                      </div>
                      <label className="cursor-pointer px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 transition">
                        {docFiles[slot.key] ? "Change" : "Choose"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) setDocFiles((prev) => ({ ...prev, [slot.key]: file }));
                          }}
                        />
                      </label>
                      {docFiles[slot.key] && (
                        <button
                          type="button"
                          onClick={() => setDocFiles((prev) => ({ ...prev, [slot.key]: null }))}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Skip docs checkbox */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDocs}
                onChange={(e) => setSkipDocs(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-400"
              />
              <span className="text-sm text-gray-400">Skip documents (use demo data)</span>
            </label>

            {!allDocsUploaded && !skipDocs && (
              <p className="text-xs text-yellow-500 mt-2">Upload all 3 documents or check "Skip documents" to continue</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-lg font-semibold transition text-lg ${
              canSubmit
                ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-90"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}
