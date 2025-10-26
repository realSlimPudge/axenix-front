"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card } from "@/shared/ui";
import {
  VideoOff,
  User,
  Wifi,
  WifiOff,
  Users,
  MicOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { type RemoteParticipant } from "@/features/webrtc-connection";

interface RoomVideoGridProps {
  roomId: string;
  userName: string;
  isConnected: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  localStream: MediaStream | null;
  remoteParticipants: RemoteParticipant[];
}

interface RemoteVideoTileProps {
  participant: RemoteParticipant;
  isFocused?: boolean;
  onToggleFocus?: (peerId: string) => void;
}

function RemoteVideoTile({
  participant,
  isFocused = false,
  onToggleFocus,
}: RemoteVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(true);

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

  useEffect(() => {
    const stream = participant.stream;

    if (!stream) {
      setIsAudioMuted(true);
      return;
    }

    const audioTracks = stream.getAudioTracks();

    if (audioTracks.length === 0) {
      setIsAudioMuted(true);
      return;
    }

    const evaluateState = () => {
      const hasActiveTrack = audioTracks.some(
        (track) =>
          track.readyState === "live" &&
          track.muted !== true &&
          track.enabled !== false,
      );
      setIsAudioMuted(!hasActiveTrack);
    };

    evaluateState();

    const handleMute = () => setIsAudioMuted(true);
    const handleUnmute = () => {
      evaluateState();
    };

    audioTracks.forEach((track) => {
      track.addEventListener("mute", handleMute);
      track.addEventListener("unmute", handleUnmute);
      track.addEventListener("ended", handleMute);
    });

    return () => {
      audioTracks.forEach((track) => {
        track.removeEventListener("mute", handleMute);
        track.removeEventListener("unmute", handleUnmute);
        track.removeEventListener("ended", handleMute);
      });
    };
  }, [participant.stream]);

  const wrapperClasses = isFocused
    ? "relative flex h-full min-h-[360px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
    : "relative aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const toggleLabel = isFocused ? "Свернуть видео" : "На весь экран";

  return (
    <div className={wrapperClasses}>
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
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

      {onToggleFocus && (
        <button
          type="button"
          onClick={() => onToggleFocus(participant.peerId)}
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-gray-700 shadow-md transition hover:bg-white"
        >
          {isFocused ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          <span className="sr-only">{toggleLabel}</span>
        </button>
      )}

      <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-gray-800 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            title={participant.name || participant.peerId}
            className="block max-w-[12rem] truncate"
          >
            {participant.name || participant.peerId}
          </span>
          {isAudioMuted && (
            <MicOff
              className="h-4 w-4 text-error-500"
              aria-label="Микрофон выключен"
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface LocalVideoTileProps {
  userName: string;
  isConnected: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  localStream: MediaStream | null;
  isFocused?: boolean;
  onToggleFocus?: () => void;
}

function LocalVideoTile({
  userName,
  isConnected,
  localVideoRef,
  isVideoEnabled,
  isAudioEnabled,
  localStream,
  isFocused = false,
  onToggleFocus,
}: LocalVideoTileProps) {
  const containerClasses = isFocused
    ? "relative flex h-full min-h-[360px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
    : "relative aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const toggleLabel = isFocused ? "Свернуть видео" : "На весь экран";

  return (
    <div className={containerClasses}>
      {localStream && isVideoEnabled ? (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
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

      {onToggleFocus && (
        <button
          type="button"
          onClick={onToggleFocus}
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-gray-700 shadow-md transition hover:bg-white"
        >
          {isFocused ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          <span className="sr-only">{toggleLabel}</span>
        </button>
      )}

      <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-gray-800 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            title={userName || "Вы"}
            className="block max-w-[12rem] truncate"
          >
            {userName || "Вы"}
            {localStream && !isVideoEnabled && " (камера выкл.)"}
          </span>
          {localStream && !isAudioEnabled && (
            <MicOff
              className="h-4 w-4 text-error-500"
              aria-label="Ваш микрофон выключен"
            />
          )}
        </div>
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
  isAudioEnabled,
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
    return [...remoteParticipants].sort((a, b) =>
      a.peerId.localeCompare(b.peerId),
    );
  }, [remoteParticipants]);

  const [focusedPeerId, setFocusedPeerId] = useState<string | "local" | null>(null);

  const handleLocalFocusToggle = useCallback(() => {
    setFocusedPeerId((current) => (current === "local" ? null : "local"));
  }, []);

  const handleRemoteFocusToggle = useCallback((peerId: string) => {
    setFocusedPeerId((current) => (current === peerId ? null : peerId));
  }, []);

  useEffect(() => {
    if (focusedPeerId && focusedPeerId !== "local") {
      const exists = sortedParticipants.some(
        (participant) => participant.peerId === focusedPeerId,
      );
      if (!exists) {
        setFocusedPeerId(null);
      }
    }
  }, [focusedPeerId, sortedParticipants]);

  const isFullscreenMode = focusedPeerId !== null;

  const renderFocusedContent = () => {
    if (focusedPeerId === "local") {
      return (
        <LocalVideoTile
          userName={userName}
          isConnected={isConnected}
          localVideoRef={localVideoRef}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          localStream={localStream}
          isFocused
          onToggleFocus={handleLocalFocusToggle}
        />
      );
    }

    const participant = sortedParticipants.find(
      (item) => item.peerId === focusedPeerId,
    );

    if (!participant) {
      return (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
          Участник отключился.
        </div>
      );
    }

    return (
      <RemoteVideoTile
        participant={participant}
        isFocused
        onToggleFocus={handleRemoteFocusToggle}
      />
    );
  };

  return (
    <div className="flex-1">
      <Card variant="elevated" className="h-full bg-white/80 backdrop-blur">
        {isFullscreenMode ? (
          <div className="flex h-full w-full flex-col">
            {renderFocusedContent()}
          </div>
        ) : (
          <div className={`grid h-full gap-4 ${gridColumns}`}>
            <LocalVideoTile
              userName={userName}
              isConnected={isConnected}
              localVideoRef={localVideoRef}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              localStream={localStream}
              onToggleFocus={handleLocalFocusToggle}
            />

            {sortedParticipants.length === 0 ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-primary-200 bg-white text-center shadow-sm">
                <Users className="h-16 w-16 text-primary-300" />
                <p className="text-lg font-medium text-gray-800">
                  Ожидание участников
                </p>
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
                  onToggleFocus={handleRemoteFocusToggle}
                />
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
