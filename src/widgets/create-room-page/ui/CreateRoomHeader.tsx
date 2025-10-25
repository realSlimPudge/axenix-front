import { Video } from "lucide-react";

export function CreateRoomHeader() {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <Video className="w-8 h-8 text-primary-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Создание комнаты</h1>
      <p className="text-gray-600 mt-2">
        Заполните данные для создания видеоконференции
      </p>
    </div>
  );
}
