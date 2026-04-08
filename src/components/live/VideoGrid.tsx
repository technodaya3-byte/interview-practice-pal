import { useEffect, useRef } from "react";
import { Participant } from "@/hooks/useWebRTC";
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoGridProps {
  localStream: MediaStream | null;
  localName: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  participants: Participant[];
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
}

function RemoteVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === "live");

  return (
    <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">{participant.displayName.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-xs text-muted-foreground">{participant.displayName}</span>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 bg-background/70 backdrop-blur-sm rounded px-1.5 py-0.5">
        <span className="text-[10px] text-foreground font-medium">{participant.displayName}</span>
      </div>
    </div>
  );
}

export function VideoGrid({
  localStream,
  localName,
  videoEnabled,
  audioEnabled,
  screenSharing,
  participants,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
}: VideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const totalCount = 1 + participants.length;
  const gridCols = totalCount <= 1 ? "grid-cols-1" : totalCount <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 grid ${gridCols} gap-2 auto-rows-fr min-h-0`}>
        {/* Local video */}
        <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          {videoEnabled && localStream ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">{localName.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-xs text-muted-foreground">You</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 bg-background/70 backdrop-blur-sm rounded px-1.5 py-0.5">
            <span className="text-[10px] text-foreground font-medium">You</span>
          </div>
        </div>

        {/* Remote videos */}
        {participants.map((p) => (
          <RemoteVideo key={p.participantId} participant={p} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant={videoEnabled ? "default" : "outline"}
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onToggleVideo}
        >
          {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={audioEnabled ? "default" : "outline"}
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onToggleAudio}
        >
          {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={screenSharing ? "default" : "outline"}
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onToggleScreenShare}
        >
          {screenSharing ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
