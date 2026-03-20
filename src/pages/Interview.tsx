import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { RoleSelectionDialog, InterviewConfig } from "@/components/interview/RoleSelectionDialog";
import { WebcamView } from "@/components/interview/WebcamView";
import { InterviewTimer } from "@/components/interview/InterviewTimer";
import { QuestionPanel } from "@/components/interview/QuestionPanel";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Square,
  Mic,
  MicOff,
} from "lucide-react";

type Question = { question: string; category: string };

type Phase = "setup" | "live" | "complete";

const Interview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = useCallback(
    async (cfg: InterviewConfig) => {
      setLoading(true);
      setConfig(cfg);
      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-questions",
          {
            body: {
              jobTitle: cfg.jobTitle,
              jobLevel: cfg.jobLevel,
              numberOfQuestions: cfg.numberOfQuestions,
            },
          }
        );

        if (error) throw error;

        if (data?.error) {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setQuestions(data.questions || []);
        setCurrentIndex(0);
        setPhase("live");
        setIsRecording(true);
        startTimeRef.current = Date.now();
      } catch (e: any) {
        toast({
          title: "Failed to generate questions",
          description: e.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const endInterview = () => {
    setIsRecording(false);
    setPhase("complete");
  };

  // Setup phase
  if (phase === "setup") {
    return (
      <RoleSelectionDialog
        open={true}
        onClose={() => navigate("/dashboard")}
        onStart={handleStart}
        loading={loading}
      />
    );
  }

  // Complete phase
  if (phase === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="feedback-card max-w-md text-center py-12 px-8"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-display text-foreground mb-3">Session Complete</h2>
          <p className="text-body text-muted-foreground mb-2">
            {config?.jobTitle} — {config?.jobLevel} level
          </p>
          <p className="text-body text-muted-foreground mb-8">
            You answered {questions.length} questions. Performance analysis coming soon.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button
              onClick={() => {
                setPhase("setup");
                setQuestions([]);
                setCurrentIndex(0);
              }}
            >
              New Session
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Live interview phase — the "Stage"
  return (
    <div className="min-h-screen bg-foreground/[0.03] flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8">
        <button
          onClick={() => {
            if (
              window.confirm(
                "End this interview session? Progress will be lost."
              )
            ) {
              setIsRecording(false);
              navigate("/dashboard");
            }
          }}
          className="flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Exit
        </button>

        <div className="flex items-center gap-4">
          <InterviewTimer isRunning={isRecording} />
        </div>

        <Button variant="destructive" size="sm" onClick={endInterview} className="gap-2">
          <Square size={12} /> End Session
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Video area — 60% */}
        <div className="lg:w-[60%] flex flex-col gap-4">
          <WebcamView isRecording={isRecording} />

          {/* Floating controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>
          </div>
        </div>

        {/* Question panel — 40% */}
        <div className="lg:w-[40%] flex flex-col">
          <div className="feedback-card flex-1 flex flex-col">
            <div className="flex-1">
              <QuestionPanel questions={questions} currentIndex={currentIndex} />
            </div>

            <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevQuestion}
                disabled={currentIndex === 0}
                className="gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button size="sm" onClick={nextQuestion} className="gap-1">
                  Next <ChevronRight size={14} />
                </Button>
              ) : (
                <Button size="sm" onClick={endInterview} className="gap-1">
                  Finish <ChevronRight size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
