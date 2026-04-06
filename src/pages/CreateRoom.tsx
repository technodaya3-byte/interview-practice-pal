import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { Presentation, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const createRoom = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);

    const roomCode = generateRoomCode();

    // Get display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase.from("live_sessions").insert({
      room_code: roomCode,
      title: title.trim(),
      presenter_id: user.id,
      presenter_name: profile?.display_name || user.email || "Presenter",
    });

    if (error) {
      toast.error("Failed to create room");
      setCreating(false);
      return;
    }

    navigate(`/room/${roomCode}`);
  };

  const joinRoom = () => {
    if (!joinCode.trim()) return;
    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Presentation className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-display text-foreground">Live Presentation</h1>
            <p className="text-body text-muted-foreground mt-2">
              Create a room to present live or join an existing session
            </p>
          </div>

          <div className="space-y-6">
            {/* Create room */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Create a Room</h2>
              <div className="space-y-2">
                <Label htmlFor="title">Presentation Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Q4 Product Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createRoom()}
                />
              </div>
              <Button className="w-full" onClick={createRoom} disabled={creating || !title.trim() || !user}>
                {creating ? "Creating..." : "Create & Start Presenting"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  Please <a href="/auth" className="text-primary underline">sign in</a> to create a room
                </p>
              )}
            </div>

            {/* Join room */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Join a Room</h2>
              <div className="space-y-2">
                <Label htmlFor="code">Room Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. A1B2C3"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  className="uppercase font-mono tracking-widest"
                />
              </div>
              <Button variant="outline" className="w-full" onClick={joinRoom} disabled={!joinCode.trim()}>
                Join Session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
