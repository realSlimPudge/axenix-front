"use client";
import { useCallback } from "react";

export interface SignalingMessage {
  type:
    | "offer"
    | "answer"
    | "ice-candidate"
    | "joined"
    | "leave"
    | "peer-left";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  sender_id?: string;
  target_id?: string;
  room?: string;
  payload?: Record<string, unknown>;
  error?: string;
}

export interface SignalingMeta {
  senderId?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}

export interface JoinedPayload {
  peerId: string;
  userId?: string;
  name?: string;
  isSelf: boolean;
}

export function useSignaling() {
  const handleSignalingMessage = useCallback(
    (
      message: SignalingMessage,
      handlers: {
        onOffer: (sdp: RTCSessionDescriptionInit, meta: SignalingMeta) => void;
        onAnswer: (sdp: RTCSessionDescriptionInit, meta: SignalingMeta) => void;
        onIceCandidate: (
          candidate: RTCIceCandidateInit,
          meta: SignalingMeta,
        ) => void;
        onUserJoined: (payload: JoinedPayload, meta: SignalingMeta) => void;
        onUserLeave: (peerId: string, meta: SignalingMeta) => void;
        onError?: (error: string) => void;
      },
    ) => {
      console.log("Processing signaling message:", message);

      const meta: SignalingMeta = {
        senderId: message.sender_id,
        targetId: message.target_id,
        payload: message.payload,
      };

      if (message.error) {
        handlers.onError?.(message.error);
        return;
      }

      switch (message.type) {
        case "offer":
          if (message.sdp) {
            handlers.onOffer(message.sdp, meta);
          }
          break;

        case "answer":
          if (message.sdp) {
            handlers.onAnswer(message.sdp, meta);
          }
          break;

        case "ice-candidate":
          if (message.candidate) {
            handlers.onIceCandidate(message.candidate, meta);
          }
          break;

        case "joined": {
          const payload = message.payload ?? {};
          const payloadHasPeerId = typeof payload.peer_id === "string";
          const peerId = payloadHasPeerId
            ? (payload.peer_id as string)
            : message.sender_id;

          if (!peerId) {
            console.warn("Joined message without peer id", message);
            break;
          }

          const userId =
            typeof payload.user_id === "string"
              ? (payload.user_id as string)
              : undefined;

          const name =
            typeof payload.display_name === "string"
              ? (payload.display_name as string)
              : typeof payload.name === "string"
                ? (payload.name as string)
                : undefined;

          const isSelf = !payloadHasPeerId;

          handlers.onUserJoined(
            {
              peerId,
              userId,
              name,
              isSelf,
            },
            meta,
          );
          break;
        }

        case "leave":
        case "peer-left": {
          const payload = message.payload ?? {};
          const peerId =
            typeof payload.peer_id === "string"
              ? (payload.peer_id as string)
              : message.sender_id;
          if (peerId) {
            handlers.onUserLeave(peerId, meta);
          }
          break;
        }

        default:
          console.warn("Unknown signaling message type:", message.type);
      }
    },
    [],
  );

  const createOfferMessage = useCallback(
    (
      sdp: RTCSessionDescriptionInit,
      targetPeerId?: string,
    ): SignalingMessage => ({
      type: "offer",
      sdp,
      target_id: targetPeerId,
    }),
    [],
  );

  const createAnswerMessage = useCallback(
    (
      sdp: RTCSessionDescriptionInit,
      targetPeerId?: string,
    ): SignalingMessage => ({
      type: "answer",
      sdp,
      target_id: targetPeerId,
    }),
    [],
  );

  const createIceCandidateMessage = useCallback(
    (
      candidate: RTCIceCandidateInit,
      targetPeerId?: string,
    ): SignalingMessage => ({
      type: "ice-candidate",
      candidate,
      target_id: targetPeerId,
    }),
    [],
  );

  const createLeaveMessage = useCallback(
    (targetPeerId?: string): SignalingMessage => ({
      type: "leave",
      target_id: targetPeerId,
    }),
    [],
  );

  return {
    handleSignalingMessage,
    createOfferMessage,
    createAnswerMessage,
    createIceCandidateMessage,
    createLeaveMessage,
  };
}
