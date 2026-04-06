import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff } from "lucide-react";

interface ParticipantVideoProps {
  name: string;
}

export function ParticipantVideo({ name }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);

  const toggleVideo = async () => {
    if (videoOn && stream) {
      stream.getVideoTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setStream(null);
      setVideoOn(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioOn });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
        setVideoOn(true);
      } catch { /* permission denied */ }
    }
  };

  const toggleAudio = async () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setAudioOn(!audioOn);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: videoOn, audio: true });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
        setAudioOn(true);
      } catch { /* permission denied */ }
    }
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        {videoOn ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">{name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 py-2 px-3 border-t border-border">
        <Button variant={videoOn ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={toggleVideo}>
          {videoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
        </Button>
        <Button variant={audioOn ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={toggleAudio}>
          {audioOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
        </Button>
        <span className="text-xs text-muted-foreground ml-2 truncate">{name}</span>
      </div>
    </div>
  );
}
