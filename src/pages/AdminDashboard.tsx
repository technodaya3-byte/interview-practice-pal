import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogOut, Users, Briefcase, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

type Profile = { user_id: string; display_name: string | null };

const levelLabels: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
  manager: "Manager",
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      const [sessRes, profRes] = await Promise.all([
        supabase
          .from("interview_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("user_id, display_name"),
      ]);

      setSessions((sessRes.data as unknown as SessionRow[]) || []);

      const map: Record<string, string> = {};
      (profRes.data || []).forEach((p: Profile) => {
        map[p.user_id] = p.display_name || "Unknown";
      });
      setProfiles(map);
      setLoading(false);
    };

    load();
  }, [isAdmin, roleLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSessions = sessions.length;
  const avgScore =
    sessions.filter((s) => s.feedback).length > 0
      ? Math.round(
          sessions
            .filter((s) => s.feedback)
            .reduce((sum, s) => sum + (s.feedback?.overallScore || 0), 0) /
            sessions.filter((s) => s.feedback).length
        )
      : 0;
  const uniqueUsers = new Set(sessions.map((s) => s.user_id)).size;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display text-foreground">Admin Dashboard</h1>
            <p className="text-body text-muted-foreground mt-1">
              All users' interview sessions and performance
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut size={14} /> Sign out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Users, label: "Total Users", value: uniqueUsers },
            { icon: Briefcase, label: "Total Sessions", value: totalSessions },
            { icon: Clock, label: "Avg Score", value: `${avgScore}/100` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="feedback-card p-5 text-center">
              <Icon size={20} className="text-primary mx-auto mb-2" />
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Sessions list */}
        <h2 className="text-sm font-medium text-muted-foreground mb-3">All Sessions</h2>
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="feedback-card py-4 px-5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
                    <Briefcase size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.job_title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profiles[session.user_id] || "Unknown"} · {levelLabels[session.job_level] || session.job_level} · {session.questions.length} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {session.feedback && (
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        {session.feedback.overallScore}/100
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDuration(session.duration_seconds)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {expandedId === session.id ? (
                      <ChevronUp size={14} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === session.id && session.feedback && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {session.feedback.categories.map((cat) => (
                            <div key={cat.name} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{cat.name}</span>
                                <span className="text-foreground font-medium tabular-nums">{cat.score}</span>
                              </div>
                              <Progress value={cat.score} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-medium text-foreground mb-1">Strengths</p>
                            <ul className="text-muted-foreground space-y-0.5">
                              {session.feedback.strengths.map((s, j) => (
                                <li key={j}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-foreground mb-1">Improvements</p>
                            <ul className="text-muted-foreground space-y-0.5">
                              {session.feedback.improvements.map((s, j) => (
                                <li key={j}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {session.feedback.tip && (
                          <p className="text-xs text-muted-foreground italic">💡 {session.feedback.tip}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

          {sessions.length === 0 && (
            <div className="feedback-card text-center py-16">
              <Users size={20} className="text-primary mx-auto mb-3" />
              <p className="text-foreground font-medium">No sessions yet</p>
              <p className="text-sm text-muted-foreground">User sessions will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
