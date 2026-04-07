import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export interface Participant {
  participantId: string;
  displayName: string;
  stream: MediaStream | null;
}

interface SignalRow {
  session_id: string;
  from_id: string;
  to_id: string;
  signal_type: string;
  signal_data: Record<string, unknown>;
}

// Helper to bypass strict typing for new tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useWebRTC(sessionId: string, participantId: string, displayName: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const makingOffer = useRef<Set<string>>(new Set());
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  // Register self
  useEffect(() => {
    db.from("live_participants").upsert(
      { session_id: sessionId, participant_id: participantId, display_name: displayName, is_active: true },
      { onConflict: "session_id,participant_id" }
    );
    return () => {
      db.from("live_participants")
        .update({ is_active: false })
        .eq("session_id", sessionId)
        .eq("participant_id", participantId)
        .then(() => {});
    };
  }, [sessionId, participantId, displayName]);

  const sendSignal = useCallback(async (toId: string, type: string, data: Record<string, unknown>) => {
    await db.from("webrtc_signals").insert({
      session_id: sessionId,
      from_id: participantIdRef.current,
      to_id: toId,
      signal_type: type,
      signal_data: data,
    });
  }, [sessionId]);

  const createPeerConnection = useCallback((remoteId: string, remoteName: string) => {
    if (peerConnections.current.has(remoteId)) return peerConnections.current.get(remoteId)!;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(remoteId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      remoteStreams.current.set(remoteId, stream);
      setParticipants((prev) => {
        const exists = prev.find((p) => p.participantId === remoteId);
        if (exists) return prev.map((p) => p.participantId === remoteId ? { ...p, stream } : p);
        return [...prev, { participantId: remoteId, displayName: remoteName, stream }];
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(remoteId, "ice-candidate", event.candidate.toJSON() as Record<string, unknown>);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        pc.restartIce();
      }
    };

    return pc;
  }, [sendSignal]);

  const startNegotiation = useCallback(async (remoteId: string, remoteName: string) => {
    const pc = createPeerConnection(remoteId, remoteName);
    if (makingOffer.current.has(remoteId)) return;
    makingOffer.current.add(remoteId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(remoteId, "offer", { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type });
    } catch (e) {
      console.error("Offer error:", e);
    } finally {
      makingOffer.current.delete(remoteId);
    }
  }, [createPeerConnection, sendSignal]);

  // Handle signals
  const handleSignal = useCallback(async (signal: SignalRow) => {
    if (signal.to_id !== participantIdRef.current) return;
    const fromId = signal.from_id;
    const pc = createPeerConnection(fromId, "Peer");

    try {
      if (signal.signal_type === "offer") {
        const data = signal.signal_data as { sdp: string; type: RTCSdpType };
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(fromId, "answer", { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type });
      } else if (signal.signal_type === "answer") {
        const data = signal.signal_data as { sdp: string; type: RTCSdpType };
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (signal.signal_type === "ice-candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data as RTCIceCandidateInit));
      }
    } catch (e) {
      console.error("Signal error:", e);
    }
  }, [createPeerConnection, sendSignal]);

  // Subscribe to participants and signals
  useEffect(() => {
    db.from("live_participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_active", true)
      .then(({ data }: { data: { participant_id: string; display_name: string }[] | null }) => {
        if (data) {
          const others = data.filter((p) => p.participant_id !== participantId);
          setParticipants((prev) => {
            const map = new Map(prev.map(p => [p.participantId, p]));
            others.forEach((p) => {
              if (!map.has(p.participant_id)) {
                map.set(p.participant_id, { participantId: p.participant_id, displayName: p.display_name, stream: null });
              }
            });
            return Array.from(map.values());
          });
          others.forEach((p) => {
            if (participantId > p.participant_id) {
              startNegotiation(p.participant_id, p.display_name);
            }
          });
        }
      });

    const participantChannel = supabase
      .channel(`participants-${sessionId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "live_participants", filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const p = payload.new as { participant_id: string; display_name: string; is_active: boolean };
          if (p.participant_id === participantId) return;
          if (p.is_active) {
            setParticipants((prev) => {
              const exists = prev.find(x => x.participantId === p.participant_id);
              if (!exists) return [...prev, { participantId: p.participant_id, displayName: p.display_name, stream: null }];
              return prev.map(x => x.participantId === p.participant_id ? { ...x, displayName: p.display_name } : x);
            });
            if (participantId > p.participant_id) startNegotiation(p.participant_id, p.display_name);
          } else {
            const pc = peerConnections.current.get(p.participant_id);
            if (pc) { pc.close(); peerConnections.current.delete(p.participant_id); }
            remoteStreams.current.delete(p.participant_id);
            setParticipants((prev) => prev.filter(x => x.participantId !== p.participant_id));
          }
        } else if (payload.eventType === "DELETE") {
          const p = payload.old as { participant_id: string };
          const pc = peerConnections.current.get(p.participant_id);
          if (pc) { pc.close(); peerConnections.current.delete(p.participant_id); }
          remoteStreams.current.delete(p.participant_id);
          setParticipants((prev) => prev.filter(x => x.participantId !== p.participant_id));
        }
      }).subscribe();

    const signalChannel = supabase
      .channel(`signals-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "webrtc_signals", filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        handleSignal(payload.new as SignalRow);
      }).subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(signalChannel);
    };
  }, [sessionId, participantId, startNegotiation, handleSignal]);

  const toggleVideo = useCallback(async () => {
    if (videoEnabled && localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = false; t.stop(); });
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length === 0) { localStreamRef.current = null; setLocalStream(null); }
      else { const s = new MediaStream(audioTracks); localStreamRef.current = s; setLocalStream(s); }
      setVideoEnabled(false);
      peerConnections.current.forEach((pc) => {
        const vs = pc.getSenders().find(s => s.track?.kind === "video");
        if (vs) pc.removeTrack(vs);
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        if (localStreamRef.current) localStreamRef.current.addTrack(track);
        else localStreamRef.current = stream;
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setVideoEnabled(true);
        peerConnections.current.forEach((pc) => pc.addTrack(track, localStreamRef.current!));
      } catch { /* denied */ }
    }
  }, [videoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (audioEnabled && localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; t.stop(); });
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length === 0) { localStreamRef.current = null; setLocalStream(null); }
      else { const s = new MediaStream(videoTracks); localStreamRef.current = s; setLocalStream(s); }
      setAudioEnabled(false);
      peerConnections.current.forEach((pc) => {
        const as2 = pc.getSenders().find(s => s.track?.kind === "audio");
        if (as2) pc.removeTrack(as2);
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        if (localStreamRef.current) localStreamRef.current.addTrack(track);
        else localStreamRef.current = stream;
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setAudioEnabled(true);
        peerConnections.current.forEach((pc) => pc.addTrack(track, localStreamRef.current!));
      } catch { /* denied */ }
    }
  }, [audioEnabled]);

  // Cleanup
  useEffect(() => {
    const pcs = peerConnections;
    const ls = localStreamRef;
    return () => {
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      ls.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { participants, localStream, videoEnabled, audioEnabled, toggleVideo, toggleAudio };
}
