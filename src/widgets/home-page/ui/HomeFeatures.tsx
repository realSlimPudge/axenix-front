import { Video, Mic, Shield } from "lucide-react";

export function HomeFeatures() {
  return (
    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-6 h-6 text-primary-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">HD Видео</h3>
        <p className="text-sm text-gray-600">
          Кристально чистое качество видео
        </p>
      </div>

      <div className="text-center">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mic className="w-6 h-6 text-primary-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Чистый Звук</h3>
        <p className="text-sm text-gray-600">Подавление шума и эхо</p>
      </div>

      <div className="text-center">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-primary-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Безопасность</h3>
        <p className="text-sm text-gray-600">Шифрование end-to-end</p>
      </div>
    </div>
  );
}
