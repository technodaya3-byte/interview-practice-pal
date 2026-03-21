import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SessionHistory } from "@/components/dashboard/SessionHistory";
import { PerformanceTrends } from "@/components/dashboard/PerformanceTrends";
import { LogOut, Play, User } from "lucide-react";

type Session = {
  id: string;
  job_title: string;
  job_level: string;
  questions: { question: string; category: string }[];
  duration_seconds: number;
  feedback: any;
  created_at: string;
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setSessions((data as unknown as Session[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("interview_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const hasSessions = !loading && sessions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display text-foreground">Dashboard</h1>
            <p className="text-body text-muted-foreground mt-1">
              Welcome back, {user?.user_metadata?.display_name || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/interview")} className="gap-2">
              <Play size={14} /> New Interview
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </div>

        {hasSessions && <PerformanceTrends sessions={sessions} />}

        {hasSessions && (
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent Sessions</h2>
        )}
        <SessionHistory sessions={sessions} loading={loading} onDelete={handleDelete} />

        {!loading && sessions.length === 0 && (
          <div className="feedback-card text-center py-16">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <User size={20} className="text-primary" />
            </div>
            <h2 className="text-foreground font-medium text-lg mb-2">No simulations yet</h2>
            <p className="text-body text-muted-foreground max-w-sm mx-auto mb-6">
              Start your first session to see your baseline performance score.
            </p>
            <Button onClick={() => navigate("/interview")} className="gap-2">
              <Play size={14} /> Start First Interview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
