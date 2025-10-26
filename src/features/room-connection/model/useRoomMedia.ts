"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface UseRoomMediaProps {
  onMediaError?: (error: string) => void;
}

interface StartMediaOptions {
  audioDeviceId?: string | null;
  videoDeviceId?: string | null;
}

interface UseRoomMediaResult {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  mediaError: string | null;
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  selectedAudioDeviceId: string | null;
  selectedVideoDeviceId: string | null;
  hasAudioInput: boolean;
  hasVideoInput: boolean;
  isEnumeratingDevices: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  startMedia: (options?: StartMediaOptions) => Promise<MediaStream | null>;
  stopMedia: () => void;
  toggleAudio: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  selectAudioDevice: (deviceId: string | null) => Promise<void>;
  selectVideoDevice: (deviceId: string | null) => Promise<void>;
  refreshDevices: () => Promise<void>;
}

const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function useRoomMedia({ onMediaError }: UseRoomMediaProps = {}): UseRoomMediaResult {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaErrorState] = useState<string | null>(null);

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
  const [isEnumeratingDevices, setIsEnumeratingDevices] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const previousCameraStreamRef = useRef<MediaStream | null>(null);
  const lastMediaErrorRef = useRef<string | null>(null);

  const hasAudioInput = audioInputs.length > 0;
  const hasVideoInput = videoInputs.length > 0;

  const emitMediaError = useCallback(
    (message: string | null) => {
      if (message === lastMediaErrorRef.current) {
        return;
      }

      lastMediaErrorRef.current = message ?? null;
      setMediaErrorState(message);
      if (message) {
        onMediaError?.(message);
      }
    },
    [onMediaError],
  );

  const attachLocalStreamToVideo = useCallback((stream: MediaStream | null) => {
    const element = localVideoRef.current;
    if (!element) {
      return;
    }
    if (stream) {
      element.srcObject = stream;
    } else {
      element.srcObject = null;
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    setIsEnumeratingDevices(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices.filter((device) => device.kind === "audioinput");
      const video = devices.filter((device) => device.kind === "videoinput");

      setAudioInputs(audio);
      setVideoInputs(video);

      setSelectedAudioDeviceId((current) => {
        if (current && audio.some((device) => device.deviceId === current)) {
          return current;
        }
        return audio[0]?.deviceId ?? null;
      });

      setSelectedVideoDeviceId((current) => {
        if (current && video.some((device) => device.deviceId === current)) {
          return current;
        }
        return video[0]?.deviceId ?? null;
      });

      if (!audio.length) {
        setIsAudioEnabled(false);
      }
      if (!video.length) {
        setIsVideoEnabled(false);
      }
    } catch (error) {
      console.error("Failed to enumerate media devices", error);
    } finally {
      setIsEnumeratingDevices(false);
    }
  }, []);

  const stopTracks = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const startMedia = useCallback(
    async (options: StartMediaOptions = {}) => {
      const targetAudioDeviceId = options.audioDeviceId ?? selectedAudioDeviceId;
      const targetVideoDeviceId = options.videoDeviceId ?? selectedVideoDeviceId;

      const requestAudio = isAudioEnabled && hasAudioInput;
      const requestVideo = isVideoEnabled && hasVideoInput;

      if (!requestAudio && !requestVideo) {
        if (isAudioEnabled && !hasAudioInput && isVideoEnabled && !hasVideoInput) {
          emitMediaError("Не найдено ни одного микрофона и камеры");
        } else if (isAudioEnabled && !hasAudioInput) {
          emitMediaError("Микрофоны не найдены");
        } else if (isVideoEnabled && !hasVideoInput) {
          emitMediaError("Видеокамеры не найдены");
        }
        stopTracks(localStream);
        setLocalStream(null);
        attachLocalStreamToVideo(null);
        return null;
      }

      try {
        stopTracks(localStream);

        const constraints: MediaStreamConstraints = {
          audio: requestAudio
            ? {
                ...DEFAULT_AUDIO_CONSTRAINTS,
                deviceId: targetAudioDeviceId ? { exact: targetAudioDeviceId } : undefined,
              }
            : false,
          video: requestVideo
            ? {
                ...DEFAULT_VIDEO_CONSTRAINTS,
                deviceId: targetVideoDeviceId ? { exact: targetVideoDeviceId } : undefined,
              }
            : false,
        };

        const stream = await navigator.mediaDevices
          .getUserMedia(constraints)
          .catch(async (error) => {
            console.warn("Falling back to basic constraints", error);
            const fallbackConstraints: MediaStreamConstraints = {
              audio: requestAudio ? true : false,
              video: requestVideo ? true : false,
            };
            return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          });

        setLocalStream(stream);
        attachLocalStreamToVideo(stream);
        emitMediaError(null);

        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        setIsAudioEnabled(requestAudio && audioTracks.length > 0);
        setIsVideoEnabled(requestVideo && videoTracks.length > 0);

        if (audioTracks.length > 0) {
          const deviceId = audioTracks[0].getSettings().deviceId;
          if (deviceId) {
            setSelectedAudioDeviceId(deviceId);
          }
        }

        if (videoTracks.length > 0) {
          const deviceId = videoTracks[0].getSettings().deviceId;
          if (deviceId) {
            setSelectedVideoDeviceId(deviceId);
          }
        }

        void refreshDevices();
        return stream;
      } catch (error) {
        console.error("Error accessing media devices:", error);

        let message = "Не удалось получить доступ к камере/микрофону";
        if (error instanceof Error) {
          switch (error.name) {
            case "NotAllowedError":
              message =
                "Доступ к камере или микрофону запрещён. Разрешите доступ в настройках браузера.";
              break;
            case "NotFoundError":
              message = "Устройства не найдены. Проверьте подключения.";
              break;
            case "NotReadableError":
              message =
                "Устройство занято другим приложением. Закройте другие приложения, использующие камеру или микрофон.";
              break;
            default:
              message = `Ошибка доступа к медиа устройствам: ${error.message}`;
          }
        }

        emitMediaError(message);
        stopTracks(localStream);
        setLocalStream(null);
        attachLocalStreamToVideo(null);
        throw error;
      }
    },
    [attachLocalStreamToVideo, emitMediaError, hasAudioInput, hasVideoInput, isAudioEnabled, isVideoEnabled, localStream, refreshDevices, selectedAudioDeviceId, selectedVideoDeviceId],
  );

  const stopMedia = useCallback(() => {
    stopTracks(localStream);
    stopTracks(screenStreamRef.current);

    setLocalStream(null);
    screenStreamRef.current = null;
    previousCameraStreamRef.current = null;
    setIsScreenSharing(false);
    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    attachLocalStreamToVideo(null);
  }, [attachLocalStreamToVideo, localStream]);

  const toggleAudio = useCallback(() => {
    if (!hasAudioInput) {
      emitMediaError("Микрофоны не найдены");
      setIsAudioEnabled(false);
      return;
    }

    if (localStream) {
      const newState = !isAudioEnabled;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newState;
      });
      setIsAudioEnabled(newState);
      if (newState) {
        emitMediaError(null);
      }
      return;
    }

    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    if (newState) {
      void startMedia();
    }
  }, [emitMediaError, hasAudioInput, isAudioEnabled, localStream, startMedia]);

  useEffect(() => {
    attachLocalStreamToVideo(localStream);
  }, [attachLocalStreamToVideo, localStream]);

  const toggleVideo = useCallback(async () => {
    if (!hasVideoInput) {
      emitMediaError("Видеокамеры не найдены");
      setIsVideoEnabled(false);
      return;
    }

    const newState = !isVideoEnabled;

    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newState;
      });
      setIsVideoEnabled(newState);
      if (newState) {
        emitMediaError(null);
      }
      return;
    }

    setIsVideoEnabled(newState);
    if (newState) {
      try {
        await startMedia();
      } catch (error) {
        console.error("Failed to start media when toggling video", error);
      }
    }
  }, [emitMediaError, hasVideoInput, isVideoEnabled, localStream, startMedia]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = screenStream;
        previousCameraStreamRef.current = localStream;
        setIsScreenSharing(true);
        setIsVideoEnabled(true);
        setLocalStream(screenStream);
        attachLocalStreamToVideo(screenStream);

        screenStream.getTracks().forEach((track) => {
          track.onended = () => {
            stopTracks(screenStreamRef.current ?? null);
            screenStreamRef.current = null;
            setIsScreenSharing(false);

            const previous = previousCameraStreamRef.current;
            previousCameraStreamRef.current = null;

            if (previous) {
              setLocalStream(previous);
              setIsVideoEnabled(Boolean(previous.getVideoTracks().length));
              setIsAudioEnabled(Boolean(previous.getAudioTracks().length));
              attachLocalStreamToVideo(previous);
            } else {
              setLocalStream(null);
              setIsVideoEnabled(false);
              setIsAudioEnabled(false);
              attachLocalStreamToVideo(null);
            }
          };
        });
      } else {
        stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsScreenSharing(false);

        const previous = previousCameraStreamRef.current;
        previousCameraStreamRef.current = null;

        if (previous) {
          setLocalStream(previous);
          setIsVideoEnabled(Boolean(previous.getVideoTracks().length));
          setIsAudioEnabled(Boolean(previous.getAudioTracks().length));
          attachLocalStreamToVideo(previous);
        } else {
          setLocalStream(null);
          setIsVideoEnabled(false);
          setIsAudioEnabled(false);
          attachLocalStreamToVideo(null);
        }
      }
    } catch (error) {
      console.error("Error sharing screen", error);
      const message =
        error instanceof Error
          ? `Ошибка демонстрации экрана: ${error.message}`
          : "Ошибка демонстрации экрана";
      emitMediaError(message);
    }
  }, [attachLocalStreamToVideo, emitMediaError, isScreenSharing, localStream]);

  const selectAudioDevice = useCallback(
    async (deviceId: string | null) => {
      setSelectedAudioDeviceId(deviceId);
      if (!isAudioEnabled || !hasAudioInput) {
        return;
      }
      try {
        await startMedia({ audioDeviceId: deviceId });
      } catch (error) {
        console.error("Failed to switch audio device", error);
      }
    },
    [hasAudioInput, isAudioEnabled, startMedia],
  );

  const selectVideoDevice = useCallback(
    async (deviceId: string | null) => {
      setSelectedVideoDeviceId(deviceId);
      if (!isVideoEnabled || !hasVideoInput) {
        return;
      }
      try {
        await startMedia({ videoDeviceId: deviceId });
      } catch (error) {
        console.error("Failed to switch video device", error);
      }
    },
    [hasVideoInput, isVideoEnabled, startMedia],
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return;
    }

    void refreshDevices();

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    if (navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      };
    }

    const originalHandler = navigator.mediaDevices.ondevicechange;
    navigator.mediaDevices.ondevicechange = handleDeviceChange;
    return () => {
      navigator.mediaDevices.ondevicechange = originalHandler;
    };
  }, [refreshDevices]);

  return {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    localStream,
    mediaError,
    audioInputs,
    videoInputs,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    hasAudioInput,
    hasVideoInput,
    isEnumeratingDevices,
    localVideoRef,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    selectAudioDevice,
    selectVideoDevice,
    refreshDevices,
  };
}
