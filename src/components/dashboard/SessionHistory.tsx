import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Briefcase, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Feedback = {
  overallScore: number;
  categories: { name: string; score: number }[];
  strengths: string[];
  improvements: string[];
  tip: string;
};

type Session = {
  id: string;
  job_title: string;
  job_level: string;
  questions: { question: string; category: string }[];
  duration_seconds: number;
  feedback: Feedback | null;
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

export const SessionHistory = ({
  sessions,
  loading,
  onDelete,
}: {
  sessions: Session[];
  loading: boolean;
  onDelete: (id: string) => void;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        >
          <div
            className="feedback-card py-4 px-5 group cursor-pointer hover:bg-muted/30 transition-colors"
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
                  {levelLabels[session.job_level] || session.job_level} · {session.questions.length} questions
                </p>
              </div>

              {session.feedback && (
                <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
                  {session.feedback.overallScore}/100
                </span>
              )}

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

              <div className="flex items-center gap-1 shrink-0">
                {expandedId === session.id ? (
                  <ChevronUp size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
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
    </div>
  );
};
