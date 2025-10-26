"use client";
import { useEffect, useMemo, useRef } from "react";
import { Avatar } from "@/shared/ui";
import { VideoOff, User, Wifi, WifiOff, Users } from "lucide-react";
import { type RemoteParticipant } from "@/features/webrtc-connection";

interface RoomVideoGridProps {
  roomId: string;
  userName: string;
  isConnected: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteParticipants: RemoteParticipant[];
}

function RemoteVideoTile({ participant }: { participant: RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (participant.stream) {
      element.srcObject = participant.stream;
      void element.play().catch(() => {
        /* noop */
      });
    } else {
      element.srcObject = null;
    }
  }, [participant.stream]);

  const isConnected = participant.connectionState === "connected";

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
          <VideoOff className="w-12 h-12 text-gray-400" />
          <p className="text-sm text-gray-300">Ожидание видео</p>
        </div>
      )}

      <div className="absolute top-3 left-3 flex items-center gap-2">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-success-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-error-500" />
        )}
        <span className="text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          {isConnected ? "Подключен" : participant.connectionState || "Нет связи"}
        </span>
      </div>

      <div className="absolute bottom-3 left-3">
        <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <Avatar alt={participant.name || participant.peerId} size="sm" />
          <span title={participant.name || participant.peerId} className="truncate max-w-[12rem]">
            {participant.name || participant.peerId}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RoomVideoGrid({
  roomId,
  userName,
  isConnected,
  localVideoRef,
  isVideoEnabled,
  localStream,
  remoteParticipants,
}: RoomVideoGridProps) {
  const gridColumns = useMemo(() => {
    const tilesCount = remoteParticipants.length + 1;
    if (tilesCount >= 4) {
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }
    if (tilesCount === 3) {
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }
    return "grid-cols-1 md:grid-cols-2";
  }, [remoteParticipants.length]);

  const sortedParticipants = useMemo(() => {
    return [...remoteParticipants].sort((a, b) => a.peerId.localeCompare(b.peerId));
  }, [remoteParticipants]);

  return (
    <div className="flex-1 p-4">
      <div className={`grid gap-4 h-full ${gridColumns}`}>
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700">
          {localStream && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
              {localStream ? (
                <VideoOff className="w-16 h-16 text-gray-400" />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
              <p className="text-lg">{userName || "Вы"}</p>
              <p className="text-sm text-gray-400">
                {!localStream
                  ? "Подключение к камере"
                  : !isVideoEnabled
                    ? "Камера отключена"
                    : "Ожидание видео"}
              </p>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-success-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-error-500" />
            )}
            <span className="text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              {isConnected ? "Подключен" : "Отключен"}
            </span>
          </div>

          <div className="absolute bottom-3 left-3">
            <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <Avatar alt={userName || "Вы"} size="sm" />
              <span title={userName || "Вы"} className="truncate max-w-[12rem]">
                {userName || "Вы"}
                {localStream && !isVideoEnabled && " (камера выкл.)"}
              </span>
            </div>
          </div>
        </div>

        {sortedParticipants.length === 0 ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700 flex flex-col items-center justify-center text-white gap-4">
            <Users className="w-16 h-16 text-gray-400" />
            <p className="text-lg">Ожидание участников</p>
            <div className="text-sm text-gray-400 text-center">
              Поделитесь ID комнаты, чтобы пригласить друзей.
            </div>
            <div className="text-xs font-mono bg-gray-700 px-3 py-2 rounded">
              {roomId}
            </div>
          </div>
        ) : (
          sortedParticipants.map((participant) => (
            <RemoteVideoTile
              key={participant.peerId}
              participant={participant}
            />
          ))
        )}
      </div>
    </div>
  );
}
