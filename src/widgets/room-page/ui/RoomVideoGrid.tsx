"use client";
import { useEffect, useMemo, useRef } from "react";
import { Card } from "@/shared/ui";
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
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-50 to-white">
          <VideoOff className="h-12 w-12 text-gray-400" />
          <p className="text-sm text-gray-500">Ожидание видео</p>
        </div>
      )}

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-success-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-error-500" />
        )}
        <span>
          {isConnected ? "Подключен" : participant.connectionState || "Нет связи"}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-gray-800 shadow-sm backdrop-blur">
        <span title={participant.name || participant.peerId} className="block max-w-[12rem] truncate">
          {participant.name || participant.peerId}
        </span>
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
    <div className="flex-1">
      <Card
        variant="elevated"
        className="h-full bg-white/80 backdrop-blur"
      >
        <div className={`grid h-full gap-4 ${gridColumns}`}>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {localStream && isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-50 to-white text-gray-600">
                {localStream ? (
                  <VideoOff className="h-14 w-14 text-gray-400" />
                ) : (
                  <User className="h-14 w-14 text-gray-300" />
                )}
                <p className="text-lg">{userName || "Вы"}</p>
                <p className="text-sm text-gray-500">
                  {!localStream
                    ? "Подключение к камере"
                    : !isVideoEnabled
                      ? "Камера отключена"
                      : "Ожидание видео"}
                </p>
              </div>
            )}

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-success-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-error-500" />
              )}
              <span>{isConnected ? "Подключен" : "Отключен"}</span>
            </div>

            <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-gray-800 shadow-sm backdrop-blur">
              <span title={userName || "Вы"} className="block max-w-[12rem] truncate">
                {userName || "Вы"}
                {localStream && !isVideoEnabled && " (камера выкл.)"}
              </span>
            </div>
          </div>

          {sortedParticipants.length === 0 ? (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-primary-200 bg-white text-center shadow-sm">
              <Users className="h-16 w-16 text-primary-300" />
              <p className="text-lg font-medium text-gray-800">Ожидание участников</p>
              <div className="px-6 text-sm text-gray-500">
                Поделитесь ID комнаты, чтобы пригласить друзей.
              </div>
              <div className="rounded-full bg-primary-50 px-4 py-2 text-xs font-mono text-primary-600">
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
      </Card>
    </div>
  );
}
