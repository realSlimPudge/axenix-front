"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { RTC_CONFIG } from "@/shared/config/webrtc";
import {
  useSignaling,
  type JoinedPayload,
  type SignalingMessage,
  type SignalingMeta,
} from "./useSignaling";

interface RemotePeerInfo {
  peerId: string;
  userId?: string;
  name?: string;
}

interface PeerContext {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  settingRemoteAnswer: boolean;
}

export interface RemoteParticipant {
  peerId: string;
  name?: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

interface UseWebRTCProps {
  localStream: MediaStream | null;
  sendMessage: (message: SignalingMessage) => boolean;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onConnectionStateChange?: (state: string) => void;
}

interface UseWebRTCResult {
  isCallActive: boolean;
  connectionState: string;
  remoteParticipants: RemoteParticipant[];
  startCall: (peerId?: string) => void;
  endCall: () => void;
  handleWebSocketMessage: (message: SignalingMessage) => void;
}

const PEER_STREAM_TIMEOUT_MS = 10000;
const PEER_RETRY_DELAY_MS = 4000;
const PEER_MAX_RETRIES = 3;

interface PeerRecoveryState {
  attempts: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
  streamTimer?: ReturnType<typeof setTimeout>;
}

export function useWebRTC({
  localStream,
  sendMessage,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCProps): UseWebRTCResult {
  const remotePeersInitial = useRef(new Map<string, RemotePeerInfo>());
  const [remotePeers, setRemotePeersState] = useState(
    remotePeersInitial.current,
  );
  const remotePeersRef = useRef(remotePeersInitial.current);

  const peerContextsRef = useRef(new Map<string, PeerContext>());
  const iceCandidateQueuesRef = useRef(
    new Map<string, RTCIceCandidateInit[]>(),
  );
  const remoteStreamsRef = useRef(new Map<string, MediaStream>());
  const [remoteStreamsState, setRemoteStreamsState] = useState(
    new Map<string, MediaStream>(),
  );
  const connectionStatesRef = useRef(
    new Map<string, RTCPeerConnectionState>(),
  );
  const [connectionStatesState, setConnectionStatesState] = useState(
    new Map<string, RTCPeerConnectionState>(),
  );
  const peerRecoveryRef = useRef(new Map<string, PeerRecoveryState>());
  const restartPeerConnectionRef = useRef<
    (peerId: string, reason: string) => void
  >(() => {});
  const scheduleStreamWatchRef = useRef<
    (peerId: string, timeoutMs?: number) => void
  >(() => {});
  const markStreamReceivedRef = useRef<(peerId: string) => void>(() => {});

  const selfPeerIdRef = useRef<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [aggregatedConnectionState, setAggregatedConnectionState] =
    useState<string>("new");

  const {
    handleSignalingMessage,
    createOfferMessage,
    createAnswerMessage,
    createIceCandidateMessage,
    createLeaveMessage,
  } = useSignaling();

  const setRemotePeers = useCallback(
    (
      updater: (
        previous: Map<string, RemotePeerInfo>,
      ) => Map<string, RemotePeerInfo> | null,
    ) => {
      setRemotePeersState((previous) => {
        const result = updater(previous);
        if (!result) {
          return previous;
        }
        remotePeersRef.current = result;
        return result;
      });
    },
    [],
  );

  const updateRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
    remoteStreamsRef.current.set(peerId, stream);
    setRemoteStreamsState(new Map(remoteStreamsRef.current));
  }, []);

  const clearRemoteStream = useCallback((peerId: string) => {
    if (remoteStreamsRef.current.delete(peerId)) {
      setRemoteStreamsState(new Map(remoteStreamsRef.current));
    }
  }, []);

  const updateConnectionState = useCallback(
    (peerId: string, state: RTCPeerConnectionState) => {
      connectionStatesRef.current.set(peerId, state);
      setConnectionStatesState(new Map(connectionStatesRef.current));
    },
    [],
  );

  const destroyPeerConnection = useCallback((peerId: string) => {
    const ctx = peerContextsRef.current.get(peerId);
    if (ctx) {
      ctx.pc.onicecandidate = null;
      ctx.pc.ontrack = null;
      ctx.pc.onconnectionstatechange = null;
      ctx.pc.close();
      peerContextsRef.current.delete(peerId);
    }

    iceCandidateQueuesRef.current.delete(peerId);
    clearRemoteStream(peerId);
    if (connectionStatesRef.current.delete(peerId)) {
      setConnectionStatesState(new Map(connectionStatesRef.current));
    }
  }, [clearRemoteStream]);

  const syncLocalTracks = useCallback(
    (pc: RTCPeerConnection) => {
      if (!localStream) {
        return;
      }

      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const existing = senders.find((sender) => sender.track?.kind === track.kind);
        if (existing) {
          existing.replaceTrack(track).catch((error) => {
            console.warn("Failed to replace track:", error);
          });
        } else {
          pc.addTrack(track, localStream);
        }
      });
    },
    [localStream],
  );

  const ensurePeerContext = useCallback(
    (peerId: string): PeerContext => {
      let context = peerContextsRef.current.get(peerId);
      if (context) {
        return context;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      context = {
        pc,
        makingOffer: false,
        settingRemoteAnswer: false,
      };

      peerContextsRef.current.set(peerId, context);
      connectionStatesRef.current.set(
        peerId,
        pc.connectionState ?? "new",
      );
      setConnectionStatesState(new Map(connectionStatesRef.current));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const message = createIceCandidateMessage(
            event.candidate.toJSON(),
            peerId,
          );
          const sent = sendMessage(message);
          if (!sent) {
            console.warn("Queued ICE candidate for", peerId);
          }
        }
      };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) {
      updateRemoteStream(peerId, stream);
      markStreamReceivedRef.current(peerId);
    }
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState ?? "new";
    updateConnectionState(peerId, state);
    if (state === "connected") {
      markStreamReceivedRef.current(peerId);
      if (!remoteStreamsRef.current.get(peerId)) {
        scheduleStreamWatchRef.current(peerId, PEER_STREAM_TIMEOUT_MS / 2);
      }
    } else if (
      state === "failed" ||
      state === "disconnected" ||
      state === "closed"
    ) {
      restartPeerConnectionRef.current(peerId, `connection-${state}`);
    }
    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected" ||
      pc.connectionState === "closed"
    ) {
          console.warn("Peer connection closed for", peerId, pc.connectionState);
        }
      };

      syncLocalTracks(pc);

      return context;
    },
    [createIceCandidateMessage, sendMessage, syncLocalTracks, updateConnectionState, updateRemoteStream],
  );

  const flushIceQueue = useCallback(
    async (peerId: string) => {
      const queue = iceCandidateQueuesRef.current.get(peerId);
      if (!queue || queue.length === 0) {
        return;
      }

      const ctx = peerContextsRef.current.get(peerId);
      if (!ctx) {
        return;
      }

      while (queue.length > 0) {
        const candidate = queue.shift();
        if (!candidate) {
          continue;
        }
        try {
          await ctx.pc.addIceCandidate(candidate);
        } catch (error) {
          console.error("Error adding queued ICE candidate:", error);
        }
      }
    },
    [],
  );

  const startNegotiation = useCallback(
    async (peerId: string) => {
      const ctx = ensurePeerContext(peerId);
      const { pc } = ctx;

      if (ctx.makingOffer || pc.signalingState !== "stable") {
        console.log(
          "Skip negotiation for",
          peerId,
          "state",
          pc.signalingState,
        );
        return;
      }

      try {
        ctx.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sent = sendMessage(createOfferMessage(offer, peerId));
        if (!sent) {
          console.warn("Offer queued for", peerId);
        }
        console.log("Offer created for", peerId);
      } catch (error) {
        console.error("Error creating offer for", peerId, error);
      } finally {
        ctx.makingOffer = false;
      }
    },
    [createOfferMessage, ensurePeerContext, sendMessage],
  );

  const initiateIfNeeded = useCallback(
    (peerId: string) => {
      const selfId = selfPeerIdRef.current;
      if (!selfId || !localStream) {
        return;
      }
      if (selfId === peerId) {
        return;
      }
      if (selfId.localeCompare(peerId) < 0) {
        void startNegotiation(peerId);
      }
    },
    [localStream, startNegotiation],
  );

  const getPeerRecoveryState = useCallback((peerId: string) => {
    let state = peerRecoveryRef.current.get(peerId);
    if (!state) {
      state = { attempts: 0 };
      peerRecoveryRef.current.set(peerId, state);
    }
    return state;
  }, []);

  const markStreamReceived = useCallback((peerId: string) => {
    const state = getPeerRecoveryState(peerId);
    state.attempts = 0;
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = undefined;
    }
    if (state.streamTimer) {
      clearTimeout(state.streamTimer);
      state.streamTimer = undefined;
    }
  }, [getPeerRecoveryState]);

  const clearPeerRecovery = useCallback((peerId: string) => {
    const state = peerRecoveryRef.current.get(peerId);
    if (!state) {
      return;
    }
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
    }
    if (state.streamTimer) {
      clearTimeout(state.streamTimer);
    }
    peerRecoveryRef.current.delete(peerId);
  }, []);

  const scheduleStreamWatch = useCallback(
    (peerId: string, timeoutMs = PEER_STREAM_TIMEOUT_MS) => {
      const state = getPeerRecoveryState(peerId);
      if (state.streamTimer) {
        clearTimeout(state.streamTimer);
      }
      state.streamTimer = setTimeout(() => {
        state.streamTimer = undefined;
        if (!remoteStreamsRef.current.get(peerId)) {
          restartPeerConnectionRef.current(peerId, "stream-timeout");
        }
      }, timeoutMs);
    },
    [getPeerRecoveryState],
  );

  const restartPeerConnection = useCallback(
    (peerId: string, reason: string) => {
      const state = getPeerRecoveryState(peerId);
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
      }

      if (!remotePeersRef.current.has(peerId)) {
        return;
      }

      if (state.attempts >= PEER_MAX_RETRIES) {
        console.warn(
          "Reached maximum reconnection attempts for peer",
          peerId,
          reason,
        );
        return;
      }

      state.attempts += 1;
      state.reconnectTimer = setTimeout(() => {
        state.reconnectTimer = undefined;
        if (!remotePeersRef.current.has(peerId)) {
          return;
        }

        console.info(
          `Restarting peer connection for ${peerId} (attempt ${state.attempts}) due to ${reason}`,
        );
        if (state.streamTimer) {
          clearTimeout(state.streamTimer);
          state.streamTimer = undefined;
        }
        destroyPeerConnection(peerId);
        ensurePeerContext(peerId);
        initiateIfNeeded(peerId);
        scheduleStreamWatch(peerId);
      }, PEER_RETRY_DELAY_MS);
    },
    [
      destroyPeerConnection,
      ensurePeerContext,
      getPeerRecoveryState,
      initiateIfNeeded,
      scheduleStreamWatch,
    ],
  );

  useEffect(() => {
    restartPeerConnectionRef.current = restartPeerConnection;
  }, [restartPeerConnection]);

  useEffect(() => {
    scheduleStreamWatchRef.current = scheduleStreamWatch;
  }, [scheduleStreamWatch]);

  useEffect(() => {
    markStreamReceivedRef.current = markStreamReceived;
  }, [markStreamReceived]);

  const bootstrapNegotiation = useRef<() => void>(() => {});
  bootstrapNegotiation.current = () => {
    const selfId = selfPeerIdRef.current;
    if (!selfId || !localStream) {
      return;
    }

    const sortedPeers = Array.from(remotePeersRef.current.keys()).sort();
    for (const peerId of sortedPeers) {
      if (peerId === selfId) {
        continue;
      }
      if (selfId.localeCompare(peerId) < 0) {
        void startNegotiation(peerId);
        break;
      }
    }
  };

  const handleOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit, meta: SignalingMeta) => {
      const senderId = meta.senderId;
      if (!senderId) {
        console.warn("Offer without sender id", meta);
        return;
      }

      const ctx = ensurePeerContext(senderId);
      const { pc } = ctx;

      const offerCollision =
        ctx.makingOffer || pc.signalingState !== "stable";

      try {
        if (offerCollision) {
          console.log("Offer collision detected, rolling back", senderId);
          await pc.setLocalDescription({ type: "rollback" });
        }

        ctx.settingRemoteAnswer = true;
        await pc.setRemoteDescription(sdp);
        await flushIceQueue(senderId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const sent = sendMessage(createAnswerMessage(answer, senderId));
        if (!sent) {
          console.warn("Answer queued for", senderId);
        }
      } catch (error) {
        console.error("Error handling offer from", senderId, error);
      } finally {
        ctx.settingRemoteAnswer = false;
        ctx.makingOffer = false;
      }
    },
    [createAnswerMessage, ensurePeerContext, flushIceQueue, sendMessage],
  );

  const handleAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit, meta: SignalingMeta) => {
      const senderId = meta.senderId;
      if (!senderId) {
        console.warn("Answer without sender id", meta);
        return;
      }

      const ctx = ensurePeerContext(senderId);

      try {
        ctx.settingRemoteAnswer = true;
        await ctx.pc.setRemoteDescription(sdp);
        await flushIceQueue(senderId);
        console.log("Applied answer from", senderId);
      } catch (error) {
        console.error("Error setting remote answer from", senderId, error);
      } finally {
        ctx.settingRemoteAnswer = false;
      }
    },
    [ensurePeerContext, flushIceQueue],
  );

  const handleRemoteCandidate = useCallback(
    async (candidate: RTCIceCandidateInit, meta: SignalingMeta) => {
      if (!candidate) {
        return;
      }

      const senderId = meta.senderId;
      if (!senderId) {
        console.warn("ICE without sender id", meta);
        return;
      }

      const ctx = ensurePeerContext(senderId);

      if (
        !ctx.pc.remoteDescription ||
        ctx.settingRemoteAnswer
      ) {
        const queue = iceCandidateQueuesRef.current.get(senderId) ?? [];
        queue.push(candidate);
        iceCandidateQueuesRef.current.set(senderId, queue);
        return;
      }

      try {
        await ctx.pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("Error adding ICE candidate from", senderId, error);
      }
    },
    [ensurePeerContext],
  );

  const handleJoined = useCallback(
    (payload: JoinedPayload) => {
      if (!payload.peerId) {
        return;
      }

      if (payload.isSelf) {
        selfPeerIdRef.current = payload.peerId;
        bootstrapNegotiation.current?.();
        return;
      }

      if (selfPeerIdRef.current && payload.peerId === selfPeerIdRef.current) {
        return;
      }

      const duplicatePeerIds: string[] = [];

      remotePeersRef.current.forEach((info, peerId) => {
        if (peerId === payload.peerId) {
          return;
        }

        if (payload.userId && info.userId && info.userId === payload.userId) {
          duplicatePeerIds.push(peerId);
          return;
        }

        if (
          !payload.userId &&
          !info.userId &&
          payload.name &&
          info.name === payload.name
        ) {
          duplicatePeerIds.push(peerId);
        }
      });

      if (duplicatePeerIds.length > 0) {
        duplicatePeerIds.forEach((peerId) => {
          destroyPeerConnection(peerId);
          clearPeerRecovery(peerId);
        });

        setRemotePeers((previous) => {
          const next = new Map(previous);
          let changed = false;
          duplicatePeerIds.forEach((peerId) => {
            if (next.delete(peerId)) {
              changed = true;
            }
          });
          return changed ? next : null;
        });
      }

      ensurePeerContext(payload.peerId);

      setRemotePeers((previous) => {
        const existing = previous.get(payload.peerId);
        if (existing && existing.name === payload.name) {
          return null;
        }
        const next = new Map(previous);
        next.set(payload.peerId, {
          peerId: payload.peerId,
          userId: payload.userId,
          name: payload.name,
        });
        return next;
      });

      initiateIfNeeded(payload.peerId);
      bootstrapNegotiation.current?.();
      scheduleStreamWatch(payload.peerId);
    },
    [
      clearPeerRecovery,
      destroyPeerConnection,
      ensurePeerContext,
      initiateIfNeeded,
      scheduleStreamWatch,
      setRemotePeers,
    ],
  );

  const handlePeerLeft = useCallback(
    (peerId: string) => {
      if (!peerId) {
        return;
      }

      destroyPeerConnection(peerId);
      clearPeerRecovery(peerId);

      setRemotePeers((previous) => {
        if (!previous.has(peerId)) {
          return null;
        }
        const next = new Map(previous);
        next.delete(peerId);
        return next;
      });
    },
    [clearPeerRecovery, destroyPeerConnection, setRemotePeers],
  );

  const handleWebSocketMessage = useCallback(
    (message: SignalingMessage) => {
      if (!message) {
        return;
      }

      handleSignalingMessage(message, {
        onOffer: handleOffer,
        onAnswer: handleAnswer,
        onIceCandidate: handleRemoteCandidate,
        onUserJoined: (payload: JoinedPayload) => {
          handleJoined(payload);
        },
        onUserLeave: (peerId: string) => {
          handlePeerLeft(peerId);
        },
        onError: (error) => {
          console.error("Signaling error:", error);
        },
      });
    },
    [
      handleAnswer,
      handleJoined,
      handleOffer,
      handlePeerLeft,
      handleRemoteCandidate,
      handleSignalingMessage,
    ],
  );

  useEffect(() => {
    peerContextsRef.current.forEach((ctx) => {
      syncLocalTracks(ctx.pc);
    });
  }, [localStream, syncLocalTracks]);

  useEffect(() => {
    bootstrapNegotiation.current?.();
  }, [remotePeers, localStream]);

  useEffect(() => {
    const states = Array.from(connectionStatesState.values());
    const hasConnected = states.some((state) => state === "connected");
    const isConnecting = states.some((state) => state === "connecting");
    const hasFailed =
      states.length > 0 &&
      states.every((state) => state === "failed" || state === "disconnected");

    setIsCallActive(hasConnected);

    if (hasConnected) {
      setAggregatedConnectionState("connected");
    } else if (isConnecting) {
      setAggregatedConnectionState("connecting");
    } else if (hasFailed) {
      setAggregatedConnectionState("failed");
    } else {
      setAggregatedConnectionState("new");
    }
  }, [connectionStatesState]);

  useEffect(() => {
    onConnectionStateChange?.(aggregatedConnectionState);
  }, [aggregatedConnectionState, onConnectionStateChange]);

  const remoteParticipants = useMemo(() => {
    const participants: RemoteParticipant[] = [];
    remotePeers.forEach((info, peerId) => {
      participants.push({
        peerId,
        name: info.name,
        stream: remoteStreamsState.get(peerId) ?? null,
        connectionState: connectionStatesState.get(peerId) ?? "new",
      });
    });
    return participants;
  }, [remotePeers, remoteStreamsState, connectionStatesState]);

  useEffect(() => {
    const firstStream = remoteParticipants.find((participant) => participant.stream)?.stream ?? null;
    onRemoteStream?.(firstStream || null);
  }, [onRemoteStream, remoteParticipants]);

  const startCall = useCallback(
    (peerId?: string) => {
      if (peerId) {
        void startNegotiation(peerId);
        return;
      }

      const selfId = selfPeerIdRef.current;
      if (!selfId) {
        return;
      }

      const sorted = Array.from(remotePeersRef.current.keys()).sort();
      for (const candidate of sorted) {
        if (selfId === candidate) {
          continue;
        }
        if (selfId.localeCompare(candidate) < 0) {
          void startNegotiation(candidate);
          break;
        }
      }
    },
    [startNegotiation],
  );

  const endCall = useCallback(() => {
    sendMessage(createLeaveMessage());
    peerContextsRef.current.forEach((_, peerId) => {
      destroyPeerConnection(peerId);
    });
    peerContextsRef.current.clear();
    iceCandidateQueuesRef.current.clear();
    remoteStreamsRef.current.clear();
    setRemoteStreamsState(new Map());
    connectionStatesRef.current.clear();
    setConnectionStatesState(new Map());
    setRemotePeers(() => new Map());
    peerRecoveryRef.current.forEach((_, peerId) => {
      clearPeerRecovery(peerId);
    });
    peerRecoveryRef.current.clear();
  }, [clearPeerRecovery, createLeaveMessage, destroyPeerConnection, sendMessage, setRemotePeers]);

  useEffect(() => {
    const peerContexts = peerContextsRef.current;
    const iceQueues = iceCandidateQueuesRef.current;
    const remoteStreams = remoteStreamsRef.current;
    const connectionStates = connectionStatesRef.current;
    const recoveryStates = peerRecoveryRef.current;

    return () => {
      peerContexts.forEach((_, peerId) => {
        destroyPeerConnection(peerId);
      });
      peerContexts.clear();
      iceQueues.clear();
      remoteStreams.clear();
      connectionStates.clear();
      setRemoteStreamsState(new Map());
      setConnectionStatesState(new Map());
      recoveryStates.forEach((_, peerId) => {
        clearPeerRecovery(peerId);
      });
      recoveryStates.clear();
    };
  }, [clearPeerRecovery, destroyPeerConnection, setConnectionStatesState, setRemoteStreamsState]);

  return {
    isCallActive,
    connectionState: aggregatedConnectionState,
    remoteParticipants,
    startCall,
    endCall,
    handleWebSocketMessage,
  };
}
