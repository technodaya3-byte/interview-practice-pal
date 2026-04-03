import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Briefcase, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminFilters, defaultFilters, type Filters } from "@/components/admin/AdminFilters";
import { AdminSessionList } from "@/components/admin/AdminSessionList";
import { QuestionBankPanel } from "@/components/admin/QuestionBankPanel";
import { AdminAnalyticsPanel } from "@/components/admin/AdminAnalyticsPanel";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";

type SessionRow = {
  id: string;
  user_id: string;
  job_title: string;
  job_level: string;
  questions: { question: string; category: string }[];
  duration_seconds: number;
  feedback: {
    overallScore: number;
    categories: { name: string; score: number }[];
    strengths: string[];
    improvements: string[];
    tip: string;
  } | null;
  created_at: string;
};

type Profile = { user_id: string; display_name: string | null };

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const { isAdmin, roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) { navigate("/dashboard", { replace: true }); return; }

    const load = async () => {
      const [sessRes, profRes] = await Promise.all([
        supabase.from("interview_sessions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("user_id, display_name"),
      ]);
      setSessions((sessRes.data as unknown as SessionRow[]) || []);
      const map: Record<string, string> = {};
      (profRes.data || []).forEach((p: Profile) => { map[p.user_id] = p.display_name || "Unknown"; });
      setProfiles(map);
      setLoading(false);
    };
    load();
  }, [isAdmin, roleLoading, navigate]);

  const userList = useMemo(() => {
    const ids = [...new Set(sessions.map((s) => s.user_id))];
    return ids.map((id) => ({ id, name: profiles[id] || "Unknown" }));
  }, [sessions, profiles]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filters.search && !s.job_title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.level !== "all" && s.job_level !== filters.level) return false;
      if (filters.userId !== "all" && s.user_id !== filters.userId) return false;
      if (filters.minScore) {
        const min = Number(filters.minScore);
        if (!s.feedback || s.feedback.overallScore < min) return false;
      }
      if (filters.dateFrom) {
        if (new Date(s.created_at) < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(s.created_at) > end) return false;
      }
      return true;
    });
  }, [sessions, filters]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSessions = sessions.length;
  const avgScore = sessions.filter((s) => s.feedback).length > 0
    ? Math.round(sessions.filter((s) => s.feedback).reduce((sum, s) => sum + (s.feedback?.overallScore || 0), 0) / sessions.filter((s) => s.feedback).length)
    : 0;
  const uniqueUsers = new Set(sessions.map((s) => s.user_id)).size;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display text-foreground">Admin Dashboard</h1>
            <p className="text-body text-muted-foreground mt-1">All users' interview sessions and performance</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut size={14} /> Sign out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Users, label: "Total Users", value: uniqueUsers },
            { icon: Briefcase, label: "Total Sessions", value: totalSessions },
            { icon: Clock, label: "Avg Score", value: `${avgScore}/100` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="feedback-card p-5 text-center">
              <Icon size={20} className="text-primary mx-auto mb-2" />
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabbed sections */}
        <Tabs defaultValue="sessions" className="mt-2">
          <TabsList className="mb-4">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <AdminFilters filters={filters} onChange={setFilters} users={userList} />
            <h2 className="text-sm font-medium text-muted-foreground mb-3">All Sessions</h2>
            <AdminSessionList sessions={filtered} profiles={profiles} />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsPanel sessions={sessions} profiles={profiles} />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionBankPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
