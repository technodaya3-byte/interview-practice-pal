import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, Upload, FileText, Sparkles, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onStart: (config: InterviewConfig) => void;
  loading: boolean;
};

export type InterviewConfig = {
  jobTitle: string;
  jobLevel: string;
  numberOfQuestions: number;
  // When plan-based, these are pre-generated
  preGeneratedQuestions?: { question: string; category: string; difficulty: string; targetSkill?: string; rationale?: string }[];
  planSummary?: string;
  identifiedSkills?: string[];
};

const levels = [
  { value: "junior", label: "Junior / Entry-level" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff / Principal" },
  { value: "manager", label: "Engineering Manager" },
];

const diffBadgeColor: Record<string, string> = {
  easy: "bg-green-500/15 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const RoleSelectionDialog = ({ open, onClose, onStart, loading }: Props) => {
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState("Software Engineer");
  const [jobLevel, setJobLevel] = useState("mid");
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  // Resume / JD tab state
  const [tab, setTab] = useState("manual");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [extractingResume, setExtractingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI plan state
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [plan, setPlan] = useState<{
    planSummary: string;
    identifiedSkills: string[];
    questions: { question: string; category: string; difficulty: string; targetSkill: string; rationale: string }[];
    recommendedDuration: number;
  } | null>(null);

  const handleStart = () => {
    if (plan && tab === "smart") {
      onStart({
        jobTitle,
        jobLevel,
        numberOfQuestions: plan.questions.length,
        preGeneratedQuestions: plan.questions,
        planSummary: plan.planSummary,
        identifiedSkills: plan.identifiedSkills,
      });
    } else {
      onStart({ jobTitle, jobLevel, numberOfQuestions });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept text-based files
    const validTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith(".txt")) {
      toast.error("Please upload a PDF, Word, or text file");
      return;
    }

    setResumeFile(file);
    setExtractingResume(true);

    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setResumeText(text);
      } else {
        // For PDFs/docs, read as text (basic extraction)
        const text = await file.text();
        setResumeText(text.slice(0, 5000));
      }
    } catch {
      toast.error("Failed to read file");
    } finally {
      setExtractingResume(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!resumeText.trim() && !jobDescription.trim()) {
      toast.error("Paste a resume or job description first");
      return;
    }

    setGeneratingPlan(true);
    setPlan(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: {
          resumeText: resumeText.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
          jobTitle: jobTitle.trim(),
          jobLevel,
          numberOfQuestions,
          userId: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPlan(data);
      toast.success(`Interview plan ready — ${data.questions?.length} questions`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const clearPlan = () => {
    setPlan(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center mb-2">
            <Briefcase size={18} className="text-primary" />
          </div>
          <DialogTitle className="text-foreground">Configure Your Interview</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up manually or let AI create a tailored plan from your resume/JD.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); clearPlan(); }} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1 gap-1.5 text-xs">
              <Briefcase size={13} /> Manual
            </TabsTrigger>
            <TabsTrigger value="smart" className="flex-1 gap-1.5 text-xs">
              <Sparkles size={13} /> AI Smart Plan
            </TabsTrigger>
          </TabsList>

          {/* Shared fields */}
          <div className="space-y-3 mt-4">
            <div>
              <label className="label-text mb-1.5 block">Job Title</label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Level</label>
                <Select value={jobLevel} onValueChange={setJobLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Questions</label>
                <Select value={String(numberOfQuestions)} onValueChange={(v) => setNumberOfQuestions(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <TabsContent value="manual" className="mt-4">
            <Button className="w-full" size="lg" onClick={handleStart} disabled={loading || !jobTitle.trim()}>
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Generating Questions…</>
              ) : (
                "Start Interview"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="smart" className="mt-4 space-y-4">
            {/* Resume upload */}
            <div>
              <label className="label-text mb-1.5 block">Resume / CV</label>
              <div className="relative">
                <Textarea
                  placeholder="Paste your resume text here…"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="text-sm min-h-[80px] pr-10"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extractingResume}
                  title="Upload resume file"
                >
                  {extractingResume ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                </Button>
              </div>
              {resumeFile && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <FileText size={12} />
                  {resumeFile.name}
                  <button onClick={() => { setResumeFile(null); setResumeText(""); }} className="ml-1 hover:text-foreground">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Job description */}
            <div>
              <label className="label-text mb-1.5 block">Job Description (optional)</label>
              <Textarea
                placeholder="Paste the job description here…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="text-sm min-h-[80px]"
              />
            </div>

            {/* Generate plan button */}
            {!plan && (
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleGeneratePlan}
                disabled={generatingPlan || (!resumeText.trim() && !jobDescription.trim())}
              >
                {generatingPlan ? (
                  <><Loader2 size={16} className="animate-spin" /> Analyzing & Building Plan…</>
                ) : (
                  <><Sparkles size={16} /> Generate Interview Plan</>
                )}
              </Button>
            )}

            {/* Plan preview */}
            {plan && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="feedback-card p-4 border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={15} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">Interview Plan Ready</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{plan.recommendedDuration} min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.planSummary}</p>

                  {plan.identifiedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {plan.identifiedSkills.slice(0, 8).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {plan.questions.map((q, i) => (
                    <div key={i} className="feedback-card px-3 py-2.5">
                      <p className="text-xs text-foreground leading-relaxed">{q.question}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[9px] capitalize">{q.category}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${diffBadgeColor[q.difficulty] || ""}`}>
                          {q.difficulty}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground ml-auto">{q.targetSkill}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={clearPlan}>
                    Regenerate
                  </Button>
                  <Button size="lg" className="flex-1 gap-2" onClick={handleStart} disabled={loading}>
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Starting…</>
                    ) : (
                      "Start with This Plan"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
