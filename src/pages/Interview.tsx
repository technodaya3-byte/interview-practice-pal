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
import { FeedbackPanel, InterviewFeedback } from "@/components/interview/FeedbackPanel";
import { motion } from "framer-motion";
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
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false);

  const handleStart = useCallback(
    async (cfg: InterviewConfig) => {
      setLoading(true);
      setConfig(cfg);
      try {
        // If pre-generated questions from AI plan, use them directly
        if (cfg.preGeneratedQuestions && cfg.preGeneratedQuestions.length > 0) {
          setQuestions(cfg.preGeneratedQuestions.map((q) => ({ question: q.question, category: q.category })));
          setCurrentIndex(0);
          setPhase("live");
          setIsRecording(true);
          startTimeRef.current = Date.now();
          return;
        }

        const { data, error } = await supabase.functions.invoke(
          "generate-questions",
          {
            body: {
              jobTitle: cfg.jobTitle,
              jobLevel: cfg.jobLevel,
              numberOfQuestions: cfg.numberOfQuestions,
              userId: user?.id,
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

  const endInterview = async () => {
    setIsRecording(false);
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    setPhase("complete");
    setAnalyzingFeedback(true);
    setFeedback(null);

    // Save session
    let sessionId: string | null = null;
    if (user && config) {
      const { data: insertData } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          job_title: config.jobTitle,
          job_level: config.jobLevel,
          questions: questions as any,
          duration_seconds: durationSeconds,
        })
        .select("id")
        .single();
      sessionId = insertData?.id ?? null;
    }

    // Analyze with AI
    try {
      const { data, error } = await supabase.functions.invoke("analyze-interview", {
        body: {
          jobTitle: config?.jobTitle,
          jobLevel: config?.jobLevel,
          questions,
          durationSeconds,
          userId: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setFeedback(data.feedback);

      // Save feedback to session
      if (sessionId && data.feedback) {
        await supabase
          .from("interview_sessions")
          .update({ feedback: data.feedback as any })
          .eq("id", sessionId);
      }
    } catch (e: any) {
      toast({
        title: "Feedback analysis failed",
        description: e.message || "Could not generate feedback.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingFeedback(false);
    }
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
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <div className="text-sm text-muted-foreground">
            {config?.jobTitle} — {config?.jobLevel}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPhase("setup");
              setQuestions([]);
              setCurrentIndex(0);
              setFeedback(null);
            }}
          >
            New Session
          </Button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-display text-foreground mb-1">Session Complete</h1>
            <p className="text-body text-muted-foreground mb-8">
              {questions.length} questions answered
            </p>
          </motion.div>

          <div className="feedback-card p-6 lg:p-8">
            <FeedbackPanel feedback={feedback} loading={analyzingFeedback} />
          </div>
        </div>
      </div>
    );
  }

  // Live interview phase
  return (
    <div className="min-h-screen bg-foreground/[0.03] flex flex-col">
      <div className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8">
        <button
          onClick={() => {
            if (window.confirm("End this interview session? Progress will be lost.")) {
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

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="lg:w-[60%] flex flex-col gap-4">
          <WebcamView isRecording={isRecording} />
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
