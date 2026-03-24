import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Question = {
  id: string;
  question: string;
  category: string;
  job_title: string;
  job_level: string;
  created_at: string;
};

const categories = ["behavioral", "technical", "situational", "problem-solving"];
const levels = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];

export const QuestionBankPanel = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("behavioral");
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState("mid");
  const [filterLevel, setFilterLevel] = useState("all");

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
    if (error) {
      toast.error("Failed to add question");
    } else {
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

  const filtered = filterLevel === "all" ? questions : questions.filter((q) => q.job_level === filterLevel);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={18} className="text-primary" />
        <h2 className="text-sm font-medium text-foreground">Question Bank</h2>
      </div>

      {/* Add form */}
      <div className="feedback-card p-4 space-y-3">
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
