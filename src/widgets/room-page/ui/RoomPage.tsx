"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";
import { useRoomWebSocket } from "@/features/room-connection";
import { useRoomMedia } from "@/features/room-connection";
import { useWebRTC } from "@/features/webrtc-connection";
import { RoomHeader } from "./RoomHeader";
import { RoomVideoGrid } from "./RoomVideoGrid";
import { RoomInfo } from "./RoomInfo";
import { RoomControls } from "./RoomControls";
import { Card, Button } from "@/shared/ui";

interface RoomInfoData {
  ID: string;
  Name: string;
  Owner: string;
  Link: string;
  Peers: Record<string, any>;
  Tracks: Record<string, any>;
  CreatedAt: string;
  ExpiresAt: string;
}

export function RoomPage() {
  const params = useParams();
  const router = useRouter();
  
  // Безопасное получение roomId с проверкой на null
  const roomId = params?.id as string | undefined;

  const [userName] = useLocalStorage("userName", "");
  const [roomInfo, setRoomInfo] = useState<RoomInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // WebSocket соединение - conditionally вызываем хук
  const {
    isConnected,
    error: wsError,
    sendMessage,
    reconnect,
  } = useRoomWebSocket({
    roomId: roomId || "", // передаем пустую строку если roomId undefined
    userName: userName || "Anonymous",
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
  const {
    isCallActive,
    connectionState,
    remoteStream,
    remoteUsers,
    handleWebSocketMessage,
    endCall,
  } = useWebRTC({
    localStream,
    sendMessage,
    onRemoteStream: (stream) => {
      console.log("Remote stream updated:", stream);
    },
    onConnectionStateChange: (state) => {
      console.log("WebRTC connection state:", state);
    },
  });

  // Обработка входящих WebSocket сообщений
  useEffect(() => {
    if (isConnected) {
      // Здесь мы будем обрабатывать сообщения от WebSocket
      // Нужно интегрировать с useRoomWebSocket чтобы передавать сообщения в handleWebSocketMessage
    }
  }, [isConnected, handleWebSocketMessage]);

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

  const leaveRoom = () => {
    console.log("Leaving room...");
    endCall(); // Завершаем WebRTC звонок
    stopMedia();
    router.push("/");
  };

  const retryConnection = () => {
    setGlobalError(null);
    reconnect();
  };

  // Если roomId не найден, показываем ошибку
  if (!roomId && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-error-600 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Room Not Found
          </h2>
          <p className="text-gray-300 mb-4">The room ID is missing or invalid.</p>
          <Button variant="primary" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-white">Подключение к комнате...</p>
        </Card>
      </div>
    );
  }

  if (globalError && !isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-error-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Ошибка подключения
          </h2>
          <p className="text-gray-300 mb-4">{globalError}</p>
          <div className="flex gap-3">
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
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* RoomHeader - убрали isCallActive */}
      <RoomHeader
        roomId={roomId || "unknown"}
        roomName={roomInfo?.Name}
        isConnected={isConnected}
        userName={userName}
        onLeave={leaveRoom}
      />

      {/* RoomVideoGrid - исправили тип localVideoRef */}
      <RoomVideoGrid
        roomId={roomId || "unknown"}
        userName={userName}
        isConnected={isConnected}
        localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
        isVideoEnabled={isVideoEnabled}
        localStream={localStream}
        remoteStream={remoteStream}
        remoteUsers={remoteUsers}
      />

      {roomInfo && (
        // RoomInfo - убрали isCallActive
        <RoomInfo
          roomInfo={roomInfo}
          isConnected={isConnected}
         
        />
      )}

      {/* RoomControls - убрали isCallActive */}
      <RoomControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onAudioToggle={toggleAudio}
        onVideoToggle={toggleVideo}
        onScreenShareToggle={toggleScreenShare}
        onLeave={leaveRoom}
      />

      {/* Глобальная ошибка (если есть) */}
      {globalError && isConnected && (
        <div className="fixed top-4 right-4 max-w-sm">
          <div className="bg-error-500 text-white p-3 rounded-lg shadow-lg">
            <p className="text-sm">{globalError}</p>
          </div>
        </div>
      )}
    </div>
  );
}