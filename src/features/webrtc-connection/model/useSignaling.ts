"use client";
import { useCallback } from "react";

export interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "joined" | "leave";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  user_id?: string;
  name?: string;
}

export function useSignaling() {
  const handleSignalingMessage = useCallback(
    (
      message: SignalingMessage,
      handlers: {
        onOffer: (sdp: RTCSessionDescriptionInit) => void;
        onAnswer: (sdp: RTCSessionDescriptionInit) => void;
        onIceCandidate: (candidate: RTCIceCandidateInit) => void;
        onUserJoined: (userId: string, name: string) => void;
        onUserLeave: (userId: string) => void;
      },
    ) => {
      console.log("Processing signaling message:", message);

      switch (message.type) {
        case "offer":
          if (message.sdp) {
            handlers.onOffer(message.sdp);
          }
          break;

        case "answer":
          if (message.sdp) {
            handlers.onAnswer(message.sdp);
          }
          break;

        case "ice-candidate":
          if (message.candidate) {
            handlers.onIceCandidate(message.candidate);
          }
          break;

        case "joined":
          if (message.user_id && message.name) {
            handlers.onUserJoined(message.user_id, message.name);
          }
          break;

        case "leave":
          if (message.user_id) {
            handlers.onUserLeave(message.user_id);
          }
          break;

        default:
          console.warn("Unknown signaling message type:", message.type);
      }
    },
    [],
  );

  const createOfferMessage = useCallback(
    (sdp: RTCSessionDescriptionInit): SignalingMessage => ({
      type: "offer",
      sdp,
    }),
    [],
  );

  const createAnswerMessage = useCallback(
    (sdp: RTCSessionDescriptionInit): SignalingMessage => ({
      type: "answer",
      sdp,
    }),
    [],
  );

  const createIceCandidateMessage = useCallback(
    (candidate: RTCIceCandidateInit): SignalingMessage => ({
      type: "ice-candidate",
      candidate,
    }),
    [],
  );

  const createLeaveMessage = useCallback(
    (): SignalingMessage => ({
      type: "leave",
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
