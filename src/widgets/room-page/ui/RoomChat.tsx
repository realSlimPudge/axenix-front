"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Input, Button } from "@/shared/ui";
import { X } from "lucide-react";

export interface RoomChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isLocal?: boolean;
}

interface RoomChatProps {
  messages: RoomChatMessage[];
  onSend: (message: string) => void;
  userName: string;
  isConnected: boolean;
  onClose?: () => void;
}

export function RoomChat({
  messages,
  onSend,
  userName,
  isConnected,
  onClose,
}: RoomChatProps) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const placeholder = useMemo(() => {
    if (!isConnected) {
      return "Чат недоступен — нет подключения";
    }
    return "Введите сообщение…";
  }, [isConnected]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || !isConnected) {
      return;
    }
    onSend(trimmed);
    setValue("");
  };

  return (
    <Card
      variant="elevated"
      className="flex h-full max-h-[calc(100vh-8rem)] min-h-[24rem] flex-col bg-white/90 backdrop-blur"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Чат комнаты</p>
          <p className="text-xs text-gray-500">
            Общайтесь с участниками конференции
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            {userName || "Вы"}
          </span>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0 text-gray-500 hover:text-gray-700"
              onClick={onClose}
              aria-label="Скрыть чат"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary-100 bg-white/70 text-center text-sm text-gray-500">
            <span>Сообщений пока нет</span>
            <span className="text-xs text-gray-400">
              Напишите первое сообщение, чтобы начать диалог
            </span>
          </div>
        ) : (
          messages.map((message) => {
            const timeLabel = new Date(message.timestamp).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            );

            const isOwn = message.isLocal;

            return (
              <div
                key={message.id}
                className={`flex w-fit min-w-[10rem] max-w-full flex-col gap-1 rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%] ${
                  isOwn
                    ? "ml-auto bg-primary-50 text-primary-900"
                    : "bg-white text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold">
                    {isOwn ? "Вы" : message.sender}
                  </span>
                  <span className="text-gray-400">{timeLabel}</span>
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed [word-break:break-word]">
                  {message.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-inner"
      >
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={!isConnected}
          className="flex-1 border-none bg-transparent focus:ring-0"
          aria-label="Сообщение в чат комнаты"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!isConnected || !value.trim()}
        >
          Отправить
        </Button>
      </form>
    </Card>
  );
}
