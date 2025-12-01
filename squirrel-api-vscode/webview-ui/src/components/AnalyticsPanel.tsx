import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { HistoryAnalyticsSnapshot, HistoryEntry } from "./types";

interface AnalyticsPanelProps {
  analytics?: HistoryAnalyticsSnapshot;
  history: HistoryEntry[];
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";
const COLORS = ["#34d399", "#f87171"];

export function AnalyticsPanel({ analytics, history }: AnalyticsPanelProps) {
  const successRate = analytics && analytics.total ? Math.round((analytics.successes / analytics.total) * 100) : 0;
  const latencySeries = history.slice(0, 10).map((entry) => ({
    name: new Date(entry.timestamp).toLocaleTimeString(),
    latency: entry.response?.duration ?? 0,
  }));
  const statusSeries = [
    { name: "Success", value: analytics?.successes ?? 0 },
    { name: "Failure", value: analytics?.failures ?? 0 },
  ];

  return (
    <section className={`p-4 rounded-3xl space-y-4 ${glass}`}>
      <header className="uppercase text-xs tracking-[0.2em] text-slate-200">Analytics</header>
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Requests" value={analytics?.total ?? history.length} />
        <Metric label="Success Rate" value={`${successRate}%`} />
        <Metric label="Favorites" value={analytics?.favorites ?? 0} />
        <Metric label="Avg Latency" value={`${analytics?.averageLatency ?? 0} ms`} />
      </div>
      <div className="grid grid-cols-2 gap-4 h-40">
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencySeries}>
              <XAxis dataKey="name" hide />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.8)", borderRadius: 12, border: "none" }} />
              <Bar dataKey="latency" fill="#38bdf8" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusSeries} dataKey="value" innerRadius={30} outerRadius={60} paddingAngle={4}>
                {statusSeries.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.8)", borderRadius: 12, border: "none" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-300">
      <div className="uppercase text-[10px] tracking-[0.2em] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
