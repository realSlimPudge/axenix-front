"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Card, Button, Input } from "@/shared/ui";
import Back from "@/shared/ui/Back";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";
import { User, UsersRound } from "lucide-react";

export default function JoinRoomPage() {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useLocalStorage("userName", "");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoinRoom = () => {
    const trimmedRoomId = roomId.trim();
    const trimmedName = userName.trim();

    if (!trimmedName) {
      setError("Введите ваше имя");
      return;
    }

    if (!trimmedRoomId) {
      setError("Введите корректный ID комнаты");
      return;
    }

    setError(null);
    router.push(`/room/${trimmedRoomId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <Back />
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Присоединение к комнате
            </h1>
            <p className="text-sm text-gray-600">
              Введите ID комнаты и ваше имя, чтобы подключиться к звонку.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" /> Ваше имя
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Например, Анна"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UsersRound className="inline w-4 h-4 mr-1" /> ID комнаты
              </label>
              <Input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Например, room-24b8"
              />
            </div>

            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleJoinRoom}
              disabled={!roomId.trim() || !userName.trim()}
              className="w-full"
            >
              Присоединиться
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
