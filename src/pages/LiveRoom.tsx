import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SlideViewer } from "@/components/live/SlideViewer";
import { ChatPanel } from "@/components/live/ChatPanel";
import { VideoGrid } from "@/components/live/VideoGrid";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, LogOut, Users } from "lucide-react";
import { toast } from "sonner";

interface SessionData {
  id: string;
  room_code: string;
  title: string;
  presenter_id: string | null;
  presenter_name: string;
  presentation_url: string | null;
  current_slide: number;
  total_slides: number;
  is_active: boolean;
}

export default function LiveRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [joined, setJoined] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [participantId] = useState(() => crypto.randomUUID());

  // Load session
  useEffect(() => {
    if (!roomCode) return;
    supabase
      .from("live_sessions")
      .select("*")
      .eq("room_code", roomCode)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Room not found or has ended");
          navigate("/");
          return;
        }
        setSession(data as SessionData);
        setLoading(false);
      });
  }, [roomCode, navigate]);

  // Auto-join if logged in
  useEffect(() => {
    if (user && session) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        const name = data?.display_name || user.email || "User";
        setDisplayName(name);
        setJoined(true);
      });
    }
  }, [user, session]);

  // Subscribe to session updates (slide changes)
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          setSession((prev) => prev ? { ...prev, ...payload.new } as SessionData : null);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  const isPresenter = user?.id === session?.presenter_id;

  const handleGuestJoin = () => {
    if (!guestName.trim()) return;
    setDisplayName(guestName.trim());
    setJoined(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const endSession = async () => {
    if (!session) return;
    await supabase.from("live_sessions").update({ is_active: false }).eq("id", session.id);
    toast.success("Session ended");
    navigate("/dashboard");
  };

  const handleSlideChange = async (slide: number, total: number) => {
    if (!session) return;
    await supabase.from("live_sessions").update({ current_slide: slide, total_slides: total }).eq("id", session.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Guest join screen
  if (!joined && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-auto p-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">{session?.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Presented by {session?.presenter_name}
              </p>
            </div>
            <Input
              placeholder="Enter your name to join"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGuestJoin()}
            />
            <Button className="w-full" onClick={handleGuestJoin} disabled={!guestName.trim()}>
              <Users className="h-4 w-4 mr-2" /> Join Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveRoomContent
      session={session!}
      displayName={displayName}
      participantId={participantId}
      isPresenter={isPresenter}
      userId={user?.id}
      onCopyLink={copyLink}
      onEndSession={endSession}
      onSlideChange={handleSlideChange}
    />
  );
}

function LiveRoomContent({
  session,
  displayName,
  participantId,
  isPresenter,
  userId,
  onCopyLink,
  onEndSession,
  onSlideChange,
}: {
  session: SessionData;
  displayName: string;
  participantId: string;
  isPresenter: boolean;
  userId?: string;
  onCopyLink: () => void;
  onEndSession: () => void;
  onSlideChange: (slide: number, total: number) => void;
}) {
  const { participants, localStream, videoEnabled, audioEnabled, toggleVideo, toggleAudio } =
    useWebRTC(session.id, participantId, displayName);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-xs">AI</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">{session.title}</h1>
            <p className="text-xs text-muted-foreground">by {session.presenter_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {participants.length + 1}
          </span>
          <Button variant="outline" size="sm" onClick={onCopyLink} className="gap-1.5 text-xs">
            <Copy className="h-3 w-3" /> Share Link
          </Button>
          {isPresenter && (
            <Button variant="destructive" size="sm" onClick={onEndSession} className="gap-1.5 text-xs">
              <LogOut className="h-3 w-3" /> End
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Slide area */}
        <div className="flex-1 p-4 min-w-0">
          <SlideViewer
            sessionId={session.id}
            isPresenter={isPresenter}
            currentSlide={session.current_slide}
            totalSlides={session.total_slides}
            presentationUrl={session.presentation_url}
            onSlideChange={onSlideChange}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l border-border flex flex-col p-3 gap-3 shrink-0">
          <div className="h-56 shrink-0">
            <VideoGrid
              localStream={localStream}
              localName={displayName}
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
              participants={participants}
              onToggleVideo={toggleVideo}
              onToggleAudio={toggleAudio}
            />
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel sessionId={session.id} senderName={displayName} userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}