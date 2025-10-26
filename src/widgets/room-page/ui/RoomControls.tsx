"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleIdle = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
        }, 3000);
    }, []);

    const markActive = useCallback(() => {
        setIsIdle(false);
        scheduleIdle();
    }, [scheduleIdle]);

    useEffect(() => {
        const activityEvents = [
            "mousemove",
            "keydown",
            "wheel",
            "touchstart",
            "pointermove",
        ];

        activityEvents.forEach((event) =>
            window.addEventListener(event, markActive)
        );

        scheduleIdle();

        return () => {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            activityEvents.forEach((event) =>
                window.removeEventListener(event, markActive)
            );
        };
    }, [markActive, scheduleIdle]);

    return (
        <div
            className={`pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 transition-all duration-500 ease-out ${
                isIdle
                    ? "translate-y-24 opacity-0"
                    : "translate-y-0 opacity-100"
            }`}
        >
            <div
                className="pointer-events-auto flex items-center justify-center gap-4  
               p-3 bg-transparent"
            >
                <Button
                    variant="outline"
                    size="lg"
                    onClick={onAudioToggle}
                    className={`h-14 w-14 rounded-full px-0 transition-all duration-200 ${
                        isAudioEnabled
                            ? "border-primary-100 bg-white text-primary-600 hover:-translate-y-1"
                            : "border-error-100 bg-error-50 text-error-600 hover:-translate-y-1"
                    }`}
                    aria-label={
                        isAudioEnabled
                            ? "Выключить микрофон"
                            : "Включить микрофон"
                    }
                    title={
                        isAudioEnabled
                            ? "Выключить микрофон"
                            : "Включить микрофон"
                    }
                >
                    {isAudioEnabled ? (
                        <div>
                            <Mic className="h-6 w-6" />
                        </div>
                    ) : (
                        <div>
                            <MicOff className="h-6 w-6" />
                        </div>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    onClick={onVideoToggle}
                    className={`h-14 w-14 rounded-full px-0 transition-all duration-200 ${
                        isVideoEnabled
                            ? "border-primary-100 bg-white text-primary-600 hover:-translate-y-1"
                            : "border-error-100 bg-error-50 text-error-600 hover:-translate-y-1"
                    }`}
                    aria-label={
                        isVideoEnabled ? "Выключить видео" : "Включить видео"
                    }
                    title={
                        isVideoEnabled ? "Выключить видео" : "Включить видео"
                    }
                >
                    {isVideoEnabled ? (
                        <div>
                            <Video className="h-6 w-6" />
                        </div>
                    ) : (
                        <div>
                            <VideoOff className="h-6 w-6" />
                        </div>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    onClick={onScreenShareToggle}
                    className={`h-14 w-14 rounded-full px-0 transition-all duration-200 ${
                        isScreenSharing
                            ? "border-primary-200 bg-primary-50 text-primary-600 hover:-translate-y-1"
                            : "border-gray-200 bg-white text-gray-600 hover:-translate-y-1"
                    }`}
                    aria-label={
                        isScreenSharing
                            ? "Остановить демонстрацию экрана"
                            : "Начать демонстрацию экрана"
                    }
                    title={
                        isScreenSharing
                            ? "Остановить демонстрацию экрана"
                            : "Начать демонстрацию экрана"
                    }
                >
                    <div>
                        <Monitor className="h-6 w-6" />
                    </div>
                </Button>

                <Button
                    variant="danger"
                    size="lg"
                    onClick={onLeave}
                    className="h-14 w-14 rounded-full px-0 shadow-md transition-transform duration-200 hover:-translate-y-1"
                    aria-label="Покинуть комнату"
                    title="Покинуть комнату"
                >
                    <div>
                        <PhoneOff className="h-6 w-6" />
                    </div>
                </Button>
            </div>
        </div>
    );
}
