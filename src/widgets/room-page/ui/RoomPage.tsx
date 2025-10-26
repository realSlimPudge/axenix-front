"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";
import { useRoomWebSocket } from "@/features/room-connection";
import { useRoomMedia } from "@/features/room-connection";
import {
  useWebRTC,
  type SignalingMessage,
  type RemoteParticipant,
} from "@/features/webrtc-connection";
import { RoomHeader } from "./RoomHeader";
import { RoomVideoGrid } from "./RoomVideoGrid";
import { RoomControls } from "./RoomControls";
import { RoomChat, type RoomChatMessage } from "./RoomChat";
import { Card, Button } from "@/shared/ui";
import { MessageSquare } from "lucide-react";

interface RoomPeer {
  id: string;
  user_id?: string;
  display_name?: string;
  status?: string;
}

interface RoomInfoData {
  id: string;
  name: string;
  owner: string;
  link: string;
  peers: RoomPeer[];
  createdAt?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
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

  const {
    isConnected,
    error: wsError,
    sendMessage,
    reconnect,
    disconnect,
  } = useRoomWebSocket({
    roomId: roomId || "",
    userName: userName || "Anonymous",
    onMessage: socketOnMessage,
  });

  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    localStream,
    mediaError,
    audioInputs,
    videoInputs,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    hasAudioInput,
    hasVideoInput,
    isEnumeratingDevices,
    localVideoRef,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startMedia,
    stopMedia,
    selectAudioDevice,
    selectVideoDevice,
  } = useRoomMedia({
    onMediaError: (error) => {
      console.error("Media error:", error);
      setGlobalError(error);
    },
  });

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
      const {
        endCall: disposeCall,
        stopMedia: disposeMedia,
        disconnect: disposeSocket,
      } = teardownRef.current;
      disposeCall();
      disposeMedia();
      disposeSocket();
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      setGlobalError("Room ID not found");
      return;
    }

    const controller = new AbortController();
    const fetchRoomInfo = async () => {
      setIsLoading(true);

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_ROOMS_API_BASE_URL ??
          "https://138.124.14.255/api/rooms";
        const response = await fetch(`${baseUrl}/${roomId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch room: ${response.status}`);
        }

        const payload = await response.json();
        const room = payload?.room;

        if (!room || typeof room !== "object") {
          throw new Error("Room payload missing");
        }

        setRoomInfo({
          id: room.id ?? roomId,
          name: room.name ?? "Комната видеоконференции",
          owner: room.owner ?? "",
          link: room.link ?? roomId,
          peers: Array.isArray(room.peers) ? room.peers : [],
          createdAt: room.created_at ?? room.createdAt ?? null,
          expiresAt: room.expires_at ?? room.expiresAt ?? null,
          isExpired: room.is_expired ?? room.isExpired ?? false,
        });
        setGlobalError(null);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        console.error("Ошибка при загрузке комнаты:", error);
        setGlobalError("Не удалось загрузить данные комнаты");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomInfo();

    return () => {
      controller.abort();
    };
  }, [roomId]);

  useEffect(() => {
    if (isConnected && !localStream) {
      startMedia().catch((error) => {
        console.error("Failed to start media:", error);
      });
    }
  }, [isConnected, localStream, startMedia]);

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
    endCall();
    stopMedia();
    disconnect();
    router.push("/");
  };

  const retryConnection = () => {
    setGlobalError(null);
    reconnect();
  };

  const participantsCount = useMemo(() => {
    const observed = remoteParticipants.length + 1;
    const peersFromInfo = roomInfo ? roomInfo.peers.length + 1 : 0;
    return Math.max(observed, peersFromInfo);
  }, [remoteParticipants.length, roomInfo]);

  const headerDetails = useMemo(
    () => ({
      createdAt: roomInfo?.createdAt ?? undefined,
      expiresAt: roomInfo?.expiresAt ?? undefined,
      peersCount: participantsCount,
    }),
    [participantsCount, roomInfo],
  );

  if (!roomId && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md border border-error-100 bg-white/95 text-center text-slate-700">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-3xl">
              <span className="text-error-500">❌</span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Комната не найдена</h2>
            <p className="mb-6 text-sm text-slate-600">
              Идентификатор комнаты отсутствует или неверен.
            </p>
            <Button variant="primary" onClick={() => router.push("/")}>
              На главную
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md border border-primary-100 bg-white/95 text-center text-slate-700">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500"></div>
            <p className="text-sm">Подключение к комнате...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (globalError && !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md border border-error-100 bg-white/95 text-center text-slate-700">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-3xl">
              <span className="text-error-500">⚠️</span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">
              Ошибка подключения
            </h2>
            <p className="mb-6 text-sm text-slate-600">{globalError}</p>
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
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="flex min-h-screen flex-col">
        <RoomHeader
          roomId={roomId || "unknown"}
          roomName={roomInfo?.name}
          isConnected={isConnected}
          userName={userName}
          roomDetails={headerDetails}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-[220px] pt-6">
          <RoomVideoGrid
            roomId={roomId || "unknown"}
            userName={userName}
            isConnected={isConnected}
            localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            localStream={localStream}
            remoteParticipants={remoteParticipants}
          />
        </div>
      </div>

      <RoomControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        canUseAudio={hasAudioInput}
        canUseVideo={hasVideoInput}
        audioDevices={audioInputs}
        videoDevices={videoInputs}
        selectedAudioDeviceId={selectedAudioDeviceId}
        selectedVideoDeviceId={selectedVideoDeviceId}
        isEnumeratingDevices={isEnumeratingDevices}
        onAudioToggle={toggleAudio}
        onVideoToggle={toggleVideo}
        onScreenShareToggle={toggleScreenShare}
        onLeave={leaveRoom}
        onAudioDeviceChange={selectAudioDevice}
        onVideoDeviceChange={selectVideoDevice}
      />

      {!isChatOpen && (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="fixed bottom-32 right-6 z-40 flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm text-white shadow-lg hover:bg-primary-500"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline">Открыть чат</span>
        </Button>
      )}

      <div
        className={`pointer-events-none fixed inset-y-24 right-4 z-40 flex w-full max-w-md transition-transform duration-300 ease-out ${
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
          <div className="rounded-xl border border-error-200 bg-white/95 px-4 py-3 text-sm text-error-600 shadow-lg">
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
  const [isChatOpen, setIsChatOpen] = useState(true);

  const mockRoomId = "design-room-0001";
  const mockUser = "Вы";

  const roomInfo: RoomInfoData = {
    id: mockRoomId,
    name: "Liquid Glass Showcase",
    owner: "designer",
    link: mockRoomId,
    peers: [],
    createdAt: DESIGN_ROOM_CREATED_AT,
    expiresAt: DESIGN_ROOM_EXPIRES_AT,
    isExpired: false,
  };

  const remoteParticipants = useMemo<RemoteParticipant[]>(
    () => [
      {
        peerId: "alpha",
        name: "Александра",
        stream: null,
        connectionState: "connecting",
      },
      {
        peerId: "beta",
        name: "Илья",
        stream: null,
        connectionState: "connected",
      },
      {
        peerId: "gamma",
        name: "Мария",
        stream: null,
        connectionState: "disconnected",
      },
    ],
    [],
  );

  const mockAudioDevices: MediaDeviceInfo[] = [
    {
      deviceId: "mic-default",
      kind: "audioinput",
      label: "Встроенный микрофон",
      groupId: "design",
      toJSON() {
        return {
          deviceId: "mic-default",
          kind: "audioinput",
          label: "Встроенный микрофон",
          groupId: "design",
        };
      },
    } as MediaDeviceInfo,
  ];

  const mockVideoDevices: MediaDeviceInfo[] = [
    {
      deviceId: "cam-default",
      kind: "videoinput",
      label: "Встроенная камера",
      groupId: "design",
      toJSON() {
        return {
          deviceId: "cam-default",
          kind: "videoinput",
          label: "Встроенная камера",
          groupId: "design",
        };
      },
    } as MediaDeviceInfo,
  ];

  const [designChatMessages, setDesignChatMessages] = useState<RoomChatMessage[]>(
    () => [...DESIGN_CHAT_INITIAL_MESSAGES],
  );
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(
    mockAudioDevices[0]?.deviceId ?? null,
  );
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(
    mockVideoDevices[0]?.deviceId ?? null,
  );

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
    <div className="relative min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="flex min-h-screen flex-col">
        <RoomHeader
          roomId={mockRoomId}
          roomName={roomInfo.name}
          isConnected
          userName={mockUser}
          roomDetails={{
            createdAt: roomInfo.createdAt ?? undefined,
            expiresAt: roomInfo.expiresAt ?? undefined,
            peersCount: remoteParticipants.length + 1,
          }}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-[220px] pt-6">
          <RoomVideoGrid
            roomId={mockRoomId}
            userName={mockUser}
            isConnected
            localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            localStream={null}
            remoteParticipants={remoteParticipants}
          />
        </div>
      </div>

      <RoomControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        canUseAudio={mockAudioDevices.length > 0}
        canUseVideo={mockVideoDevices.length > 0}
        audioDevices={mockAudioDevices}
        videoDevices={mockVideoDevices}
        selectedAudioDeviceId={selectedAudioDeviceId}
        selectedVideoDeviceId={selectedVideoDeviceId}
        isEnumeratingDevices={false}
        onAudioToggle={toggleAudio}
        onVideoToggle={toggleVideo}
        onScreenShareToggle={toggleScreenShare}
        onLeave={leaveRoom}
        onAudioDeviceChange={setSelectedAudioDeviceId}
        onVideoDeviceChange={setSelectedVideoDeviceId}
      />

      {!isChatOpen && (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="fixed bottom-32 right-6 z-40 flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm text-white shadow-lg hover:bg-primary-500"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline">Открыть чат</span>
        </Button>
      )}

      <div
        className={`pointer-events-none fixed inset-y-24 right-4 z-40 flex w-full max-w-md transition-transform duration-300 ease-out ${
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
  );
}
