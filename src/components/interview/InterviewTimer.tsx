import { useEffect, useState } from "react";

type Props = {
  isRunning: boolean;
  onTimeUpdate?: (seconds: number) => void;
};

export const InterviewTimer = ({ isRunning, onTimeUpdate }: Props) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        onTimeUpdate?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, onTimeUpdate]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="timer text-2xl font-medium">
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
};
