import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, BookOpen, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

type Question = {
  id: string;
  question: string;
  category: string;
  job_title: string;
  job_level: string;
  created_at: string;
};

type GeneratedQuestion = {
  question: string;
  category: string;
  difficulty: string;
};

const categories = ["behavioral", "technical", "situational", "problem-solving"];
const levels = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];
const difficulties = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];
const domains = [
  "Frontend", "Backend", "Full Stack", "Data Science", "Machine Learning",
  "DevOps", "Mobile", "Cloud", "Cybersecurity", "Product Management",
  "UI/UX Design", "QA/Testing",
];

const diffBadgeColor: Record<string, string> = {
  easy: "bg-green-500/15 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const QuestionBankPanel = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Manual add form
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("behavioral");
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState("mid");
  const [filterLevel, setFilterLevel] = useState("all");

  // AI generation state
  const [aiJobTitle, setAiJobTitle] = useState("");
  const [aiLevel, setAiLevel] = useState("mid");
  const [aiDifficulty, setAiDifficulty] = useState("mixed");
  const [aiDomain, setAiDomain] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiCategory, setAiCategory] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [adaptiveNote, setAdaptiveNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("question_bank")
      .select("*")
      .order("created_at", { ascending: false });
    setQuestions((data as unknown as Question[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newTitle.trim()) {
      toast.error("Question and job title are required");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("question_bank").insert({
      question: newQuestion.trim(),
      category: newCategory,
      job_title: newTitle.trim(),
      job_level: newLevel,
      created_by: user?.id,
    });
    if (error) toast.error("Failed to add question");
    else {
      toast.success("Question added");
      setNewQuestion("");
      setNewTitle("");
      await fetchQuestions();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("question_bank").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Question removed");
      setQuestions((q) => q.filter((x) => x.id !== id));
    }
  };

  const handleGenerate = async () => {
    if (!aiJobTitle.trim()) {
      toast.error("Enter a job title for AI generation");
      return;
    }
    setGenerating(true);
    setGeneratedQuestions([]);
    setAdaptiveNote("");

    try {
      const payload: any = {
        jobTitle: aiJobTitle.trim(),
        jobLevel: aiLevel,
        numberOfQuestions: parseInt(aiCount) || 5,
        difficulty: aiDifficulty,
      };
      if (aiDomain) payload.domain = aiDomain;
      if (aiCategory !== "all") payload.categories = [aiCategory];

      const { data, error } = await supabase.functions.invoke("generate-questions", { body: payload });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedQuestions(data.questions || []);
      setAdaptiveNote(data.adaptiveNote || "");
      toast.success(`Generated ${data.questions?.length || 0} questions`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAllGenerated = async () => {
    if (generatedQuestions.length === 0) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          jobTitle: aiJobTitle.trim(),
          jobLevel: aiLevel,
          numberOfQuestions: 0,
          difficulty: aiDifficulty,
          domain: aiDomain || undefined,
          saveToBank: true,
          userId: user?.id,
        },
      });

      // Insert directly since we already have the questions
      const rows = generatedQuestions.map((q) => ({
        question: q.question,
        category: q.category,
        job_title: aiJobTitle.trim(),
        job_level: aiLevel,
        created_by: user?.id,
      }));

      const { error: insertError } = await supabase.from("question_bank").insert(rows);
      if (insertError) throw insertError;

      toast.success(`Saved ${generatedQuestions.length} questions to bank`);
      setGeneratedQuestions([]);
      await fetchQuestions();
    } catch (e: any) {
      toast.error(e.message || "Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingle = async (q: GeneratedQuestion) => {
    const { error } = await supabase.from("question_bank").insert({
      question: q.question,
      category: q.category,
      job_title: aiJobTitle.trim(),
      job_level: aiLevel,
      created_by: user?.id,
    });
    if (error) toast.error("Failed to save");
    else {
      toast.success("Question saved to bank");
      setGeneratedQuestions((prev) => prev.filter((x) => x.question !== q.question));
      await fetchQuestions();
    }
  };

  const filtered = filterLevel === "all" ? questions : questions.filter((q) => q.job_level === filterLevel);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={18} className="text-primary" />
        <h2 className="text-sm font-medium text-foreground">Question Bank</h2>
      </div>

      {/* AI Generation Section */}
      <div className="feedback-card p-5 space-y-4 border-primary/20">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Question Generator</h3>
          <Badge variant="outline" className="text-[10px] ml-1">Powered by AI</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input
            placeholder="Job title (e.g. Frontend Engineer)"
            value={aiJobTitle}
            onChange={(e) => setAiJobTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <Select value={aiDomain} onValueChange={setAiDomain}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Domain (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any domain</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={aiLevel} onValueChange={setAiLevel}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={aiCategory} onValueChange={setAiCategory}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={aiCount} onValueChange={setAiCount}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["3", "5", "8", "10"].map((n) => (
                <SelectItem key={n} value={n}>{n} questions</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating || !aiJobTitle.trim()}
          className="gap-2"
          size="sm"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? "Generating…" : "Generate Questions"}
        </Button>

        {/* Generated Results */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {generatedQuestions.length} questions generated
                {adaptiveNote && <span className="ml-2 italic">— {adaptiveNote}</span>}
              </p>
              <Button size="sm" variant="default" className="gap-1 h-8" onClick={handleSaveAllGenerated} disabled={saving}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save All to Bank
              </Button>
            </div>
            <AnimatePresence>
              {generatedQuestions.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="feedback-card px-4 py-3 flex gap-3 items-start border-dashed"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{q.category}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${diffBadgeColor[q.difficulty] || ""}`}>
                        {q.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-primary hover:text-primary"
                    onClick={() => handleSaveSingle(q)}
                    title="Save to bank"
                  >
                    <Plus size={14} />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Manual Add form */}
      <div className="feedback-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Add Manually</p>
        <Textarea
          placeholder="Enter interview question…"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="text-sm min-h-[60px]"
        />
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Job title (e.g. Frontend Engineer)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[160px] h-9 text-sm"
          />
          <Select value={newLevel} onValueChange={setNewLevel}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9 gap-1" onClick={handleAdd} disabled={adding}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>

      {/* Filter + list */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} question{filtered.length !== 1 ? "s" : ""}</p>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {levels.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="feedback-card text-center py-10">
          <BookOpen size={20} className="text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No questions yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((q) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="feedback-card px-4 py-3 flex gap-3 items-start group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {q.job_title} · <span className="capitalize">{q.job_level}</span> · <span className="capitalize">{q.category}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(q.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
