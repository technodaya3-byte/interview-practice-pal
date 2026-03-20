import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SessionHistory } from "@/components/dashboard/SessionHistory";
import { LogOut, Play, User } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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

        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent Sessions</h2>
          <SessionHistory />
        </div>

        {/* Empty state is shown when SessionHistory returns null (no sessions) */}
        <div className="feedback-card text-center py-16" id="empty-state">
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
      </div>
    </div>
  );
};

export default Dashboard;
