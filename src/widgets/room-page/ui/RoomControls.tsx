"use client";

import { Button } from "@/shared/ui";
import {
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

interface RoomControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  canUseAudio: boolean;
  canUseVideo: boolean;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioDeviceId: string | null;
  selectedVideoDeviceId: string | null;
  isEnumeratingDevices: boolean;
  onAudioToggle: () => void;
  onVideoToggle: () => void;
  onScreenShareToggle: () => void;
  onLeave: () => void;
  onAudioDeviceChange: (deviceId: string | null) => void;
  onVideoDeviceChange: (deviceId: string | null) => void;
}

function formatDeviceLabel(device: MediaDeviceInfo, index: number, fallback: string) {
  const label = device.label?.trim();
  return label && label.length > 0 ? label : `${fallback} ${index + 1}`;
}

export function RoomControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  canUseAudio,
  canUseVideo,
  audioDevices,
  videoDevices,
  selectedAudioDeviceId,
  selectedVideoDeviceId,
  isEnumeratingDevices,
  onAudioToggle,
  onVideoToggle,
  onScreenShareToggle,
  onLeave,
  onAudioDeviceChange,
  onVideoDeviceChange,
}: RoomControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 text-slate-700 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Микрофон
            <select
              className="w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:border-rose-200 disabled:bg-rose-50 disabled:text-rose-400"
              value={selectedAudioDeviceId ?? ""}
              onChange={(event) =>
                onAudioDeviceChange(event.target.value ? event.target.value : null)
              }
              disabled={!canUseAudio || isEnumeratingDevices}
            >
              {audioDevices.length === 0 ? (
                <option value="">Устройства не найдены</option>
              ) : (
                audioDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {formatDeviceLabel(device, index, "Микрофон")}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Камера
            <select
              className="w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:border-rose-200 disabled:bg-rose-50 disabled:text-rose-400"
              value={selectedVideoDeviceId ?? ""}
              onChange={(event) =>
                onVideoDeviceChange(event.target.value ? event.target.value : null)
              }
              disabled={!canUseVideo || isEnumeratingDevices}
            >
              {videoDevices.length === 0 ? (
                <option value="">Устройства не найдены</option>
              ) : (
                videoDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {formatDeviceLabel(device, index, "Камера")}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onAudioToggle}
            disabled={!canUseAudio}
            className={`flex h-11 min-w-[52px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-300 ${
              isAudioEnabled && canUseAudio
                ? "border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100"
                : "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
            }`}
            aria-label={isAudioEnabled ? "Выключить звук" : "Включить звук"}
          >
            {isAudioEnabled && canUseAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            <span className="hidden sm:inline">
              {isAudioEnabled && canUseAudio ? "Выкл. звук" : "Вкл. звук"}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onVideoToggle}
            disabled={!canUseVideo}
            className={`flex h-11 min-w-[52px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-300 ${
              isVideoEnabled && canUseVideo
                ? "border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100"
                : "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
            }`}
            aria-label={isVideoEnabled ? "Выключить видео" : "Включить видео"}
          >
            {isVideoEnabled && canUseVideo ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            <span className="hidden sm:inline">
              {isVideoEnabled && canUseVideo ? "Выкл. видео" : "Вкл. видео"}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onScreenShareToggle}
            className={`flex h-11 min-w-[52px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-300 ${
              isScreenSharing
                ? "border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            aria-label={
              isScreenSharing ? "Остановить демонстрацию экрана" : "Начать демонстрацию экрана"
            }
          >
            <Monitor className="h-5 w-5" />
            <span className="hidden sm:inline">
              {isScreenSharing ? "Стоп" : "Демонстрация"}
            </span>
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onLeave}
            className="flex h-11 min-w-[52px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline">Завершить</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
