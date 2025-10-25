"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "@/shared/config/api/api";

interface CreateRoomResponse {
  room: {
    id: string;
    Name: string;
    Owner: string;
    Link: string;
    Peers: Record<string, any>;
    Tracks: Record<string, any>;
    CreatedAt: string;
    ExpiresAt: string;
  };
}

export function useCreateRoom() {
  const url = API_CONFIG.baseURL;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async (data: {
    name: string;
    ownerId: string;
    time: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Отправляем данные:", {
        name: data.name.trim(),
        owner: data.ownerId,
        lifetime_minutes: data.time,
      });

      const response = await fetch(`${url}/api/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name.trim(),
          owner: data.ownerId,
          lifetime_minutes: data.time,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const responseData: CreateRoomResponse = await response.json();
      console.log("Ответ от сервера:", responseData);

      if (responseData.room && responseData.room.id) {
        console.log("Комната создана, ID комнаты:", responseData.room.id);
        router.push(`/room/${responseData.room.id}`);
      } else {
        throw new Error("Не удалось получить ID созданной комнаты");
      }
    } catch (err) {
      console.error("Ошибка при создании комнаты:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Неизвестная ошибка при создании комнаты",
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createRoom,
    isLoading,
    error,
  };
}
