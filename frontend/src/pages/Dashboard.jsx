import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { listApplications } from "../api";

function getScoreColor(score) {
  if (score >= 80) return "bg-emerald-900/50 text-emerald-300";
  if (score >= 70) return "bg-green-900/50 text-green-300";
  if (score >= 60) return "bg-yellow-900/50 text-yellow-300";
  if (score >= 45) return "bg-orange-900/50 text-orange-300";
  return "bg-red-900/50 text-red-300";
}

function getDecisionBadge(decision) {
  switch (decision) {
    case "approved":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "rejected":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "manual_review":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-gray-800 text-gray-300 border-gray-700";
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      const { data, error: err } = await listApplications();
      if (err) setError(err);
      else setApps(data.applications || []);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const sorted = [...apps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const approved = apps.filter((a) => a.decision === "approved").length;
  const rejected = apps.filter((a) => a.decision === "rejected").length;
  const avgScore = apps.length > 0
    ? Math.round(apps.reduce((sum, a) => sum + (a.trust_score || 0), 0) / apps.length)
    : 0;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Lender Dashboard</h1>
        <p className="text-gray-500 mb-8">Monitor all loan applications and decisions in real-time</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Users} label="Total Applications" value={apps.length} color="text-cyan-400" />
          <StatCard icon={CheckCircle2} label="Approved" value={approved} color="text-emerald-400" />
          <StatCard icon={XCircle} label="Rejected" value={rejected} color="text-red-400" />
          <StatCard icon={TrendingUp} label="Avg Trust Score" value={avgScore} color="text-purple-400" />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No applications yet.</p>
            <p className="text-sm mt-1">Run a demo scenario to see data here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Trust Score</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((app) => (
                  <tr
                    key={app.application_id}
                    onClick={() => navigate(`/result/${app.application_id}`)}
                    className="border-t border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-all duration-200"
                  >
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {app.application_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-white">
                      {app.applicant_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(app.trust_score)}`}>
                        {app.trust_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold capitalize ${getDecisionBadge(app.decision)}`}>
                        {app.decision.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(app.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-gray-800/50 bg-gray-900/60 backdrop-blur-sm p-4 hover:border-cyan-500/30 transition-all duration-300" style={{ animation: "fadeInUp 0.5s ease-out" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
