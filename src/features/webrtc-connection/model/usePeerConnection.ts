"use client";
import { useRef, useCallback, useState } from "react";
import { RTC_CONFIG } from "@/shared/config/webrtc";

export function usePeerConnection() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>("disconnected");

  const createPeerConnection = useCallback(() => {
    // Закрываем предыдущее соединение если есть
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Отслеживаем состояние соединения
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      console.log("Connection state:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    // Обрабатываем входящие треки (удаленное видео)
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Отправляем ICE candidates через WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate:", event.candidate);
        // Будем отправлять через основной хук
      }
    };

    return pc;
  }, []);

  const addLocalTracks = useCallback((stream: MediaStream) => {
    if (!pcRef.current) return;

    // Добавляем все треки из локального потока
    stream.getTracks().forEach((track) => {
      pcRef.current!.addTrack(track, stream);
    });
  }, []);

  const createOffer =
    useCallback(async (): Promise<RTCSessionDescriptionInit> => {
      if (!pcRef.current) {
        throw new Error("PeerConnection not initialized");
      }

      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      return offer;
    }, []);

  const createAnswer =
    useCallback(async (): Promise<RTCSessionDescriptionInit> => {
      if (!pcRef.current) {
        throw new Error("PeerConnection not initialized");
      }

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      return answer;
    }, []);

  const setRemoteDescription = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      if (!pcRef.current) {
        throw new Error("PeerConnection not initialized");
      }

      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    [],
  );

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!pcRef.current) {
        throw new Error("PeerConnection not initialized");
      }

      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    },
    [],
  );

  const closeConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState("disconnected");
  }, []);

  return {
    pc: pcRef.current,
    remoteStream,
    connectionState,
    createPeerConnection,
    addLocalTracks,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    closeConnection,
  };
}
