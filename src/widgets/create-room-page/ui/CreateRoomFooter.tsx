"use client";
import { useLocalStorage } from "@/shared/lib/hooks/useLocalStorage";

export function CreateRoomFooter() {
  const [userName] = useLocalStorage("userName", "");

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="text-center text-sm text-gray-600">
        <p>
          После создания комнаты вы получите ссылку для приглашения участников
        </p>
        {userName && (
          <p className="mt-1 text-xs">
            Имя организатора: <span className="font-medium">{userName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
