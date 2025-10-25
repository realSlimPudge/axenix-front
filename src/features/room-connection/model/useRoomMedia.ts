"use client";
import { useState, useRef, useCallback } from "react";

interface UseRoomMediaProps {
  onMediaError?: (error: string) => void;
}

export function useRoomMedia({ onMediaError }: UseRoomMediaProps = {}) {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startMedia = useCallback(async () => {
    try {
      // Останавливаем предыдущий поток, если есть
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      setMediaError(null);

      // Пробуем получить доступ к медиа устройствам с базовыми настройками
      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: isVideoEnabled
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
          audio: isAudioEnabled
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
        })
        .catch(async (err) => {
          // Если не получилось с идеальными настройками, пробуем базовые
          console.warn("Failed with ideal constraints, trying basic...", err);
          return await navigator.mediaDevices.getUserMedia({
            video: isVideoEnabled,
            audio: isAudioEnabled,
          });
        });

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log("Media stream started successfully");
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      let errorMessage = "Не удалось получить доступ к камере/микрофону";

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage =
            "Доступ к камере/микрофону запрещён. Разрешите доступ в настройках браузера.";
        } else if (err.name === "NotFoundError") {
          errorMessage =
            "Камера не найдена. Убедитесь, что камера подключена и не используется другим приложением.";
        } else if (err.name === "NotReadableError") {
          errorMessage =
            "Камера уже используется другим приложением. Закройте другие приложения, использующие камеру.";
        } else {
          errorMessage = `Ошибка доступа к медиа устройствам: ${err.message}`;
        }
      }

      setMediaError(errorMessage);
      onMediaError?.(errorMessage);
      throw err;
    }
  }, [isAudioEnabled, isVideoEnabled, localStream, onMediaError]);

  const stopMedia = useCallback(() => {
    localStream?.getTracks().forEach((track) => {
      track.stop();
    });

    screenStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    setLocalStream(null);
    screenStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const newState = !isAudioEnabled;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newState;
      });
      setIsAudioEnabled(newState);
    }
  }, [localStream, isAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    const newState = !isVideoEnabled;

    if (localStream) {
      // Если есть активный поток, просто включаем/выключаем видео
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newState;
      });
      setIsVideoEnabled(newState);
    } else if (newState) {
      // Если потока нет и хотим включить видео - запускаем медиа
      try {
        await startMedia();
      } catch (err) {
        console.error("Failed to start media when toggling video:", err);
      }
    }

    setIsVideoEnabled(newState);
  }, [localStream, isVideoEnabled, startMedia]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        // Заменяем видео поток на экран
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Когда демонстрация экрана заканчивается
        screenStream.getTracks().forEach((track) => {
          track.onended = () => {
            setIsScreenSharing(false);
            if (localVideoRef.current && localStream) {
              localVideoRef.current.srcObject = localStream;
            }
            screenStreamRef.current = null;
          };
        });
      } else {
        // Останавливаем демонстрацию экрана
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        setIsScreenSharing(false);

        // Возвращаем обычный видео поток
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onMediaError?.(`Ошибка демонстрации экрана: ${errorMessage}`);
    }
  }, [isScreenSharing, localStream, onMediaError]);

  return {
    // Состояния
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    localStream,
    mediaError,

    // Рефы
    localVideoRef,

    // Методы
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}
