import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SlideViewer } from "@/components/live/SlideViewer";
import { ChatPanel } from "@/components/live/ChatPanel";
import { VideoGrid } from "@/components/live/VideoGrid";
import { ParticipantListPanel } from "@/components/live/ParticipantListPanel";
import { ScreenShareView } from "@/components/live/ScreenShareView";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Copy, LogOut, Users, MessageSquare, UserRound, PanelRight, X } from "lucide-react";
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

  useEffect(() => {
    if (user && session) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        const name = data?.display_name || user.email || "User";
        setDisplayName(name);
        setJoined(true);
      });
    }
  }, [user, session]);

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

  if (!joined && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
  const { participants, localStream, screenStream, videoEnabled, audioEnabled, screenSharing, toggleVideo, toggleAudio, toggleScreenShare } =
    useWebRTC(session.id, participantId, displayName);

  const [rightTab, setRightTab] = useState<"chat" | "participants">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const sidebarContent = (
    <>
      {/* Video grid */}
      <div className="h-48 md:h-56 shrink-0">
        <VideoGrid
          localStream={localStream}
          localName={displayName}
          videoEnabled={videoEnabled}
          audioEnabled={audioEnabled}
          screenSharing={screenSharing}
          participants={participants}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreenShare={toggleScreenShare}
        />
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 shrink-0">
        <Button
          variant={rightTab === "chat" ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => setRightTab("chat")}
        >
          <MessageSquare className="h-3 w-3" /> Chat
        </Button>
        <Button
          variant={rightTab === "participants" ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => setRightTab("participants")}
        >
          <UserRound className="h-3 w-3" /> People ({participants.length + 1})
        </Button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {rightTab === "chat" ? (
          <ChatPanel sessionId={session.id} senderName={displayName} userId={userId} />
        ) : (
          <ParticipantListPanel
            localName={displayName}
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            screenSharing={screenSharing}
            isPresenter={isPresenter}
            participants={participants}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 md:h-14 border-b border-border flex items-center justify-between px-3 md:px-4 shrink-0 bg-card">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-semibold text-xs">AI</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{session.title}</h1>
            <p className="text-xs text-muted-foreground truncate">by {session.presenter_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {participants.length + 1}
          </span>
          <Button variant="outline" size="sm" onClick={onCopyLink} className="gap-1.5 text-xs hidden sm:flex">
            <Copy className="h-3 w-3" /> Share Link
          </Button>
          <Button variant="outline" size="icon" onClick={onCopyLink} className="h-8 w-8 sm:hidden">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {isPresenter && (
            <Button variant="destructive" size="sm" onClick={onEndSession} className="gap-1.5 text-xs">
              <LogOut className="h-3 w-3" /> <span className="hidden sm:inline">End</span>
            </Button>
          )}
          {/* Mobile sidebar toggle */}
          {isMobile && (
            <Button variant="outline" size="icon" className="h-8 w-8 md:hidden" onClick={() => setSidebarOpen(true)}>
              <PanelRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Slide / Screen share area */}
        <div className="flex-1 p-2 md:p-4 min-w-0 flex flex-col gap-2 md:gap-3">
          {screenStream || participants.some(p => p.screenStream) ? (
            <div className="flex-1 min-h-0">
              <ScreenShareView
                stream={screenStream || participants.find(p => p.screenStream)?.screenStream || null}
                sharerName={screenStream ? "You" : participants.find(p => p.screenStream)?.displayName || "Someone"}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <SlideViewer
                sessionId={session.id}
                isPresenter={isPresenter}
                currentSlide={session.current_slide}
                totalSlides={session.total_slides}
                presentationUrl={session.presentation_url}
                onSlideChange={onSlideChange}
              />
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="w-80 border-l border-border flex flex-col p-3 gap-3 shrink-0">
            {sidebarContent}
          </div>
        )}

        {/* Mobile sidebar sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-3 flex flex-col gap-3 [&>button]:hidden">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-foreground">Room Panel</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
