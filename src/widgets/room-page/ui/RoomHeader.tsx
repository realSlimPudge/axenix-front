"use client";
import { Button } from "@/shared/ui";
import { Clock, Copy, Users, Wifi, WifiOff } from "lucide-react";

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
        } catch (err) {
            console.error("Ошибка при копировании: ", err);
        }
    };

    const formattedExpiresAt = roomDetails?.expiresAt
        ? new Date(roomDetails.expiresAt).toLocaleString()
        : null;
    const participantsCount = roomDetails?.peersCount ?? 0;

    return (
        <header className="w-full border-b border-white/60 bg-white/80 backdrop-blur">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 md:py-5">
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 flex-col gap-2">
                        <h1 className="truncate text-xl font-semibold text-gray-900 md:text-2xl">
                            {roomName || "Комната видеоконференции"}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-primary-700">
                                <Users className="h-4 w-4" />
                                {userName || "Вы"}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                    Истекает: {formattedExpiresAt ?? "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-gray-600 md:items-center">
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <Wifi className="h-4 w-4 text-success-500" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-error-500" />
                            )}
                            <span className="font-medium text-gray-800">
                                {isConnected ? "Подключен" : "Отключен"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Users className="h-3.5 w-3.5" />
                            <span>Участников: {participantsCount}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-start md:justify-end">
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white/90 px-4 py-2 text-sm text-gray-700 shadow-sm">
                            <span className="truncate font-medium text-gray-900">
                                ID: {roomId}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 py-1 text-primary-600 hover:text-primary-700"
                                onClick={copyRoomLink}
                            >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">
                                    Скопировать ID комнаты
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
