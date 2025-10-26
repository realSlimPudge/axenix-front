"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";
import { useRoomWebSocket } from "@/features/room-connection";
import { useRoomMedia } from "@/features/room-connection";
import {
  useWebRTC,
  type SignalingMessage,
} from "@/features/webrtc-connection";
import { RoomHeader } from "./RoomHeader";
import { RoomVideoGrid } from "./RoomVideoGrid";
import { RoomControls } from "./RoomControls";
import { RoomChat, type RoomChatMessage } from "./RoomChat";
import { Card, Button } from "@/shared/ui";
import { MessageSquare } from "lucide-react";

interface RoomInfoData {
  ID: string;
  Name: string;
  Owner: string;
  Link: string;
  Peers: Record<string, unknown>;
  Tracks: Record<string, unknown>;
  CreatedAt: string;
  ExpiresAt: string;
}

interface ChatSocketMessage {
  type: "chat";
  payload?: {
    id?: string;
    sender?: string;
    message?: string;
    timestamp?: string;
  };
}

const DESIGN_ROOM_CREATED_AT = "2024-03-18T10:00:00.000Z";
const DESIGN_ROOM_EXPIRES_AT = "2024-03-18T14:00:00.000Z";
const DESIGN_CHAT_INITIAL_MESSAGES: RoomChatMessage[] = [
  {
    id: "m1",
    sender: "Александра",
    content: "Привет! Готова к презентации.",
    timestamp: "2024-03-18T09:57:00.000Z",
  },
  {
    id: "m2",
    sender: "Вы",
    content: "Да, я запускаю демонстрацию экрана.",
    timestamp: "2024-03-18T09:58:30.000Z",
    isLocal: true,
  },
];

export function RoomPage() {
  const isDesignMode =
    process.env.NEXT_PUBLIC_ROOM_DESIGN_MODE === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDesignMode) {
    return <RoomPageDesignStub />;
  }

  return <RoomPageContent />;
}

function RoomPageContent() {
  const params = useParams();
  const router = useRouter();
  
  // Безопасное получение roomId с проверкой на null
  const roomId = params?.id as string | undefined;

  const [userName] = useLocalStorage("userName", "");
  const [roomInfo, setRoomInfo] = useState<RoomInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const socketMessageHandlerRef =
    useRef<((message: SignalingMessage) => void) | null>(null);
  const chatMessageHandlerRef =
    useRef<((message: ChatSocketMessage) => void) | null>(null);
  const chatMessageIdsRef = useRef(new Set<string>());
  const socketOnMessage = useCallback((message: unknown) => {
    if (!message || typeof message !== "object") {
      return;
    }

    const typed = message as { type?: string };

    if (typed.type === "chat") {
      chatMessageHandlerRef.current?.(message as ChatSocketMessage);
      return;
    }

    socketMessageHandlerRef.current?.(message as SignalingMessage);
  }, []);

  // WebSocket соединение - conditionally вызываем хук
  const {
    isConnected,
    error: wsError,
    sendMessage,
    reconnect,
    disconnect,
  } = useRoomWebSocket({
    roomId: roomId || "", // передаем пустую строку если roomId undefined
    userName: userName || "Anonymous",
    onMessage: socketOnMessage,
  });

  // Медиа (камера/микрофон)
  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    localStream,
    localVideoRef,
    mediaError,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startMedia,
    stopMedia,
  } = useRoomMedia({
    onMediaError: (error) => {
      console.error("Media error:", error);
      setGlobalError(error);
    },
  });

  // WebRTC соединение
  const { remoteParticipants, handleWebSocketMessage, endCall } = useWebRTC({
    localStream,
    sendMessage,
    onRemoteStream: (stream) => {
      console.log("Remote stream updated:", stream);
    },
    onConnectionStateChange: (state) => {
      console.log("WebRTC connection state:", state);
    },
  });

  useEffect(() => {
    socketMessageHandlerRef.current = handleWebSocketMessage;
    return () => {
      if (socketMessageHandlerRef.current === handleWebSocketMessage) {
        socketMessageHandlerRef.current = null;
      }
    };
  }, [handleWebSocketMessage]);

  const appendChatMessage = useCallback((message: RoomChatMessage) => {
    setChatMessages((previous) => {
      if (chatMessageIdsRef.current.has(message.id)) {
        return previous;
      }
      const next = [...previous, message];
      chatMessageIdsRef.current.add(message.id);
      return next;
    });
  }, []);

  const handleIncomingChatMessage = useCallback(
    (message: ChatSocketMessage) => {
      if (!message.payload) {
        return;
      }

      const {
        id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        sender = "Участник",
        message: content,
        timestamp = new Date().toISOString(),
      } = message.payload;

      if (typeof content !== "string" || !content.trim()) {
        return;
      }

      appendChatMessage({
        id,
        sender,
        content,
        timestamp,
      });
    },
    [appendChatMessage],
  );

  useEffect(() => {
    chatMessageHandlerRef.current = handleIncomingChatMessage;
    return () => {
      if (chatMessageHandlerRef.current === handleIncomingChatMessage) {
        chatMessageHandlerRef.current = null;
      }
    };
  }, [handleIncomingChatMessage]);

  const teardownRef = useRef({ endCall, stopMedia, disconnect });
  useEffect(() => {
    teardownRef.current = { endCall, stopMedia, disconnect };
  }, [endCall, stopMedia, disconnect]);

  useEffect(() => {
    return () => {
      const { endCall: disposeCall, stopMedia: disposeMedia, disconnect: disposeSocket } =
        teardownRef.current;
      disposeCall();
      disposeMedia();
      disposeSocket();
    };
  }, []);

  // Загружаем информацию о комнате
  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        // TODO: Заменить на реальный эндпоинт
        setTimeout(() => {
          setRoomInfo({
            ID: roomId || "unknown",
            Name: "Комната видеоконференции",
            Owner: "unknown",
            Link: roomId || "unknown",
            Peers: {},
            Tracks: {},
            CreatedAt: new Date().toISOString(),
            ExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        console.error("Ошибка при загрузке комнаты:", err);
        setIsLoading(false);
      }
    };

    if (roomId) {
      fetchRoomInfo();
    } else {
      // Если roomId не найден, показываем ошибку
      setIsLoading(false);
      setGlobalError("Room ID not found");
    }
  }, [roomId]);

  // Запускаем медиа при успешном подключении WebSocket
  useEffect(() => {
    if (isConnected && !localStream) {
      console.log("WebSocket connected, starting media...");
      startMedia().catch((err) => {
        console.error("Failed to start media:", err);
      });
    }
  }, [isConnected, localStream, startMedia]);

  // Обрабатываем ошибки
  useEffect(() => {
    if (wsError) {
      setGlobalError(wsError);
    } else if (mediaError) {
      setGlobalError(mediaError);
    } else {
      setGlobalError(null);
    }
  }, [wsError, mediaError]);

  const sendLocalChatMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      const id =
        crypto.randomUUID?.() ??
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();

      const outgoing: ChatSocketMessage = {
        type: "chat",
        payload: {
          id,
          sender: userName || "Вы",
          message: trimmed,
          timestamp,
        },
      };

      // Optimistic update so user sees message instantly
      appendChatMessage({
        id,
        sender: userName || "Вы",
        content: trimmed,
        timestamp,
        isLocal: true,
      });

      const sent = sendMessage(outgoing);
      if (!sent) {
        console.warn("Chat message queued until WebSocket reconnects");
      }
    },
    [appendChatMessage, sendMessage, userName],
  );

  const leaveRoom = () => {
    console.log("Leaving room...");
    endCall(); // Завершаем WebRTC звонок
    stopMedia();
    disconnect();
    router.push("/");
  };

  const retryConnection = () => {
    setGlobalError(null);
    reconnect();
  };

  const participantsCount = useMemo(() => {
    const peersFromInfo = roomInfo ? Object.keys(roomInfo.Peers || {}).length : 0;
    const observedParticipants = remoteParticipants.length + 1; // включая локального пользователя
    return Math.max(peersFromInfo, observedParticipants);
  }, [remoteParticipants.length, roomInfo]);

  const headerDetails = useMemo(
    () => ({
      createdAt: roomInfo?.CreatedAt,
      expiresAt: roomInfo?.ExpiresAt,
      peersCount: participantsCount,
    }),
    [participantsCount, roomInfo]
  );

  // Если roomId не найден, показываем ошибку
  if (!roomId && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-3xl">
            <span className="text-error-500">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Room Not Found
          </h2>
          <p className="text-gray-500 mb-6">
            The room ID is missing or invalid.
          </p>
          <Button variant="primary" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500"></div>
          <p className="text-gray-700">Подключение к комнате...</p>
        </Card>
      </div>
    );
  }

  if (globalError && !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-3xl">
            <span className="text-error-500">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ошибка подключения
          </h2>
          <p className="text-gray-500 mb-6">{globalError}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/")}>
              На главную
            </Button>
            <Button variant="primary" onClick={retryConnection}>
              Повторить
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 pb-32">
        <RoomHeader
          roomId={roomId || "unknown"}
          roomName={roomInfo?.Name}
          isConnected={isConnected}
          userName={userName}
          roomDetails={headerDetails}
        />

        <RoomVideoGrid
          roomId={roomId || "unknown"}
          userName={userName}
          isConnected={isConnected}
          localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
          isVideoEnabled={isVideoEnabled}
          localStream={localStream}
          remoteParticipants={remoteParticipants}
        />
      </div>

      <RoomControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onAudioToggle={toggleAudio}
        onVideoToggle={toggleVideo}
        onScreenShareToggle={toggleScreenShare}
        onLeave={leaveRoom}
      />

      {!isChatOpen && (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="fixed bottom-28 right-6 z-40 flex items-center gap-2 shadow-xl"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline">Открыть чат</span>
        </Button>
      )}

      <div
        className={`pointer-events-none fixed inset-y-20 right-4 z-40 flex w-full max-w-md transition-transform duration-300 ease-out ${
          isChatOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
        }`}
      >
        <div className="pointer-events-auto flex h-full w-full">
          <RoomChat
            messages={chatMessages}
            onSend={sendLocalChatMessage}
            userName={userName}
            isConnected={isConnected}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </div>

      {isChatOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsChatOpen(false)}
          role="presentation"
        />
      )}

      {globalError && isConnected && (
        <div className="fixed top-6 right-6 max-w-sm">
          <div className="rounded-xl border-l-4 border-error-400 bg-white/90 p-3 text-sm text-error-600 shadow-lg backdrop-blur">
            <p>{globalError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomPageDesignStub() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const mockRoomId = "design-room-0001";
  const mockUser = "Вы";
  const [designChatMessages, setDesignChatMessages] = useState<RoomChatMessage[]>(
    () => [...DESIGN_CHAT_INITIAL_MESSAGES],
  );
  const [isChatOpen, setIsChatOpen] = useState(true);

  const roomInfo: RoomInfoData = {
    ID: mockRoomId,
    Name: "Liquid Glass Showcase",
    Owner: "designer",
    Link: mockRoomId,
    Peers: {},
    Tracks: {},
    CreatedAt: DESIGN_ROOM_CREATED_AT,
    ExpiresAt: DESIGN_ROOM_EXPIRES_AT,
  };

  const remoteParticipants = useMemo(() => {
    return [
      {
        peerId: "alpha",
        name: "Александра",
        stream: null,
        connectionState: "connecting" as const,
      },
      {
        peerId: "beta",
        name: "Илья",
        stream: null,
        connectionState: "connected" as const,
      },
      {
        peerId: "gamma",
        name: "Мария",
        stream: null,
        connectionState: "disconnected" as const,
      },
    ];
  }, []);

  const toggleAudio = () => setIsAudioEnabled((prev) => !prev);
  const toggleVideo = () => setIsVideoEnabled((prev) => !prev);
  const toggleScreenShare = () => setIsScreenSharing((prev) => !prev);

  const leaveRoom = () => {
    console.info("Design mode: leave room");
  };

  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setDesignChatMessages((prev) => [
      ...prev,
      {
        id: `design-${prev.length + 1}`,
        sender: mockUser,
        content: trimmed,
        timestamp: new Date().toISOString(),
        isLocal: true,
      },
    ]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[160px]" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-slate-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col gap-6">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
          <RoomHeader
            roomId={mockRoomId}
            roomName={roomInfo.Name}
            isConnected
            userName={mockUser}
            roomDetails={{
              createdAt: roomInfo.CreatedAt,
              expiresAt: roomInfo.ExpiresAt,
              peersCount: remoteParticipants.length + 1,
            }}
          />

          <div className="flex flex-1 flex-col gap-6 lg:flex-row">
            <div className="flex-1">
              <RoomVideoGrid
                roomId={mockRoomId}
                userName={mockUser}
                isConnected
                localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
                isVideoEnabled={isVideoEnabled}
                localStream={null}
                remoteParticipants={remoteParticipants}
              />
            </div>
          </div>
        </div>

        <RoomControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onAudioToggle={toggleAudio}
          onVideoToggle={toggleVideo}
          onScreenShareToggle={toggleScreenShare}
          onLeave={leaveRoom}
        />

        {!isChatOpen && (
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="fixed bottom-28 right-6 z-40 flex items-center gap-2 shadow-xl"
            onClick={() => setIsChatOpen(true)}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="hidden sm:inline">Открыть чат</span>
          </Button>
        )}

        <div
          className={`pointer-events-none fixed inset-y-20 right-4 z-40 flex w-full max-w-md transition-transform duration-300 ease-out ${
            isChatOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
          }`}
        >
          <div className="pointer-events-auto flex h-full w-full">
            <RoomChat
              messages={designChatMessages}
              onSend={sendChatMessage}
              userName={mockUser}
              isConnected
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </div>

        {isChatOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsChatOpen(false)}
            role="presentation"
          />
        )}
      </div>
    </div>
  );
}
