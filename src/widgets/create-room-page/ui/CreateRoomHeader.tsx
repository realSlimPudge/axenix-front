import Back from "@/shared/ui/Back";
import { Video } from "lucide-react";

export function CreateRoomHeader() {
    return (
        <div className="text-center mb-8">
            <div className="flex justify-start mb-4">
                <Back />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
                Создание комнаты
            </h1>
            <p className="text-gray-600 mt-2">
                Заполните данные для создания видеоконференции
            </p>
        </div>
    );
}
