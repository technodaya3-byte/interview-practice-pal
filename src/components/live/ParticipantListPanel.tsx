import { Participant } from "@/hooks/useWebRTC";
import { Users, Video, VideoOff, Mic, MicOff, Monitor } from "lucide-react";

interface ParticipantListPanelProps {
  localName: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  isPresenter: boolean;
  participants: Participant[];
}

export function ParticipantListPanel({
  localName,
  videoEnabled,
  audioEnabled,
  screenSharing,
  isPresenter,
  participants,
}: ParticipantListPanelProps) {
  const total = 1 + participants.length;

  return (
    <div className="flex flex-col h-full border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Participants</h3>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" /> {total}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {/* Local user */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-semibold">{localName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {localName} <span className="text-muted-foreground font-normal">(You)</span>
            </p>
            {isPresenter && (
              <p className="text-[10px] text-primary">Presenter</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {screenSharing && <Monitor className="h-3 w-3 text-primary" />}
            {videoEnabled ? <Video className="h-3 w-3 text-foreground" /> : <VideoOff className="h-3 w-3 text-muted-foreground" />}
            {audioEnabled ? <Mic className="h-3 w-3 text-foreground" /> : <MicOff className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>

        {/* Remote participants */}
        {participants.map((p) => {
          const hasVideo = p.stream?.getVideoTracks().some(t => t.enabled && t.readyState === "live");
          const hasAudio = p.stream?.getAudioTracks().some(t => t.enabled && t.readyState === "live");

          return (
            <div key={p.participantId} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-xs font-semibold">{p.displayName.charAt(0).toUpperCase()}</span>
              </div>
              <p className="text-sm text-foreground truncate flex-1 min-w-0">{p.displayName}</p>
              <div className="flex items-center gap-1 shrink-0">
                {hasVideo ? <Video className="h-3 w-3 text-foreground" /> : <VideoOff className="h-3 w-3 text-muted-foreground" />}
                {hasAudio ? <Mic className="h-3 w-3 text-foreground" /> : <MicOff className="h-3 w-3 text-muted-foreground" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
