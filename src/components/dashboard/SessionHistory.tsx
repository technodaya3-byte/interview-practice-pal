import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, Briefcase, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

type Session = {
  id: string;
  job_title: string;
  job_level: string;
  questions: { question: string; category: string }[];
  duration_seconds: number;
  created_at: string;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const levelLabels: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
  manager: "Manager",
};

export const SessionHistory = ({ onHasData }: { onHasData: (has: boolean) => void }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      const result = (data as unknown as Session[]) || [];
      setSessions(result);
      onHasData(result.length > 0);
      setLoading(false);
    };
    fetchSessions();
  }, [user, onHasData]);

  const deleteSession = async (id: string) => {
    await supabase.from("interview_sessions").delete().eq("id", id);
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    onHasData(updated.length > 0);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      {sessions.map((session, i) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="feedback-card flex items-center gap-4 py-4 px-5 group"
        >
          <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
            <Briefcase size={16} className="text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {session.job_title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {levelLabels[session.job_level] || session.job_level} · {session.questions.length} questions
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums shrink-0">
            <Clock size={12} />
            {formatDuration(session.duration_seconds)}
          </div>

          <div className="text-xs text-muted-foreground shrink-0">
            {new Date(session.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => deleteSession(session.id)}
          >
            <Trash2 size={14} />
          </Button>
        </motion.div>
      ))}
    </div>
  );
};
