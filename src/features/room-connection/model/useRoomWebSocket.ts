"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { API_CONFIG } from "@/shared/config/api/api";

interface UseRoomWebSocketProps {
    roomId: string;
    userName: string;
    onMessage?: (message: unknown) => void;
}

export function useRoomWebSocket({
    roomId,
    userName,
    onMessage,
}: UseRoomWebSocketProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const connectRef = useRef<() => void>(() => {});
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );
    const shouldReconnectRef = useRef(false);
    const messageQueueRef = useRef<unknown[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const flushQueue = useCallback(() => {
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }

        while (messageQueueRef.current.length > 0) {
            const payload = messageQueueRef.current.shift();
            if (payload === undefined) continue;
            try {
                socket.send(JSON.stringify(payload));
            } catch (err) {
                console.error("Failed to send queued WebSocket message:", err);
            }
        }
    }, []);

    const cleanupSocket = useCallback(
        ({ resetQueue = false }: { resetQueue?: boolean } = {}) => {
            if (wsRef.current) {
                wsRef.current.onopen = null;
                wsRef.current.onclose = null;
                wsRef.current.onmessage = null;
                wsRef.current.onerror = null;
                wsRef.current.close();
                wsRef.current = null;
            }
            if (shouldReconnectRef.current) {
                setIsConnected(false);
            }
            if (resetQueue) {
                messageQueueRef.current = [];
            }
        },
        []
    );

    const connect = useCallback(() => {
        if (!roomId || !userName) {
            setError("Room ID or user name is missing");
            return;
        }

        if (
            wsRef.current &&
            (wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        try {
            const socket = new WebSocket(
                `${
                    API_CONFIG.wsURL
                }/api/rooms/${roomId}/ws?name=${encodeURIComponent(
                    userName
                )}`
            );

            wsRef.current = socket;
            setError(null);

            socket.onopen = () => {
                console.log("WebSocket connected");
                setIsConnected(true);
                flushQueue();
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage?.(data);
                } catch (err) {
                    console.error("Error parsing WebSocket message:", err);
                }
            };

            socket.onclose = () => {
                console.log("WebSocket disconnected");
                setIsConnected(false);

                if (shouldReconnectRef.current) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectRef.current?.();
                    }, 1500);
                }
            };

            socket.onerror = (event) => {
                console.error("WebSocket error:", event);
                setError("WebSocket connection failed.");
            };
        } catch (err) {
            console.error("Failed to establish WebSocket connection:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "WebSocket initialization failed"
            );
        }
    }, [roomId, userName, onMessage, flushQueue]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        shouldReconnectRef.current = true;
        connectRef.current?.();
        return () => {
            shouldReconnectRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            cleanupSocket({ resetQueue: true });
        };
    }, [connect, cleanupSocket]);

    const sendMessage = useCallback((message: unknown) => {
        const socket = wsRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify(message));
            } catch (err) {
                console.error("Failed to send WebSocket message:", err);
                return false;
            }
            return true;
        }

        messageQueueRef.current.push(message);

        if (!socket || socket.readyState === WebSocket.CLOSED) {
            connectRef.current?.();
        }

        console.warn("WebSocket is not open. Message queued.");
        return false;
    }, []);

    const reconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        shouldReconnectRef.current = true;
        setIsConnected(false);
        setError(null);
        cleanupSocket();
        connectRef.current?.();
    }, [cleanupSocket]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        shouldReconnectRef.current = false;
        cleanupSocket({ resetQueue: true });
        setIsConnected(false);
    }, [cleanupSocket]);

    return {
        isConnected,
        error,
        sendMessage,
        reconnect,
        disconnect,
    };
}
