import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Briefcase } from "lucide-react";

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
};

const levels = [
  { value: "junior", label: "Junior / Entry-level" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff / Principal" },
  { value: "manager", label: "Engineering Manager" },
];

export const RoleSelectionDialog = ({ open, onClose, onStart, loading }: Props) => {
  const [jobTitle, setJobTitle] = useState("Software Engineer");
  const [jobLevel, setJobLevel] = useState("mid");
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  const handleStart = () => {
    onStart({ jobTitle, jobLevel, numberOfQuestions });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center mb-2">
            <Briefcase size={18} className="text-primary" />
          </div>
          <DialogTitle className="text-foreground">Configure Your Interview</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select the role and level. AI will generate tailored questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="label-text mb-1.5 block">Job Title</label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div>
            <label className="label-text mb-1.5 block">Level</label>
            <Select value={jobLevel} onValueChange={setJobLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="label-text mb-1.5 block">Number of Questions</label>
            <Select
              value={String(numberOfQuestions)}
              onValueChange={(v) => setNumberOfQuestions(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 7, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" size="lg" onClick={handleStart} disabled={loading || !jobTitle.trim()}>
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating Questions…
              </>
            ) : (
              "Start Interview"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
