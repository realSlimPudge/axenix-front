import { Calendar, Clock, Users, Wifi } from "lucide-react";

interface RoomInfoData {
  ID: string;
  Name: string;
  Owner: string;
  Link: string;
  Peers: Record<string, any>;
  Tracks: Record<string, any>;
  CreatedAt: string;
  ExpiresAt: string;
  
}

interface RoomInfoProps {
  roomInfo: RoomInfoData;
  isConnected: boolean;
}

export function RoomInfo({ roomInfo, isConnected }: RoomInfoProps) {
  return (
    <div className="bg-gray-800 p-4 border-t border-gray-700">
      <div className="max-w-4xl mx-auto text-sm text-gray-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-gray-500">Создана:</span>
              <p>{new Date(roomInfo.CreatedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-gray-500">Истекает:</span>
              <p>{new Date(roomInfo.ExpiresAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-gray-500">Участников:</span>
              <p>{Object.keys(roomInfo.Peers).length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-gray-500">WebSocket:</span>
              <p
                className={isConnected ? "text-success-400" : "text-error-400"}
              >
                {isConnected ? "Подключен" : "Отключен"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
