import { useEffect, useRef } from "react";
import { Monitor } from "lucide-react";

interface ScreenShareViewProps {
  stream: MediaStream | null;
  sharerName: string;
}

export function ScreenShareView({ stream, sharerName }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Monitor className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{sharerName}'s screen</span>
      </div>
      <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
}
