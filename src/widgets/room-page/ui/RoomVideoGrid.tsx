"use client";
import { Avatar } from "@/shared/ui";
import { Video, VideoOff, User, Wifi, WifiOff, Users } from "lucide-react";

interface RoomVideoGridProps {
  roomId: string;
  userName: string;
  isConnected: boolean;
  isCallActive?: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteUsers: [string, string][]; // [userId, userName][]
}

export function RoomVideoGrid({
  roomId,
  userName,
  isConnected,
  isCallActive,
  localVideoRef,
  isVideoEnabled,
  localStream,
  remoteStream,
  remoteUsers,
}: RoomVideoGridProps) {
  return (
    <div className="flex-1 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        {/* Локальное видео */}
        <div className="aspect-video rounded-lg overflow-hidden relative bg-gray-800 border-2 border-gray-700">
          {localStream && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                {localStream ? (
                  <VideoOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                ) : (
                  <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                )}
                <p className="text-lg mb-2">{userName || "Вы"}</p>
                <p className="text-sm text-gray-400">
                  {!localStream
                    ? "Подключение к медиа..."
                    : !isVideoEnabled
                      ? "Камера отключена"
                      : "Ожидание видео"}
                </p>
              </div>
            </div>
          )}

          {/* Статус подключения */}
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

          {/* Имя пользователя */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {userName || "Вы"}
              {localStream && !isVideoEnabled && " (Камера выкл.)"}
            </div>
          </div>
        </div>

        {/* Удаленное видео */}
        <div className="aspect-video rounded-lg overflow-hidden relative bg-gray-800 border-2 border-gray-700">
          {remoteStream ? (
            <video
              autoPlay
              className="w-full h-full object-cover"
              ref={(video) => {
                if (video) video.srcObject = remoteStream;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">
                  {remoteUsers.length > 0
                    ? `Участников: ${remoteUsers.length}`
                    : "Ожидание участников"}
                </p>
                <p className="text-sm text-gray-400 mb-3">
                  {remoteUsers.length > 0
                    ? "Подключение..."
                    : "Поделитесь ID комнаты"}
                </p>
                <p className="text-xs font-mono bg-gray-700 px-3 py-2 rounded">
                  {roomId}
                </p>
              </div>
            </div>
          )}

          {/* Информация об удаленном пользователе */}
          {remoteUsers.length > 0 && (
            <div className="absolute bottom-3 left-3">
              <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {remoteUsers.map(([id, name]) => name).join(", ")}
              </div>
            </div>
          )}

          {/* Статус звонка */}
          <div className="absolute top-3 right-3">
            <div
              className={`text-xs px-2 py-1 rounded ${
                isCallActive
                  ? "bg-success-500 text-white"
                  : "bg-gray-500 text-gray-200"
              }`}
            >
              {isCallActive ? "Звонок активен" : "Ожидание"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
