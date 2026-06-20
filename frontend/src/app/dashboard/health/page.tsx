"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { HeartPulse, Activity, Flame, Moon, Pill, Plus, TrendingUp, CalendarCheck } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { HealthMetricService, HealthMetric, Adherence } from "@/lib/healthMetricService";
import toast, { Toaster } from "react-hot-toast";

const NUMERIC_TYPES = [
  { type: "HEART_RATE", label: "Heart Rate", unit: "bpm", color: "#F4708A" },
  { type: "CALORIES", label: "Calories", unit: "kcal", color: "#E0A22E" },
  { type: "SLEEP_HOURS", label: "Sleep", unit: "hrs", color: "#6D5AE6" },
];

const VITALS = [
  { type: "HEART_RATE", label: "Heart Rate", unit: "bpm", icon: <HeartPulse className="w-5 h-5" />, chip: "bg-pastel-rose text-pastel-roseInk" },
  { type: "BLOOD_PRESSURE", label: "Blood Pressure", unit: "", icon: <Activity className="w-5 h-5" />, chip: "bg-pastel-sky text-pastel-skyInk" },
  { type: "CALORIES", label: "Calories", unit: "kcal", icon: <Flame className="w-5 h-5" />, chip: "bg-pastel-sun text-pastel-sunInk" },
  { type: "SLEEP_HOURS", label: "Sleep", unit: "hrs", icon: <Moon className="w-5 h-5" />, chip: "bg-primary-soft text-primary" },
];

const PLACEHOLDERS: Record<string, string> = {
  HEART_RATE: "e.g. 72",
  BLOOD_PRESSURE: "e.g. 120/80",
  CALORIES: "e.g. 1840",
  SLEEP_HOURS: "e.g. 7.5",
};

export default function HealthPage() {
  const [history, setHistory] = useState<HealthMetric[]>([]);
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [loading, setLoading] = useState(true);

  const [formType, setFormType] = useState("HEART_RATE");
  const [formValue, setFormValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([
        HealthMetricService.getHistory(),
        HealthMetricService.getAdherence(),
      ]);
      setHistory(h);
      setAdherence(a);
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = (type: string) => history.find((m) => m.type === type)?.value;

  const seriesFor = (type: string) =>
    history
      .filter((m) => m.type === type)
      .slice()
      .reverse()
      .map((m) => ({
        date: new Date(m.recordedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
        value: parseFloat(m.value),
      }))
      .filter((d) => !isNaN(d.value));

  const bpSeries = () =>
    history
      .filter((m) => m.type === "BLOOD_PRESSURE")
      .slice()
      .reverse()
      .map((m) => {
        const parts = m.value.split("/").map((x) => parseInt(x.trim(), 10));
        return {
          date: new Date(m.recordedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
          systolic: parts[0],
          diastolic: parts[1],
        };
      })
      .filter((d) => !isNaN(d.systolic));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValue.trim() || saving) return;
    setSaving(true);
    try {
      await HealthMetricService.add(formType, formValue);
      setFormValue("");
      toast.success("Reading logged");
      await load();
    } catch {
      toast.error("Failed to log reading");
    } finally {
      setSaving(false);
    }
  };

  const bp = bpSeries();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" />

      <header>
        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Health Metrics</h1>
        <p className="text-muted mt-2 font-medium">Track your vitals, trends, and medication adherence.</p>
      </header>

      {/* Vital cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {VITALS.map((v) => (
          <div key={v.type} className="card-soft p-5 card-hover">
            <div className={`chip ${v.chip} mb-3`}>{v.icon}</div>
            <p className="text-sm text-muted font-semibold">{v.label}</p>
            <h3 className="text-2xl font-extrabold text-secondary mt-1">
              {latest(v.type) ?? "—"}
              {latest(v.type) && v.unit ? <span className="text-sm font-semibold text-muted ml-1">{v.unit}</span> : null}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log a reading */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-line">
          <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Log a reading
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Metric</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full p-3 bg-surface border border-line rounded-xl outline-none focus:border-primary text-secondary font-medium"
              >
                {VITALS.map((v) => (
                  <option key={v.type} value={v.type}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Value</label>
              <input
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder={PLACEHOLDERS[formType]}
                className="w-full p-3 bg-surface border border-line rounded-xl outline-none focus:border-primary text-secondary font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !formValue.trim()}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-[#5d4bd6] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Log reading"}
            </button>
          </form>
        </div>

        {/* Medication adherence */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-line lg:col-span-2">
          <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-pastel-mintInk" /> Medication Adherence
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-pastel-mint rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-pastel-mintInk">{adherence?.streakDays ?? 0}</p>
              <p className="text-xs font-semibold text-muted mt-1">Day streak</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-secondary">{adherence?.takenToday ?? 0}</p>
              <p className="text-xs font-semibold text-muted mt-1">Taken today</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-secondary">{adherence?.takenLast7Days ?? 0}</p>
              <p className="text-xs font-semibold text-muted mt-1">Last 7 days</p>
            </div>
          </div>
          {adherence?.recent && adherence.recent.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {adherence.recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <CalendarCheck className="w-4 h-4 text-pastel-mintInk flex-shrink-0" />
                  <span className="text-secondary font-medium flex-1 truncate">{r.value}</span>
                  <span className="text-muted text-xs">
                    {new Date(r.recordedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No doses logged yet — tap "Taken" on a medication reminder to track adherence.</p>
          )}
        </div>
      </div>

      {/* Trend charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood pressure dual-line */}
          {bp.length > 0 && (
            <div className="bg-white p-6 rounded-3xl shadow-soft border border-line">
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Blood Pressure
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bp}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEBF8" />
                    <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
                    <YAxis fontSize={12} stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={false} name="Systolic" />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={false} name="Diastolic" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Numeric metrics */}
          {NUMERIC_TYPES.map((nt) => {
            const data = seriesFor(nt.type);
            if (data.length === 0) return null;
            return (
              <div key={nt.type} className="bg-white p-6 rounded-3xl shadow-soft border border-line">
                <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> {nt.label}
                  <span className="text-xs font-medium text-muted">({nt.unit})</span>
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFEBF8" />
                      <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
                      <YAxis fontSize={12} stroke="#94a3b8" domain={["auto", "auto"]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke={nt.color} strokeWidth={2} dot={{ r: 3 }} name={nt.label} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
