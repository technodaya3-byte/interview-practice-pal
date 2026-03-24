import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

type SessionRow = {
  id: string;
  user_id: string;
  job_title: string;
  job_level: string;
  questions: { question: string; category: string }[];
  duration_seconds: number;
  feedback: {
    overallScore: number;
    categories: { name: string; score: number }[];
    strengths: string[];
    improvements: string[];
    tip: string;
  } | null;
  created_at: string;
};

const LEVEL_COLORS: Record<string, string> = {
  junior: "hsl(199, 89%, 48%)",
  mid: "hsl(221, 83%, 53%)",
  senior: "hsl(262, 83%, 58%)",
  staff: "hsl(330, 80%, 55%)",
  manager: "hsl(25, 95%, 53%)",
};

const CATEGORY_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(25, 95%, 53%)",
];

type Props = {
  sessions: SessionRow[];
  profiles: Record<string, string>;
};

export const AdminAnalyticsPanel = ({ sessions, profiles }: Props) => {
  const withFeedback = sessions.filter((s) => s.feedback).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // 1. Score trends per user
  const userTrendData = useMemo(() => {
    const byUser: Record<string, SessionRow[]> = {};
    withFeedback.forEach((s) => {
      (byUser[s.user_id] ||= []).push(s);
    });
    const userIds = Object.keys(byUser).slice(0, 6); // top 6 users
    const allDates = [...new Set(withFeedback.map((s) => format(new Date(s.created_at), "MMM d")))];
    return allDates.map((date) => {
      const point: Record<string, string | number> = { date };
      userIds.forEach((uid) => {
        const session = byUser[uid]?.find((s) => format(new Date(s.created_at), "MMM d") === date);
        if (session?.feedback) point[profiles[uid] || uid.slice(0, 6)] = session.feedback.overallScore;
      });
      return point;
    });
  }, [withFeedback, profiles]);

  const userNames = useMemo(() => {
    const names = new Set<string>();
    userTrendData.forEach((d) => Object.keys(d).filter((k) => k !== "date").forEach((k) => names.add(k)));
    return [...names].slice(0, 6);
  }, [userTrendData]);

  // 2. Average scores by role level
  const levelTrendData = useMemo(() => {
    const byDate: Record<string, Record<string, { sum: number; count: number }>> = {};
    withFeedback.forEach((s) => {
      const date = format(new Date(s.created_at), "MMM d");
      if (!byDate[date]) byDate[date] = {};
      if (!byDate[date][s.job_level]) byDate[date][s.job_level] = { sum: 0, count: 0 };
      byDate[date][s.job_level].sum += s.feedback!.overallScore;
      byDate[date][s.job_level].count += 1;
    });
    return Object.entries(byDate).map(([date, levels]) => {
      const point: Record<string, string | number> = { date };
      Object.entries(levels).forEach(([level, { sum, count }]) => {
        point[level] = Math.round(sum / count);
      });
      return point;
    });
  }, [withFeedback]);

  const levelKeys = useMemo(() => {
    const keys = new Set<string>();
    levelTrendData.forEach((d) => Object.keys(d).filter((k) => k !== "date").forEach((k) => keys.add(k)));
    return [...keys];
  }, [levelTrendData]);

  // 3. Category breakdown trends (avg per date)
  const categoryTrendData = useMemo(() => {
    const byDate: Record<string, Record<string, { sum: number; count: number }>> = {};
    withFeedback.forEach((s) => {
      const date = format(new Date(s.created_at), "MMM d");
      if (!byDate[date]) byDate[date] = {};
      s.feedback!.categories.forEach((cat) => {
        if (!byDate[date][cat.name]) byDate[date][cat.name] = { sum: 0, count: 0 };
        byDate[date][cat.name].sum += cat.score;
        byDate[date][cat.name].count += 1;
      });
    });
    return Object.entries(byDate).map(([date, cats]) => {
      const point: Record<string, string | number> = { date };
      Object.entries(cats).forEach(([name, { sum, count }]) => {
        point[name] = Math.round(sum / count);
      });
      return point;
    });
  }, [withFeedback]);

  const categoryKeys = useMemo(() => {
    const keys = new Set<string>();
    categoryTrendData.forEach((d) => Object.keys(d).filter((k) => k !== "date").forEach((k) => keys.add(k)));
    return [...keys];
  }, [categoryTrendData]);

  if (withFeedback.length < 2) {
    return (
      <div className="feedback-card text-center py-10">
        <p className="text-sm text-muted-foreground">Need at least 2 sessions with feedback to show analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score trends per user */}
      <div className="feedback-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Score Trends per User</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={userTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {userNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Avg scores by role level */}
      <div className="feedback-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Average Scores by Role Level</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={levelTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {levelKeys.map((level) => (
              <Line
                key={level}
                type="monotone"
                dataKey={level}
                name={level.charAt(0).toUpperCase() + level.slice(1)}
                stroke={LEVEL_COLORS[level] || "hsl(215, 16%, 47%)"}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown trends */}
      <div className="feedback-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Category Breakdown Trends</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={categoryTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {categoryKeys.map((cat, i) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
