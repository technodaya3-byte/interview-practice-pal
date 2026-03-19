import { motion } from "framer-motion";

type Question = {
  question: string;
  category: string;
};

type Props = {
  questions: Question[];
  currentIndex: number;
};

const categoryColors: Record<string, string> = {
  behavioral: "bg-accent/10 text-accent",
  technical: "bg-primary/10 text-primary",
  situational: "bg-orange-100 text-orange-700",
  "problem-solving": "bg-emerald-100 text-emerald-700",
};

export const QuestionPanel = ({ questions, currentIndex }: Props) => {
  const current = questions[currentIndex];
  if (!current) return null;

  const colorClass = categoryColors[current.category] || "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="label-text">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className={`text-xs font-medium px-2 py-1 rounded-md ${colorClass}`}>
          {current.category}
        </span>
      </div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      >
        <p className="text-foreground text-lg font-medium leading-relaxed">
          {current.question}
        </p>
      </motion.div>

      {/* Progress dots */}
      <div className="flex gap-1.5 pt-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-6 bg-primary"
                : i < currentIndex
                ? "w-1.5 bg-primary/40"
                : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
