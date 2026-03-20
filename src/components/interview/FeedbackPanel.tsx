import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, MessageSquare, Loader2 } from "lucide-react";

type FeedbackCategory = {
  name: string;
  score: number;
  feedback: string;
};

export type InterviewFeedback = {
  overallScore: number;
  summary: string;
  categories: FeedbackCategory[];
  strengths: string[];
  improvements: string[];
  fillerWordTip: string;
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
};

const progressColor = (score: number) => {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
};

export const FeedbackPanel = ({
  feedback,
  loading,
}: {
  feedback: InterviewFeedback | null;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-body text-muted-foreground">Analyzing your performance…</p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="text-center py-12 text-muted-foreground text-body">
        Feedback unavailable. Try again later.
      </div>
    );
  }

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="space-y-8">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="text-center"
      >
        <div className={`text-5xl font-bold tabular-nums ${scoreColor(feedback.overallScore)}`}>
          {feedback.overallScore}
        </div>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Overall Score</p>
        <p className="text-body text-muted-foreground mt-3 max-w-md mx-auto">
          {feedback.summary}
        </p>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease }}
        className="space-y-4"
      >
        <h3 className="text-sm font-medium text-foreground">Category Breakdown</h3>
        {feedback.categories.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{cat.name}</span>
              <span className={`text-sm font-medium tabular-nums ${scoreColor(cat.score)}`}>
                {cat.score}
              </span>
            </div>
            <Progress value={cat.score} className={`h-2 ${progressColor(cat.score)}`} />
            <p className="text-xs text-muted-foreground">{cat.feedback}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Strengths */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease }}
      >
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500" />
          Strengths
        </h3>
        <ul className="space-y-2">
          {feedback.strengths.map((s, i) => (
            <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-emerald-200">
              {s}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Improvements */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease }}
      >
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          Areas for Improvement
        </h3>
        <ul className="space-y-2">
          {feedback.improvements.map((s, i) => (
            <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-amber-200">
              {s}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Filler Word Tip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease }}
        className="rounded-lg bg-primary/5 p-4 flex gap-3"
      >
        <MessageSquare size={16} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Communication Tip</p>
          <p className="text-sm text-muted-foreground">{feedback.fillerWordTip}</p>
        </div>
      </motion.div>
    </div>
  );
};
