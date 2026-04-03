import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { profileSchema, type ProfileFormData } from "@/lib/validations";
import { motion } from "framer-motion";
import {
  User, MapPin, GraduationCap, Briefcase, Github, Linkedin,
  Camera, Save, Loader2, ArrowLeft, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  address: string | null;
  college: string | null;
  degree: string | null;
  domain: string | null;
  linkedin_url: string | null;
  github_url: string | null;
};

type Session = {
  id: string;
  job_title: string;
  job_level: string;
  duration_seconds: number;
  feedback: any;
  created_at: string;
};

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<ProfileFormData>({
    display_name: "",
    address: "",
    college: "",
    degree: "",
    domain: "",
    linkedin_url: "",
    github_url: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profRes, sessRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("interview_sessions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (profRes.data) {
        const p = profRes.data as any;
        setProfile(p);
        setForm({
          display_name: p.display_name || "",
          address: p.address || "",
          college: p.college || "",
          degree: p.degree || "",
          domain: p.domain || "",
          linkedin_url: p.linkedin_url || "",
          github_url: p.github_url || "",
        });
      }
      setSessions((sessRes.data as unknown as Session[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setErrors({});
    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) fieldErrors[String(e.path[0])] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(result.data)
      .eq("user_id", user!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = urlData.publicUrl + `?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url }).eq("user_id", user.id);
    setProfile((p) => p ? { ...p, avatar_url } : p);
    toast({ title: "Photo updated" });
    setUploading(false);
  };

  // Performance data
  const scoreHistory = sessions
    .filter((s) => s.feedback?.overallScore)
    .reverse()
    .map((s, i) => ({
      session: `#${i + 1}`,
      score: s.feedback.overallScore,
      date: new Date(s.created_at).toLocaleDateString(),
    }));

  const latestFeedback = sessions.find((s) => s.feedback?.categories);
  const radarData = latestFeedback?.feedback?.categories?.map((c: any) => ({
    category: c.name,
    score: c.score,
  })) || [];

  const totalSessions = sessions.length;
  const avgScore = sessions.filter((s) => s.feedback?.overallScore).length > 0
    ? Math.round(
        sessions.filter((s) => s.feedback?.overallScore).reduce((a, s) => a + s.feedback.overallScore, 0) /
        sessions.filter((s) => s.feedback?.overallScore).length
      )
    : 0;
  const bestScore = Math.max(0, ...sessions.filter((s) => s.feedback?.overallScore).map((s) => s.feedback.overallScore));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const Field = ({ name, label, icon: Icon, type = "text" }: { name: keyof ProfileFormData; label: string; icon: any; type?: string }) => (
    <div>
      <Label className="flex items-center gap-1.5 mb-1.5">
        <Icon size={14} className="text-muted-foreground" /> {label}
      </Label>
      <Input
        type={type}
        value={form[name] || ""}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        placeholder={label}
      />
      {errors[name] && <p className="text-xs text-destructive mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container max-w-4xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header Card */}
          <div className="feedback-card p-6 mb-6">
            <div className="flex items-start gap-5">
              <div className="relative group">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {(profile?.display_name || user?.email)?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  disabled={uploading}
                >
                  {uploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="flex-1">
                <h1 className="text-display text-foreground">{profile?.display_name || user?.email}</h1>
                <p className="text-body text-muted-foreground">{user?.email}</p>
                {profile?.domain && (
                  <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {profile.domain}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-foreground">{totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{avgScore}</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{bestScore}</p>
                  <p className="text-xs text-muted-foreground">Best Score</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="sessions">Session History</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="feedback-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field name="display_name" label="Display Name" icon={User} />
                  <Field name="domain" label="Domain / Specialization" icon={Briefcase} />
                  <Field name="college" label="College / University" icon={GraduationCap} />
                  <Field name="degree" label="Degree" icon={GraduationCap} />
                  <div className="md:col-span-2">
                    <Field name="address" label="Address" icon={MapPin} />
                  </div>
                  <Field name="linkedin_url" label="LinkedIn URL" icon={Linkedin} type="url" />
                  <Field name="github_url" label="GitHub URL" icon={Github} type="url" />
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scoreHistory.length > 0 && (
                  <div className="feedback-card p-5">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                      <TrendingUp size={14} /> Score Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={scoreHistory}>
                        <defs>
                          <linearGradient id="profScoreGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="session" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#profScoreGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {radarData.length > 0 && (
                  <div className="feedback-card p-5">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Skill Breakdown</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {scoreHistory.length === 0 && (
                  <div className="feedback-card p-8 text-center md:col-span-2">
                    <p className="text-muted-foreground">Complete some interview sessions to see your performance data.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions">
              {sessions.length === 0 ? (
                <div className="feedback-card p-8 text-center">
                  <p className="text-muted-foreground">No sessions yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div key={s.id} className="feedback-card p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.job_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.job_level} · {new Date(s.created_at).toLocaleDateString()} · {Math.round(s.duration_seconds / 60)}min
                        </p>
                      </div>
                      {s.feedback?.overallScore && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">{s.feedback.overallScore}</p>
                          <p className="text-xs text-muted-foreground">/100</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
