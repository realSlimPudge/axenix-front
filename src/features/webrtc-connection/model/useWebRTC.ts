"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { usePeerConnection } from "./usePeerConnection";
import { useSignaling, type SignalingMessage } from "./useSignaling";

interface UseWebRTCProps {
  localStream: MediaStream | null;
  sendMessage: (message: any) => boolean;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onConnectionStateChange?: (state: string) => void;
}

export function useWebRTC({
  localStream,
  sendMessage,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Map<string, string>>(
    new Map(),
  ); // userId -> name

  const {
    pc,
    remoteStream,
    connectionState,
    createPeerConnection,
    addLocalTracks,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    closeConnection,
  } = usePeerConnection();

  const {
    handleSignalingMessage,
    createOfferMessage,
    createAnswerMessage,
    createIceCandidateMessage,
    createLeaveMessage,
  } = useSignaling();

  // ICE candidates queue для кандидатов полученных до установки remote description
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  // Инициализация PeerConnection при появлении локального потока
  useEffect(() => {
    if (localStream && !pc) {
      const newPc = createPeerConnection();
      addLocalTracks(localStream);
      console.log("PeerConnection initialized with local stream");
    }
  }, [localStream, pc, createPeerConnection, addLocalTracks]);

  // Отслеживаем изменения состояния соединения
  useEffect(() => {
    onConnectionStateChange?.(connectionState);
    setIsCallActive(connectionState === "connected");
  }, [connectionState, onConnectionStateChange]);

  // Отслеживаем удаленный поток
  useEffect(() => {
    onRemoteStream?.(remoteStream);
  }, [remoteStream, onRemoteStream]);

  // Обработка входящих ICE candidates
  const processIceCandidateQueue = useCallback(async () => {
    if (!pc) return;

    for (const candidate of iceCandidateQueue.current) {
      try {
        await addIceCandidate(candidate);
        console.log("Processed queued ICE candidate");
      } catch (error) {
        console.error("Error processing queued ICE candidate:", error);
      }
    }
    iceCandidateQueue.current = [];
  }, [pc, addIceCandidate]);

  // Инициация звонка (создание offer)
  const startCall = useCallback(async () => {
    if (!pc) {
      throw new Error("PeerConnection not initialized");
    }

    try {
      const offer = await createOffer();
      sendMessage(createOfferMessage(offer));
      console.log("Offer created and sent");
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }, [pc, createOffer, sendMessage, createOfferMessage]);

  // Обработка входящих signaling сообщений
  const handleWebSocketMessage = useCallback(
    (message: SignalingMessage) => {
      handleSignalingMessage(message, {
        onOffer: async (sdp) => {
          if (!pc) {
            console.warn("PeerConnection not ready for offer");
            return;
          }

          try {
            await setRemoteDescription(sdp);
            console.log("Remote description set from offer");

            // Обрабатываем накопленные ICE candidates
            await processIceCandidateQueue();

            // Создаем и отправляем answer
            const answer = await createAnswer();
            sendMessage(createAnswerMessage(answer));
            console.log("Answer created and sent");
          } catch (error) {
            console.error("Error handling offer:", error);
          }
        },

        onAnswer: async (sdp) => {
          if (!pc) {
            console.warn("PeerConnection not ready for answer");
            return;
          }

          try {
            await setRemoteDescription(sdp);
            console.log("Remote description set from answer");
            await processIceCandidateQueue();
          } catch (error) {
            console.error("Error handling answer:", error);
          }
        },

        onIceCandidate: async (candidate) => {
          if (!pc) {
            console.warn("PeerConnection not ready for ICE candidate");
            return;
          }

          try {
            // Если remote description еще не установлен, ставим в очередь
            if (!pc.remoteDescription) {
              iceCandidateQueue.current.push(candidate);
              console.log(
                "ICE candidate queued (waiting for remote description)",
              );
              return;
            }

            await addIceCandidate(candidate);
            console.log("ICE candidate added");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        },

        onUserJoined: (userId, name) => {
          setRemoteUsers((prev) => new Map(prev.set(userId, name)));
          console.log(`User joined: ${name} (${userId})`);

          // Если это первый пользователь, инициируем звонок
          if (remoteUsers.size === 0 && localStream) {
            setTimeout(() => {
              startCall().catch(console.error);
            }, 1000);
          }
        },

        onUserLeave: (userId) => {
          setRemoteUsers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
          console.log(`User left: ${userId}`);
        },
      });
    },
    [
      pc,
      localStream,
      remoteUsers.size,
      handleSignalingMessage,
      setRemoteDescription,
      createAnswer,
      addIceCandidate,
      processIceCandidateQueue,
      sendMessage,
      createAnswerMessage,
      startCall,
    ],
  );

  // Отправка ICE candidate через WebSocket
  const sendIceCandidate = useCallback(
    (candidate: RTCIceCandidate) => {
      sendMessage(createIceCandidateMessage(candidate.toJSON()));
    },
    [sendMessage, createIceCandidateMessage],
  );

  // Завершение звонка
  const endCall = useCallback(() => {
    sendMessage(createLeaveMessage());
    closeConnection();
    setRemoteUsers(new Map());
    setIsCallActive(false);
    iceCandidateQueue.current = [];
    console.log("Call ended");
  }, [sendMessage, createLeaveMessage, closeConnection]);

  // Настройка обработчика ICE candidates для отправки
  useEffect(() => {
    if (!pc) return;

    const originalOnIceCandidate = pc.onicecandidate;
    
    // Исправление: создаем функцию с правильным контекстом
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      // Вызываем оригинальный обработчик с правильным контекстом
      if (originalOnIceCandidate) {
        try {
          originalOnIceCandidate.call(pc, event);
        } catch (error) {
          console.warn("Error in original onicecandidate handler:", error);
        }
      }

      if (event.candidate) {
        sendIceCandidate(event.candidate);
      }
    };

    return () => {
      pc.onicecandidate = originalOnIceCandidate;
    };
  }, [pc, sendIceCandidate]);

  return {
    // Состояния
    isCallActive,
    connectionState,
    remoteStream,
    remoteUsers: Array.from(remoteUsers.entries()),

    // Методы
    startCall,
    endCall,
    handleWebSocketMessage,

    // PeerConnection для отладки
    peerConnection: pc,
  };
}