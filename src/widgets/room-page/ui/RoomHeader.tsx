"use client";
import { Button } from "@/shared/ui";
import {
  Calendar,
  Clock,
  Copy,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

interface RoomHeaderProps {
  roomId: string;
  roomName?: string;
  isConnected: boolean;
  userName: string;
  roomDetails?: {
    createdAt?: string;
    expiresAt?: string;
    peersCount?: number;
  };
}

export function RoomHeader({
  roomId,
  roomName,
  isConnected,
  userName,
  roomDetails,
}: RoomHeaderProps) {
  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      alert("ID комнаты скопирован в буфер обмена!");
    } catch (err) {
      console.error("Ошибка при копировании: ", err);
    }
  };

  const formattedCreatedAt = roomDetails?.createdAt
    ? new Date(roomDetails.createdAt).toLocaleString()
    : null;
  const formattedExpiresAt = roomDetails?.expiresAt
    ? new Date(roomDetails.expiresAt).toLocaleString()
    : null;

  return (
    <div className="flex w-full flex-col gap-6 rounded-2xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            {roomName || "Комната видеоконференции"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">
              <Users className="h-4 w-4" />
              {userName || "Вы"}
            </span>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-success-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-error-500" />
              )}
              <span className="font-medium text-gray-700">
                {isConnected ? "Подключен" : "Отключен"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-inner">
          <span className="font-medium text-gray-900">
            ID комнаты: {roomId}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 py-1 text-primary-600 hover:text-primary-700"
            onClick={copyRoomLink}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Скопировать ID комнаты</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
          <Calendar className="h-4 w-4 text-primary-500" />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Создана
            </p>
            <p className="font-medium text-gray-800">
              {formattedCreatedAt || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
          <Clock className="h-4 w-4 text-primary-500" />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Истекает
            </p>
            <p className="font-medium text-gray-800">
              {formattedExpiresAt || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
          <Users className="h-4 w-4 text-primary-500" />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Участников
            </p>
            <p className="font-medium text-gray-800">
              {roomDetails?.peersCount ?? 0}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
          <Wifi className="h-4 w-4 text-primary-500" />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Статус
            </p>
            <p
              className={
                isConnected ? "font-medium text-success-600" : "font-medium text-error-600"
              }
            >
              {isConnected ? "В сети" : "Нет связи"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
