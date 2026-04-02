import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";

type LeaderboardEntry = {
  rank: number;
  anonymizedName: string;
  avgScore: number;
  sessionsCount: number;
  topCategory: string;
  isCurrentUser: boolean;
};

const ANIMAL_NAMES = [
  "Phoenix", "Falcon", "Panther", "Wolf", "Eagle", "Hawk", "Tiger", "Lion",
  "Dragon", "Viper", "Cobra", "Raven", "Bear", "Shark", "Lynx", "Fox",
  "Orca", "Stallion", "Condor", "Jaguar", "Mantis", "Hornet", "Puma", "Raptor",
];

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-mono text-muted-foreground w-5 text-center">{rank}</span>;
};

const getRankBg = (rank: number, isCurrentUser: boolean) => {
  if (isCurrentUser) return "ring-2 ring-primary bg-primary/5";
  if (rank === 1) return "bg-yellow-500/5 border-yellow-500/20";
  if (rank === 2) return "bg-gray-400/5 border-gray-400/20";
  if (rank === 3) return "bg-amber-600/5 border-amber-600/20";
  return "";
};

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [roles, setRoles] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase.from("interview_sessions").select("user_id, job_title, job_level, feedback");
      if (roleFilter !== "all") query = query.eq("job_title", roleFilter);
      if (levelFilter !== "all") query = query.eq("job_level", levelFilter);

      const { data: sessions } = await query;
      if (!sessions) { setLoading(false); return; }

      // Extract unique roles/levels for filters
      const allRoles = [...new Set(sessions.map(s => s.job_title))].sort();
      const allLevels = [...new Set(sessions.map(s => s.job_level))].sort();
      setRoles(allRoles);
      setLevels(allLevels);

      // Group by user
      const userMap = new Map<string, { scores: number[]; categories: Record<string, number[]> }>();
      for (const s of sessions) {
        const fb = s.feedback as any;
        if (!fb?.overallScore) continue;
        if (!userMap.has(s.user_id)) userMap.set(s.user_id, { scores: [], categories: {} });
        const entry = userMap.get(s.user_id)!;
        entry.scores.push(fb.overallScore);
        if (fb.categoryScores) {
          for (const cat of fb.categoryScores) {
            if (!entry.categories[cat.category]) entry.categories[cat.category] = [];
            entry.categories[cat.category].push(cat.score);
          }
        }
      }

      // Build leaderboard
      const board: LeaderboardEntry[] = [];
      let nameIdx = 0;
      const sortedUsers = [...userMap.entries()]
        .map(([uid, data]) => ({
          uid,
          avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
          sessionsCount: data.scores.length,
          topCategory: Object.entries(data.categories)
            .map(([cat, scores]) => ({ cat, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
            .sort((a, b) => b.avg - a.avg)[0]?.cat || "N/A",
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

      for (const u of sortedUsers) {
        nameIdx++;
        board.push({
          rank: nameIdx,
          anonymizedName: `${ANIMAL_NAMES[(nameIdx - 1) % ANIMAL_NAMES.length]} #${nameIdx}`,
          avgScore: u.avgScore,
          sessionsCount: u.sessionsCount,
          topCategory: u.topCategory,
          isCurrentUser: u.uid === user?.id,
        });
      }

      setEntries(board);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [roleFilter, levelFilter]);

  const currentUserEntry = entries.find(e => e.isCurrentUser);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-20 pb-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Leaderboard</h1>
            <p className="text-muted-foreground mt-1">Anonymized rankings — see how you stack up</p>
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current user highlight */}
        {currentUserEntry && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                {getRankIcon(currentUserEntry.rank)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your Ranking</p>
                <p className="text-lg font-semibold text-foreground">
                  #{currentUserEntry.rank} of {entries.length} — Avg Score: {currentUserEntry.avgScore}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" /> {currentUserEntry.topCategory}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Participants", value: entries.length, icon: Users },
            { label: "Top Score", value: entries[0]?.avgScore ?? "—", icon: Trophy },
            { label: "Median", value: entries.length ? entries[Math.floor(entries.length / 2)]?.avgScore : "—", icon: TrendingUp },
            { label: "Sessions Tracked", value: entries.reduce((s, e) => s + e.sessionsCount, 0), icon: Award },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 py-4">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leaderboard list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sessions found for the selected filters.</p>
            ) : (
              entries.map((entry, i) => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${getRankBg(entry.rank, entry.isCurrentUser)}`}
                >
                  <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {entry.anonymizedName}
                      {entry.isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.sessionsCount} session{entry.sessionsCount !== 1 ? "s" : ""} · Best: {entry.topCategory}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{entry.avgScore}</p>
                    <p className="text-xs text-muted-foreground">avg score</p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${entry.avgScore}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;
