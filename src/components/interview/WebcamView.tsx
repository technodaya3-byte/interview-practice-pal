import { useRef, useEffect, useState, useCallback } from "react";
import { VideoOff } from "lucide-react";

type Props = {
  isRecording: boolean;
};

export const WebcamView = ({ isRecording }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  if (hasPermission === false) {
    return (
      <div className="w-full aspect-video bg-foreground/5 rounded-lg flex flex-col items-center justify-center gap-3">
        <VideoOff size={32} className="text-muted-foreground" />
        <p className="text-body text-muted-foreground">Camera access denied</p>
        <p className="text-body text-muted-foreground text-xs">
          Please allow camera access in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-foreground/95 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/60 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse-ring" />
          <span className="text-xs font-medium text-primary-foreground">Recording</span>
        </div>
      )}
    </div>
  );
};
