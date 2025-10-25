"use client";
import { useState, useEffect } from "react";
import { Button, Input } from "@/shared/ui";
import { useCreateRoom } from "@/features/room-creation";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";
import { generateUUID } from "@/shared/lib/utils/generateUUID";
import { User, Clock, Users } from "lucide-react";

export function CreateRoomForm() {
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [time, setTime] = useState("");
  const [userName, setUserName] = useLocalStorage("userName", "");
  const { createRoom, isLoading, error } = useCreateRoom();

  useEffect(() => {
    setOwnerId(generateUUID());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !time.trim() || !userName.trim()) {
      return;
    }

    if (isNaN(Number(time)) || Number(time) <= 0) {
      return;
    }

    try {
      await createRoom({
        name,
        ownerId,
        time: parseInt(time),
      });
    } catch (err) {
      // Ошибка уже обработана в хуке
    }
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Поле имени пользователя */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-1" />
          Ваше имя *
        </label>
        <Input
          value={userName}
          onChange={handleUserNameChange}
          placeholder="Введите ваше имя"
          disabled={isLoading}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Имя будет сохранено для будущих встреч
        </p>
      </div>

      {/* Поле названия комнаты */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Название комнаты *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите название комнаты"
          disabled={isLoading}
          required
        />
      </div>

      {/* Поле времени */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="w-4 h-4 inline mr-1" />
          Длительность (в минутах) *
        </label>
        <Input
          type="number"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Введите длительность встречи"
          min="1"
          max="480"
          disabled={isLoading}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Максимальная длительность: 8 часов (480 минут)
        </p>
      </div>

      {/* Отображение ошибок */}
      {error && (
        <div className="p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-error-700 text-sm">{error}</p>
        </div>
      )}

      {/* Кнопка создания */}
      <Button
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={!name.trim() || !time.trim() || !userName.trim()}
        className="w-full"
      >
        {isLoading ? "Создание..." : "Создать комнату"}
      </Button>
    </form>
  );
}
