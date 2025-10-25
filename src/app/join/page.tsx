'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/shared/ui";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";

export default function JoinRoomPage() {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useLocalStorage("userName", ""); // Используем хук для имени
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError("Введите корректный ID комнаты.");
      return;
    }

    if (!userName.trim()) {
      setError("Введите ваше имя.");
      return;
    }

    // Очистка ошибки и переход в комнату
    setError(null);
    router.push(`/room/${roomId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Присоединение к комнате
          </h1>
          <p className="text-gray-600 mb-4">
            Введите ID комнаты, чтобы присоединиться к видеоконференции.
          </p>
        </div>
        <div className="space-y-4">
          <Input
            placeholder="Ваше имя"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full"
          />
          <Input
            placeholder="ID комнаты"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full"
          />
          {error && <p className="text-error-500 text-sm">{error}</p>}
         
          <Button
        variant="primary"
        size="lg"
        onClick={handleJoinRoom}
        disabled={!userName.trim() || !userName.trim()}
        className="w-full"
      >
        Присоединиться
      </Button>
        </div>
      </Card>
    </div>
  );
}