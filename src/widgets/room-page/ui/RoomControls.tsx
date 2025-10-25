import { Button } from "@/shared/ui";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from "lucide-react";

interface RoomControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onAudioToggle: () => void;
  onVideoToggle: () => void;
  onScreenShareToggle: () => void;
  onLeave: () => void;
}

export function RoomControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onAudioToggle,
  onVideoToggle,
  onScreenShareToggle,
  onLeave,
}: RoomControlsProps) {
  return (
    <div className="bg-gray-800 p-4 flex justify-center gap-4">
      <Button
        variant={isAudioEnabled ? "outline" : "secondary"}
        onClick={onAudioToggle}
        className="bg-white flex items-center gap-2"
      >
        {isAudioEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5 text-error-600" />
        )}
        {isAudioEnabled ? "Выкл. звук" : "Вкл. звук"}
      </Button>

      <Button
        variant={isVideoEnabled ? "outline" : "secondary"}
        onClick={onVideoToggle}
        className="bg-white flex items-center gap-2"
      >
        {isVideoEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5 text-error-600" />
        )}
        {isVideoEnabled ? "Выкл. видео" : "Вкл. видео"}
      </Button>

      <Button
        variant={isScreenSharing ? "primary" : "outline"}
        onClick={onScreenShareToggle}
        className="bg-white flex items-center gap-2"
      >
        <Monitor className="w-5 h-5" />
        {isScreenSharing ? "Стоп демонстрация" : "Демонстрация"}
      </Button>

      <Button
        variant="danger"
        onClick={onLeave}
        className="flex items-center gap-2"
      >
        <PhoneOff className="w-5 h-5" />
        Завершить звонок
      </Button>
    </div>
  );
}
