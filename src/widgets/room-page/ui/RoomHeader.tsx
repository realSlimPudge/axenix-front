"use client";
import { Button } from "@/shared/ui";
import { Copy, Users, Wifi, WifiOff } from "lucide-react";

interface RoomHeaderProps {
  roomId: string;
  roomName?: string;
  isConnected: boolean;
  userName: string;
  onLeave: () => void;
  isCallActive?: boolean;
}

export function RoomHeader({
  roomId,
  roomName,
  isConnected,
  userName,
  onLeave,
}: RoomHeaderProps) {
  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      alert("ID комнаты скопирован в буфер обмена!");
    } catch (err) {
      console.error("Ошибка при копировании: ", err);
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold">
          {roomName || "Комната видеоконференции"}
        </h1>
        <p className="text-gray-400 text-sm">ID комнаты: {roomId}</p>
        <div className="flex items-center gap-2 mt-1">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-success-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-error-500" />
          )}
          <span className="text-xs">
            {isConnected ? "Подключен" : "Отключен"}
          </span>
          {userName && (
            <span className="text-xs text-gray-400 ml-2">• {userName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          className="bg-white flex items-center gap-2"
          onClick={copyRoomLink}
        >
          <Copy className="w-4 h-4" />
          Скопировать ID
        </Button>
        <Button variant="danger" onClick={onLeave}>
          Покинуть комнату
        </Button>
      </div>
    </div>
  );
}
