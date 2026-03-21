import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

type Feedback = {
  overallScore: number;
  categories: { name: string; score: number }[];
};

type Session = {
  id: string;
  job_title: string;
  feedback: Feedback | null;
  created_at: string;
};

const ease = [0.16, 1, 0.3, 1] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium text-foreground">
          {p.name}: <span className="tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export const PerformanceTrends = ({ sessions }: { sessions: Session[] }) => {
  const scoredSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.feedback?.overallScore != null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [sessions]
  );

  const trendData = useMemo(
    () =>
      scoredSessions.map((s) => ({
        date: new Date(s.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: s.feedback!.overallScore,
        role: s.job_title,
      })),
    [scoredSessions]
  );

  const radarData = useMemo(() => {
    if (scoredSessions.length === 0) return [];
    const last = scoredSessions[scoredSessions.length - 1];
    return (
      last.feedback?.categories?.map((cat) => ({
        subject: cat.name,
        score: cat.score,
        fullMark: 100,
      })) ?? []
    );
  }, [scoredSessions]);

  const stats = useMemo(() => {
    if (scoredSessions.length === 0) return null;
    const scores = scoredSessions.map((s) => s.feedback!.overallScore);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);
    const latest = scores[scores.length - 1];
    const previous = scores.length > 1 ? scores[scores.length - 2] : null;
    const trend = previous != null ? latest - previous : 0;
    return { avg, best, latest, trend, total: scores.length };
  }, [scoredSessions]);

  if (scoredSessions.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="space-y-6 mb-8"
    >
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Latest Score",
              value: stats.latest,
              icon: stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus,
              accent:
                stats.trend > 0
                  ? "text-emerald-600"
                  : stats.trend < 0
                  ? "text-red-500"
                  : "text-muted-foreground",
              sub: stats.trend !== 0 ? `${stats.trend > 0 ? "+" : ""}${stats.trend} pts` : "No change",
            },
            {
              label: "Average",
              value: stats.avg,
              icon: Target,
              accent: "text-primary",
              sub: `${stats.total} sessions`,
            },
            {
              label: "Best Score",
              value: stats.best,
              icon: TrendingUp,
              accent: "text-emerald-600",
              sub: "Personal best",
            },
            {
              label: "Sessions",
              value: stats.total,
              icon: Target,
              accent: "text-primary",
              sub: "Completed",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease }}
              className="feedback-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon size={14} className={stat.accent} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
              <p className={`text-xs mt-0.5 ${stat.accent}`}>{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Score Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="feedback-card p-5"
        >
          <h3 className="text-sm font-medium text-foreground mb-4">Score Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                name="Score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar — latest session breakdown */}
        {radarData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="feedback-card p-5"
          >
            <h3 className="text-sm font-medium text-foreground mb-4">
              Latest Skill Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
