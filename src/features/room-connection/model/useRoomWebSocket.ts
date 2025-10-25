"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { API_CONFIG } from "@/shared/config/api/api";

interface UseRoomWebSocketProps {
  roomId: string;
  userName: string;
}

export function useRoomWebSocket({ roomId, userName }: UseRoomWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Выносим disconnect в начало, чтобы connect мог его использовать
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User left");
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!roomId || !userName) {
      setError("Room ID or user name is missing");
      return;
    }

    // Если уже есть соединение, не создаём новое
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${API_CONFIG.wsURL}/api/rooms/${roomId}/ws?name=${encodeURIComponent(userName)}`;
    console.log("Connecting to WebSocket:", wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected to room:", roomId);
        setIsConnected(true);
        setError(null);
        // Очищаем таймер переподключения при успешном соединении
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message:", data);
          // Здесь будет обработка WebRTC signaling сообщений
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);

        // Автопереподключение только при неожиданном закрытии
        if (event.code !== 1000 && event.code !== 1001) {
          console.log("Attempting to reconnect in 3 seconds...");
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket connection error:", error);
        setError(
          `WebSocket connection failed. Check if server is running at ${API_CONFIG.wsURL}`,
        );
        setIsConnected(false);
      };
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [roomId, userName, disconnect]); // Добавляем disconnect в зависимости
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn("WebSocket is not open. Cannot send message.");
      return false;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
